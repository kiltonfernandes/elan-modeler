import { ApiError } from "./errors.ts";

export type Statement =
  | string
  | { sql: string; args: (string | number | null)[] };
export type DatabaseResult = {
  rows: Record<string, unknown>[];
  rowsAffected: number;
};
export interface Database {
  execute(statement: Statement): Promise<DatabaseResult>;
  batch(statements: Statement[], mode?: "write"): Promise<DatabaseResult[]>;
  close(): void;
}
export const SCHEMA_VERSION = "001_initial.sql";

export function databaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim();
  if (!url)
    throw new ApiError(
      503,
      "cloud_not_configured",
      "Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on the server.",
    );
  const protocol = new URL(url).protocol;
  const local =
    protocol === "file:" ||
    ((protocol === "http:" || protocol === "https:") &&
      ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname));
  if (env.VERCEL && local)
    throw new ApiError(
      503,
      "cloud_not_configured",
      "Use a remote Turso database on Vercel.",
    );
  if (
    !["file:", "http:", "https:", "libsql:", "turso:"].includes(protocol) ||
    (protocol === "http:" && !local)
  ) {
    throw new ApiError(
      503,
      "cloud_not_configured",
      "Unsupported database URL.",
    );
  }
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  if (!local && !authToken)
    throw new ApiError(
      503,
      "cloud_not_configured",
      "Configure TURSO_AUTH_TOKEN on the server.",
    );
  const driver =
    env.TURSO_DATABASE_DRIVER?.trim() ||
    (protocol === "turso:" ? "turso" : "libsql");
  if (driver !== "libsql" && driver !== "turso")
    throw new ApiError(
      503,
      "cloud_not_configured",
      "TURSO_DATABASE_DRIVER must be libsql or turso.",
    );
  if (driver === "turso" && protocol === "file:")
    throw new ApiError(
      503,
      "cloud_not_configured",
      "Local SQLite development uses the libsql driver.",
    );
  return { url, authToken, driver, local };
}

export async function connectDatabase(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Database> {
  const config = databaseConfig(env);
  if (config.driver === "turso") {
    const { createClient } = await import("@tursodatabase/serverless/compat");
    return createClient({ url: config.url, authToken: config.authToken });
  }
  if (config.local) {
    const { createClient } = await import("@libsql/client");
    return createClient({ url: config.url, authToken: config.authToken });
  }
  const { createClient } = await import("@libsql/client/web");
  return createClient({ url: config.url, authToken: config.authToken });
}

let connection: Promise<Database> | undefined;
export function getDatabase() {
  if (!connection)
    connection = connectDatabase().catch((error) => {
      connection = undefined;
      throw error;
    });
  return connection;
}

export async function checkSchema(db: Database) {
  const table = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'elan_schema_migrations'",
  );
  if (!table.rows.length)
    throw new ApiError(
      503,
      "schema_not_ready",
      "Run npm run db:migrate before using cloud storage.",
    );
  const version = await db.execute({
    sql: "SELECT version FROM elan_schema_migrations WHERE version = ?",
    args: [SCHEMA_VERSION],
  });
  if (!version.rows.length)
    throw new ApiError(
      503,
      "schema_not_ready",
      "Run npm run db:migrate before using cloud storage.",
    );
}
