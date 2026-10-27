// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { createServer, type Server } from "node:http";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Project } from "../shared/project.ts";
import { MAX_CLOUD_BYTES } from "../shared/cloud.ts";
import { databaseConfig, type Database } from "./database.ts";
import { createHandler, routeFor, type ApiRequest } from "./http.ts";
import { migrate } from "./migrations.ts";

function sample(name = "Modelo de teste"): Project {
  return {
    format: "elan-model",
    version: 1,
    name,
    activeId: "Diagram_1",
    diagrams: [
      {
        id: "Diagram_1",
        name: "Processo",
        xml: '<?xml version="1.0"?><definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1"><process id="Process_1"/></definitions>',
        sourceXml: '<definitions id="Original"/>',
        sourceFilename: "original.bpmn",
      },
    ],
    comments: [
      {
        id: "Comment_1",
        diagramId: "Diagram_1",
        elementId: "Process_1",
        author: "Teste",
        text: "Comentário preservado",
        created: new Date().toISOString(),
        resolved: false,
      },
    ],
    updated: new Date().toISOString(),
  };
}
describe("cloud API with real SQLite and HTTP", () => {
  let db: Database, server: Server, base: string;
  beforeEach(async () => {
    db = createClient({ url: "file::memory:" });
    await migrate(db);
    server = createServer(async (req: ApiRequest, res) => {
      if (typeof req.headers["x-test-vercel-id"] === "string") {
        req.query = { id: req.headers["x-test-vercel-id"] };
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        req.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      }
      void createHandler(
        routeFor(new URL(req.url!, "http://localhost").pathname),
        async () => db,
      )(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/api`;
  });
  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    db.close();
  });
  const json = (method: string, body: unknown) => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  async function create(project = sample()) {
    const response = await fetch(base + "/models", json("POST", { project }));
    expect(response.status).toBe(201);
    return response.json();
  }

  it("persists full projects, comments and original XML; lists metadata only", async () => {
    const project = sample("Recrutamento São Paulo");
    const model = await create(project);
    expect(model.revision).toBe(1);
    const loaded = await (await fetch(base + "/models/" + model.id)).json();
    expect(loaded.project).toEqual(project);
    const response = await fetch(base + "/models");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const list = await response.json();
    expect(list.models[0].name).toBe(project.name);
    expect(list.models[0]).not.toHaveProperty("project");
    expect(list.hasMore).toBe(false);
  });
  it("prevents lost updates from two tabs using a conditional SQL update", async () => {
    const model = await create();
    const results = await Promise.all(
      ["A", "B"].map((name) =>
        fetch(
          base + "/models/" + model.id,
          json("PUT", { project: sample(name), revision: 1 }),
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const current = await (await fetch(base + "/models/" + model.id)).json();
    expect(current.revision).toBe(2);
    expect(["A", "B"]).toContain(current.project.name);
  });
  it("accepts Vercel's pre-parsed JSON and dynamic route query parameters", async () => {
    const model = await create();
    const request = json("PUT", {
      project: sample("Updated via Vercel adapter"),
      revision: 1,
    });
    const response = await fetch(base + "/models/[id]", {
      ...request,
      headers: { ...request.headers, "x-test-vercel-id": model.id },
    });
    expect(response.status).toBe(200);
    const saved = await response.json();
    expect(saved.id).toBe(model.id);
    expect(saved.name).toBe("Updated via Vercel adapter");
    expect(saved.revision).toBe(2);
  });
  it("archives reversibly and rejects writes against archived models", async () => {
    const model = await create();
    const archived = await (
      await fetch(base + "/models/" + model.id, json("DELETE", { revision: 1 }))
    ).json();
    expect(archived.revision).toBe(2);
    expect(archived.archivedAt).toBeTruthy();
    expect((await (await fetch(base + "/models")).json()).models).toHaveLength(
      0,
    );
    expect(
      (await (await fetch(base + "/models?archived=true")).json()).models,
    ).toHaveLength(1);
    expect(
      (
        await fetch(
          base + "/models/" + model.id,
          json("PUT", { revision: 2, project: sample() }),
        )
      ).status,
    ).toBe(409);
    const restored = await fetch(
      base + "/models/" + model.id,
      json("PATCH", { revision: 2, archived: false }),
    );
    expect(restored.status).toBe(200);
    expect((await restored.json()).revision).toBe(3);
    expect((await (await fetch(base + "/models")).json()).models).toHaveLength(
      1,
    );
  });
  it("validates malformed projects, active IDs, duplicate IDs and XML entities", async () => {
    for (const project of [
      null,
      { ...sample(), activeId: "missing" },
      { ...sample(), diagrams: [sample().diagrams[0], sample().diagrams[0]] },
      {
        ...sample(),
        diagrams: [
          {
            ...sample().diagrams[0],
            xml: '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><definitions/>',
          },
        ],
      },
    ]) {
      const result = await fetch(base + "/models", json("POST", { project }));
      expect(result.status).toBe(400);
    }
    expect((await (await fetch(base + "/models")).json()).models).toHaveLength(
      0,
    );
  });
  it("rejects oversized payloads, malformed JSON and wrong content types", async () => {
    expect(
      (
        await fetch(
          base + "/models",
          json("POST", {
            project: { ...sample(), name: "á".repeat(MAX_CLOUD_BYTES) },
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await fetch(base + "/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{no",
        })
      ).status,
    ).toBe(400);
    expect(
      (await fetch(base + "/models", { method: "POST", body: "hello" })).status,
    ).toBe(415);
  });
  it("uses method/route validation and rejects cross-origin browser writes", async () => {
    expect((await fetch(base + "/health", { method: "POST" })).status).toBe(
      405,
    );
    expect((await fetch(base + "/missing")).status).toBe(404);
    expect((await fetch(base + "/models/not-an-id")).status).toBe(400);
    expect(
      (
        await fetch(base + "/models", {
          ...json("POST", { project: sample() }),
          headers: {
            "Content-Type": "application/json",
            Origin: "https://other.example",
          },
        })
      ).status,
    ).toBe(403);
  });
  it("exposes readiness without credentials or internal database errors", async () => {
    const status = await (await fetch(base + "/status")).json();
    expect(status).toMatchObject({
      ready: true,
      access: "public",
      maxProjectBytes: MAX_CLOUD_BYTES,
    });
    await db.execute("DROP TABLE elan_schema_migrations");
    const response = await fetch(base + "/models");
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("schema_not_ready");
  });
  it("uses bound parameters for names containing SQL syntax", async () => {
    const name = "'; DROP TABLE elan_models; --";
    await create(sample(name));
    expect((await (await fetch(base + "/models")).json()).models[0].name).toBe(
      name,
    );
  });
  it("paginates metadata with stable limits", async () => {
    const now = new Date().toISOString();
    await db.batch(
      Array.from({ length: 52 }, (_, i) => ({
        sql: "INSERT INTO elan_models(id,name,payload_json,diagram_count,created_at,updated_at) VALUES (?,?,?,1,?,?)",
        args: [String(i), "Model " + i, JSON.stringify(sample()), now, now],
      })),
      "write",
    );
    const first = await (await fetch(base + "/models")).json();
    const second = await (await fetch(base + "/models?offset=50")).json();
    expect(first.models).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(second.models).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });
  it("migrations are idempotent and retain a checksum", async () => {
    expect(await migrate(db)).toEqual([]);
    const version = await db.execute(
      "SELECT checksum FROM elan_schema_migrations",
    );
    expect(version.rows[0].checksum).toMatch(/^[a-f0-9]{64}$/);
  });
  it("rejects changes to already applied migrations", async () => {
    await db.execute("UPDATE elan_schema_migrations SET checksum = 'changed'");
    await expect(migrate(db)).rejects.toThrow("Applied migration was changed");
  });
  it("does not expose SDK errors or credentials in API responses", async () => {
    db.execute = async () => {
      throw new Error("private database URL and token");
    };
    const response = await fetch(base + "/models");
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain("private database URL and token");
    expect(JSON.parse(text).error.code).toBe("database_unavailable");
  });
  it("rolls back failed migrations without recording their version", async () => {
    const folder = await mkdtemp(join(tmpdir(), "elan-migrations-"));
    const path = join(folder, "002_failure.sql");
    try {
      await writeFile(
        path,
        "CREATE TABLE rollback_probe(id TEXT); INVALID SQL;",
      );
      await expect(migrate(db, pathToFileURL(folder + "/"))).rejects.toThrow();
      expect(
        (
          await db.execute(
            "SELECT name FROM sqlite_master WHERE name='rollback_probe'",
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.execute(
            "SELECT version FROM elan_schema_migrations WHERE version='002_failure.sql'",
          )
        ).rows,
      ).toHaveLength(0);
    } finally {
      await unlink(path);
      await rmdir(folder);
    }
  });
});
describe("server database configuration", () => {
  it("selects the current Turso driver and the libSQL driver by URL", () => {
    expect(
      databaseConfig({
        TURSO_DATABASE_URL: "turso://test.example",
        TURSO_AUTH_TOKEN: "test",
      }).driver,
    ).toBe("turso");
    expect(
      databaseConfig({
        TURSO_DATABASE_URL: "libsql://test.example",
        TURSO_AUTH_TOKEN: "test",
      }).driver,
    ).toBe("libsql");
    expect(
      databaseConfig({
        TURSO_DATABASE_URL: "https://test.example",
        TURSO_AUTH_TOKEN: "test",
        TURSO_DATABASE_DRIVER: "turso",
      }).driver,
    ).toBe("turso");
  });
  it("rejects missing credentials and local files in Vercel", () => {
    expect(() => databaseConfig({})).toThrow();
    expect(() =>
      databaseConfig({ TURSO_DATABASE_URL: "libsql://test.example" }),
    ).toThrow();
    expect(() =>
      databaseConfig({ VERCEL: "1", TURSO_DATABASE_URL: "file:./db.sqlite" }),
    ).toThrow();
    expect(() =>
      databaseConfig({
        TURSO_DATABASE_URL: "http://remote.example",
        TURSO_AUTH_TOKEN: "test",
      }),
    ).toThrow();
  });
});
