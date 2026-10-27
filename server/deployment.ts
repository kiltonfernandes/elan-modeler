import {
  connectDatabase,
  databaseConfig,
  checkSchema,
  type Database,
} from "./database.ts";
import { migrate } from "./migrations.ts";

// Only the production build may initialize the shared cloud database.
// Local builds and previews do not touch production data.
export async function prepareDeployment(
  env: NodeJS.ProcessEnv = process.env,
  connect: (env: NodeJS.ProcessEnv) => Promise<Database> = connectDatabase,
) {
  if (env.VERCEL_ENV !== "production")
    return { skipped: true, applied: [] as string[] };
  const config = { ...env, VERCEL: "1" };
  databaseConfig(config);
  const db = await connect(config);
  try {
    const applied = await migrate(db);
    await checkSchema(db);
    return { skipped: false, applied };
  } finally {
    db.close();
  }
}
