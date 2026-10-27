import { prepareDeployment } from "../server/deployment.ts";

try {
  const result = await prepareDeployment();
  console.log(
    result.skipped
      ? "Database preparation skipped: this is not a Vercel production build."
      : result.applied.length
        ? "Production database initialized. Applied migrations: " +
          result.applied.join(", ")
        : "Production database is ready; no pending migrations.",
  );
} catch {
  console.error(
    "Production database preparation failed. Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in this project's Production environment, database connectivity and migration history. Existing models were not deleted. Credentials are not printed.",
  );
  process.exitCode = 1;
}
