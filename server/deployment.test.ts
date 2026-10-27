// @vitest-environment node
import { expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { prepareDeployment } from "./deployment.ts";
import { checkSchema } from "./database.ts";

const production = {
  VERCEL_ENV: "production",
  TURSO_DATABASE_URL: "libsql://test.example",
  TURSO_AUTH_TOKEN: "test-only",
};
it("never connects to the database for previews or local builds", async () => {
  const unexpected = async () => {
    throw new Error("Database must not be accessed");
  };
  for (const env of [{}, { ...production, VERCEL_ENV: "preview" }])
    expect(await prepareDeployment(env, unexpected)).toMatchObject({
      skipped: true,
    });
});
it("rejects production without credentials or with a local database before connecting", async () => {
  const unexpected = async () => {
    throw new Error("Must validate before connecting");
  };
  await expect(
    prepareDeployment({ VERCEL_ENV: "production" }, unexpected),
  ).rejects.toThrow("Configure TURSO_DATABASE_URL");
  await expect(
    prepareDeployment(
      { ...production, TURSO_DATABASE_URL: "file:./test.db" },
      unexpected,
    ),
  ).rejects.toThrow("remote Turso");
});
it("initializes a real empty database and preserves existing models on repeated deploys", async () => {
  const db = createClient({ url: "file::memory:" });
  let closed = 0;
  const connect = async () => ({
    execute: db.execute.bind(db),
    batch: db.batch.bind(db),
    close() {
      closed++;
    },
  });
  try {
    expect(await prepareDeployment(production, connect)).toEqual({
      skipped: false,
      applied: ["001_initial.sql"],
    });
    await checkSchema(db);
    await db.execute(
      "INSERT INTO elan_models(id,name,payload_json,diagram_count,revision,created_at,updated_at) VALUES ('existing','Preservado','{}',1,7,'2026-10-27','2026-10-27')",
    );
    expect(await prepareDeployment(production, connect)).toEqual({
      skipped: false,
      applied: [],
    });
    expect(
      (
        await db.execute(
          "SELECT name,revision FROM elan_models WHERE id='existing'",
        )
      ).rows[0],
    ).toMatchObject({ name: "Preservado", revision: 7 });
    expect(closed).toBe(2);
  } finally {
    db.close();
  }
});
it("fails deployment when an applied migration checksum was changed", async () => {
  const db = createClient({ url: "file::memory:" });
  const connect = async () => ({
    ...db,
    execute: db.execute.bind(db),
    batch: db.batch.bind(db),
    close() {},
  });
  try {
    await prepareDeployment(production, connect);
    await db.execute("UPDATE elan_schema_migrations SET checksum='modified'");
    await expect(prepareDeployment(production, connect)).rejects.toThrow(
      "Applied migration was changed",
    );
  } finally {
    db.close();
  }
});
