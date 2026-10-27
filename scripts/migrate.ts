import { connectDatabase, type Database } from "../server/database.ts";
import { migrate } from "../server/migrations.ts";

let db: Database | undefined;
try {
  db = await connectDatabase();
  const applied = await migrate(db);
  console.log(
    applied.length
      ? "Applied migrations: " + applied.join(", ")
      : "Database is up to date.",
  );
} catch {
  console.error(
    "Migration failed. Check database credentials, connectivity and migration history. No credentials are printed.",
  );
  process.exitCode = 1;
} finally {
  db?.close();
}
