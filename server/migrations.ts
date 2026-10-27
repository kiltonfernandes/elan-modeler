import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import type { Database } from "./database.ts";

export async function migrate(
  db: Database,
  directory = new URL("../db/migrations/", import.meta.url),
) {
  await db.execute(`CREATE TABLE IF NOT EXISTS elan_schema_migrations (
    version TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL
  )`);
  const applied: string[] = [];
  for (const version of (await readdir(directory))
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort()) {
    const sql = (await readFile(new URL(version, directory), "utf8")).replace(
      /\r\n/g,
      "\n",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await db.execute({
      sql: "SELECT checksum FROM elan_schema_migrations WHERE version = ?",
      args: [version],
    });
    if (existing.rows.length) {
      if (existing.rows[0].checksum !== checksum)
        throw new Error("Applied migration was changed: " + version);
      continue;
    }
    // Migration files contain only simple DDL. Add a migration runner supporting
    // SQL parsing before introducing triggers or semicolons inside SQL literals.
    const statements = sql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    await db.batch(
      [
        ...statements,
        {
          sql: "INSERT INTO elan_schema_migrations(version, checksum, applied_at) VALUES (?, ?, ?)",
          args: [version, checksum, new Date().toISOString()],
        },
      ],
      "write",
    );
    applied.push(version);
  }
  return applied;
}
