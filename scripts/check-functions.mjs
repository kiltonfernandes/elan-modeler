import assert from "node:assert/strict";
import { createServer } from "node:http";
import health from "../work/server-build/api/health.js";
import status from "../work/server-build/api/status.js";
import models from "../work/server-build/api/models/index.js";
import model from "../work/server-build/api/models/[id].js";

// This probe never connects to a configured database.
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.TURSO_DATABASE_DRIVER;
const handlers = {
  "/api/health": health,
  "/api/status": status,
  "/api/models": models,
  "/api/models/invalid": model,
};
const server = createServer((req, res) => {
  void handlers[req.url](req, res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  assert.equal((await (await fetch(base + "/api/health")).json()).status, "ok");
  assert.equal(
    (await (await fetch(base + "/api/status")).json()).configured,
    false,
  );
  assert.equal((await fetch(base + "/api/models")).status, 503);
  assert.equal((await fetch(base + "/api/models/invalid")).status, 400);
  console.log("Compiled Node ESM API entrypoints: 4 checks passed.");
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
