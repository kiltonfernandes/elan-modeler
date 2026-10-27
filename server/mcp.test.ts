// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createServer, request as httpRequest, type Server } from "node:http";
import { createClient } from "@libsql/client";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { migrate } from "./migrations.ts";
import type { Database } from "./database.ts";
import type { ApiRequest } from "./http.ts";
import { createMcpHttpHandler, mcpInfo } from "./mcp-http.ts";
import { ModelStore } from "./models.ts";
import { MCP_TOOLS } from "../shared/mcp.ts";
import { probeMcp } from "../src/mcp-client.ts";

const xml = `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Def_1" targetNamespace="https://elan.example"><bpmn:process id="Process_1"><bpmn:userTask id="User_1" name="Revisar solicitação"><bpmn:documentation>Texto de aprovação</bpmn:documentation></bpmn:userTask></bpmn:process></bpmn:definitions>`;
const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "legacy-test", version: "1.0" },
  },
};

describe("Élan MCP over real HTTP with the official SDK and SQLite", () => {
  let db: Database, server: Server, base: string;
  let clients: Client[];
  let env: NodeJS.ProcessEnv;
  let available = true;
  beforeEach(async () => {
    clients = [];
    env = {};
    available = true;
    db = createClient({ url: "file::memory:" });
    await migrate(db);
    server = createServer(async (req: ApiRequest, res) => {
      // Emulate the already-parsed request body supplied by Vercel Functions.
      if (req.headers["x-test-parsed"]) {
        const chunks = [];
        for await (const c of req) chunks.push(Buffer.from(c));
        req.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        req.query = { profile: "notion" };
      }
      await createMcpHttpHandler(async () => {
        if (!available) throw new Error("internal secret must not leak");
        return db;
      }, env)(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  });
  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  });
  async function client(path = "/mcp", headers?: Record<string, string>) {
    const c = new Client({ name: "elan-integration-test", version: "1.0" });
    clients.push(c);
    await c.connect(
      new StreamableHTTPClientTransport(
        new URL(base + path),
        headers ? { requestInit: { headers } } : undefined,
      ),
    );
    return c;
  }
  async function tool(
    c: Client,
    name: string,
    args: Record<string, unknown> = {},
  ) {
    const result = await c.callTool({ name, arguments: args });
    const data =
      result.structuredContent ||
      JSON.parse(
        (result.content as any[]).find((item) => item.type === "text").text,
      );
    return { ...data, isError: result.isError || false } as any;
  }
  function raw(
    body: unknown,
    headers: Record<string, string> = {},
    path = "/mcp",
  ) {
    return fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": "2025-11-25",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }
  async function decode(response: Response) {
    const text = await response.text();
    return response.headers.get("content-type")?.includes("text/event-stream")
      ? JSON.parse(
          text
            .split(/\r?\n/)
            .find((line) => line.startsWith("data:"))!
            .slice(5),
        )
      : JSON.parse(text);
  }
  it("discovers all tools and their read/write annotations without connecting the database", async () => {
    available = false;
    const c = await client();
    const list = await c.listTools();
    expect(list.tools.map((t) => t.name).sort()).toEqual(
      MCP_TOOLS.map((t) => t.name).sort(),
    );
    for (const t of list.tools)
      expect(t.annotations?.readOnlyHint).toBe(
        MCP_TOOLS.find((m) => m.name === t.name)?.readOnly,
      );
    const status = await tool(c, "elan_status");
    expect(status.error.code).toBe("database_unavailable");
    expect(JSON.stringify(status)).not.toContain("internal secret");
    expect(
      (await c.readResource({ uri: "elan://guide" })).contents[0],
    ).toHaveProperty("text", expect.stringContaining("untrusted"));
  });
  it("supports a 2025 client using initialize, notifications and tools/list", async () => {
    const init = await raw(initialize);
    expect(init.status).toBe(200);
    expect((await decode(init)).result.protocolVersion).toBe("2025-11-25");
    expect(init.headers.get("mcp-session-id")).toBeNull();
    expect(
      (await raw({ jsonrpc: "2.0", method: "notifications/initialized" }))
        .status,
    ).toBe(202);
    const list = await decode(
      await raw({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    expect(list.result.tools).toHaveLength(12);
    expect((await fetch(base + "/mcp")).status).toBe(405);
  });
  it("runs the editor's read-only connection probe against the real HTTP endpoint", async () => {
    const report = await probeMcp(base + "/mcp");
    expect(report).toMatchObject({
      protocol: "2025-11-25",
      toolCount: 12,
      databaseReady: true,
    });
    expect((await new ModelStore(db).list()).models).toHaveLength(0);
  });
  it("reports database failure separately from protocol discovery in the editor probe", async () => {
    available = false;
    expect(await probeMcp(base + "/mcp")).toMatchObject({
      toolCount: 12,
      databaseReady: false,
      code: "database_unavailable",
    });
    await expect(probeMcp(base + "/unknown")).rejects.toThrow("HTTP 404");
  });
  it("creates a blank diagram that can be parsed and retrieved in full", async () => {
    const c = await client();
    expect((await tool(c, "elan_status")).ready).toBe(true);
    const model = await tool(c, "elan_create_model", { name: "Novo processo" });
    expect(model.revision).toBe(1);
    const d = await tool(c, "elan_get_diagram", {
      modelId: model.id,
      diagramId: model.activeDiagramId,
    });
    expect(d.xml).toContain("BPMNDiagram");
    expect(d.nextOffset).toBeNull();
    expect(
      (await tool(c, "elan_validate_bpmn", { bpmnXml: d.xml })).rootTypes,
    ).toContain("bpmn:Process");
    expect(model.url).toBe(`${base}/?model=${model.id}`);
  });
  it("adds and updates diagrams while preserving XML, comments and unrelated diagram source data", async () => {
    const c = await client(),
      store = new ModelStore(db);
    const model = await tool(c, "elan_create_model", {
      name: "Aprovação",
      bpmnXml: xml,
    });
    const initial = await store.get(model.id);
    initial.project.diagrams[0].sourceXml = "original source";
    initial.project.diagrams[0].sourceFilename = "original.bpmn";
    const saved = await store.update(model.id, initial.project, 1);
    const commented = await tool(c, "elan_add_comment", {
      modelId: model.id,
      expectedRevision: saved.revision,
      diagramId: model.activeDiagramId,
      elementId: "User_1",
      text: "Revisão pelo MCP",
    });
    const added = await tool(c, "elan_add_diagram", {
      modelId: model.id,
      expectedRevision: commented.revision,
      name: "Processo auxiliar",
      bpmnXml: xml,
      makeActive: false,
    });
    expect(added.activeDiagramId).toBe(model.activeDiagramId);
    const updated = await tool(c, "elan_update_diagram", {
      modelId: model.id,
      expectedRevision: added.revision,
      diagramId: added.addedDiagramId,
      name: "Auxiliar atualizado",
      bpmnXml: xml.replace("solicitação", "pedido"),
    });
    expect(updated.revision).toBe(5);
    const final = await store.get(model.id);
    expect(final.project.diagrams[0]).toEqual(initial.project.diagrams[0]);
    expect(final.project.comments[0].text).toBe("Revisão pelo MCP");
    expect(final.project.diagrams[1].xml).toContain("pedido");
    const read = await tool(c, "elan_get_diagram", {
      modelId: model.id,
      diagramId: model.activeDiagramId,
    });
    expect(read.comments).toHaveLength(1);
  });
  it("rejects stale revisions, invalid XML and nonexistent comment targets without changing data", async () => {
    const c = await client();
    const m = await tool(c, "elan_create_model", {
      name: "Seguro",
      bpmnXml: xml,
    });
    const a = {
      modelId: m.id,
      diagramId: m.activeDiagramId,
      expectedRevision: 1,
    };
    expect(
      (await tool(c, "elan_update_diagram", { ...a, bpmnXml: "<broken>" }))
        .error.code,
    ).toBe("invalid_bpmn");
    expect(
      (
        await tool(c, "elan_update_diagram", {
          ...a,
          bpmnXml: '<!DOCTYPE x [<!ENTITY v SYSTEM "file:///secret">]>' + xml,
        })
      ).error.code,
    ).toBe("invalid_bpmn");
    expect(
      (
        await tool(c, "elan_add_comment", {
          ...a,
          elementId: "missing",
          text: "x",
        })
      ).error.code,
    ).toBe("element_not_found");
    expect(
      (await tool(c, "elan_update_diagram", { ...a, name: "Atualizado" }))
        .revision,
    ).toBe(2);
    expect(
      (await tool(c, "elan_update_diagram", { ...a, name: "Sobrescrito" }))
        .error.code,
    ).toBe("revision_conflict");
    expect(
      (await new ModelStore(db).get(m.id)).project.diagrams[0],
    ).toMatchObject({ name: "Atualizado", xml });
  });
  it("prevents concurrent updates from losing a revision", async () => {
    const c = await client(),
      other = await client();
    const m = await tool(c, "elan_create_model", {
      name: "Concorrência",
      bpmnXml: xml,
    });
    const results = await Promise.all(
      [c, other].map((connection, i) =>
        tool(connection, "elan_update_diagram", {
          modelId: m.id,
          diagramId: m.activeDiagramId,
          expectedRevision: 1,
          name: `Edit ${i}`,
        }),
      ),
    );
    expect(results.filter((r) => r.revision === 2)).toHaveLength(1);
    expect(
      results.filter((r) => r.error?.code === "revision_conflict"),
    ).toHaveLength(1);
  });
  it("searches literal names and diagram text, and returns readable research content", async () => {
    const c = await client();
    const m = await tool(c, "elan_create_model", {
      name: "Taxa 100%_final",
      bpmnXml: xml,
    });
    await tool(c, "elan_create_model", { name: "Outro modelo" });
    expect(
      (await tool(c, "search", { query: "%_" })).results.map((r: any) => r.id),
    ).toEqual([m.id]);
    expect(
      (await tool(c, "search", { query: "solicitação" })).results,
    ).toHaveLength(1);
    expect(
      (await tool(c, "search", { query: "' OR 1=1 --" })).results,
    ).toHaveLength(0);
    const fetched = await tool(c, "fetch", { id: m.id });
    expect(fetched.text).toContain("bpmn:UserTask");
    expect(fetched.text).toContain("Texto de aprovação");
    expect(fetched.url).toBe(m.url);
  });
  it("returns bounded XML chunks that reconstruct the exact original Unicode document", async () => {
    const c = await client();
    const original = xml.replace("Texto de aprovação", "á😀".repeat(30000));
    const m = await tool(c, "elan_create_model", {
      name: "Grande",
      bpmnXml: original,
    });
    let reconstructed = "",
      offset: number | null = 0;
    while (offset !== null) {
      const d = await tool(c, "elan_get_diagram", {
        modelId: m.id,
        diagramId: m.activeDiagramId,
        offset,
      });
      expect(d.xml.length).toBeLessThanOrEqual(32000);
      reconstructed += d.xml;
      offset = d.nextOffset;
    }
    expect(reconstructed).toBe(original);
  });
  it("archives and restores models without deleting their contents", async () => {
    const c = await client();
    const m = await tool(c, "elan_create_model", {
      name: "Arquivo",
      bpmnXml: xml,
    });
    const archived = await tool(c, "elan_set_archived", {
      modelId: m.id,
      expectedRevision: 1,
      archived: true,
    });
    expect(archived.archivedAt).toBeTruthy();
    expect((await tool(c, "elan_list_models")).models).toHaveLength(0);
    expect(
      (await tool(c, "elan_list_models", { archived: true })).models,
    ).toHaveLength(1);
    expect(
      (
        await tool(c, "elan_update_diagram", {
          modelId: m.id,
          diagramId: m.activeDiagramId,
          expectedRevision: 2,
          name: "x",
        })
      ).error.code,
    ).toBe("revision_conflict");
    expect(
      (
        await tool(c, "elan_set_archived", {
          modelId: m.id,
          expectedRevision: 2,
          archived: false,
        })
      ).revision,
    ).toBe(3);
    expect((await new ModelStore(db).get(m.id)).project.diagrams[0].xml).toBe(
      xml,
    );
  });
  it("handles malformed requests, missing tools and schema-invalid arguments", async () => {
    const malformed = await fetch(base + "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error.code).toBe(-32700);
    const c = await client();
    expect(
      (
        await c.callTool({
          name: "elan_get_model",
          arguments: { modelId: "bad" },
        })
      ).isError,
    ).toBe(true);
    await expect(c.callTool({ name: "does_not_exist" })).rejects.toThrow();
  });
  it("validates Origin and local Host without requiring cookies or a session", async () => {
    expect(
      (await raw(initialize, { Origin: "https://unrelated.example" })).status,
    ).toBe(403);
    const invalidHost = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(
        base + "/mcp",
        {
          method: "POST",
          headers: { Host: "evil.example", "Content-Type": "application/json" },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode!);
        },
      );
      req.on("error", reject);
      req.end(JSON.stringify(initialize));
    });
    expect(invalidHost).toBe(403);
    expect(
      (await raw(initialize, { Origin: "https://chatgpt.com" })).status,
    ).toBe(200);
    expect((await raw(initialize)).status).toBe(200);
    expect((await fetch(base + "/mcp", { method: "PUT" })).status).toBe(405);
  });
  it("requires an optional Notion Bearer token while the main endpoint remains public", async () => {
    expect((await raw(initialize, {}, "/mcp/notion")).status).toBe(503);
    env.ELAN_MCP_NOTION_TOKEN = "test-only-" + "a".repeat(40);
    expect(
      (
        await raw(
          initialize,
          { Authorization: env.ELAN_MCP_NOTION_TOKEN },
          "/mcp/notion",
        )
      ).status,
    ).toBe(401);
    expect((await raw(initialize, {}, "/mcp/notion")).status).toBe(401);
    expect(
      (
        await raw(
          initialize,
          { Authorization: "Bearer invalid" },
          "/mcp/notion",
        )
      ).status,
    ).toBe(401);
    const c = await client("/mcp/notion", {
      Authorization: "Bearer " + env.ELAN_MCP_NOTION_TOKEN,
    });
    expect((await c.listTools()).tools).toHaveLength(12);
    expect((await raw(initialize)).status).toBe(200);
    const metadata = mcpInfo(env);
    expect(metadata.notionTokenConfigured).toBe(true);
    expect(JSON.stringify(metadata)).not.toContain(env.ELAN_MCP_NOTION_TOKEN);
  });
  it("supports Vercel pre-parsed bodies and protects the rewritten Notion route", async () => {
    env.ELAN_MCP_NOTION_TOKEN = "b".repeat(40);
    expect(
      (await raw(initialize, { "x-test-parsed": "true" }, "/api/mcp")).status,
    ).toBe(401);
    const r = await raw(
      initialize,
      {
        "x-test-parsed": "true",
        Authorization: "Bearer " + env.ELAN_MCP_NOTION_TOKEN,
      },
      "/api/mcp",
    );
    expect(r.status).toBe(200);
    expect((await decode(r)).result.serverInfo.name).toBe("Élan Modeler");
  });
});
