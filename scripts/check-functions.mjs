import assert from "node:assert/strict";
import { createServer } from "node:http";
import health from "../work/server-build/api/health.js";
import status from "../work/server-build/api/status.js";
import models from "../work/server-build/api/models/index.js";
import model from "../work/server-build/api/models/[id].js";
import mcp from "../work/server-build/api/mcp.js";
import mcpInfo from "../work/server-build/api/mcp-info.js";

// This probe never connects to a configured database.
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.TURSO_DATABASE_DRIVER;
const handlers = {
  "/api/health": health,
  "/api/status": status,
  "/api/models": models,
  "/api/models/invalid": model,
  "/mcp": mcp,
  "/api/mcp-info": mcpInfo,
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
  const info = await (await fetch(base + "/api/mcp-info")).json();
  assert.equal(info.endpointPath, "/mcp");
  assert.equal(info.tools.length, 12);
  const initialize = await fetch(base + "/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "compiled-api-probe", version: "1" },
      },
    }),
  });
  assert.equal(initialize.status, 200);
  assert.match(await initialize.text(), /Élan Modeler/);
  console.log("Compiled Node ESM entrypoints: 6 modules / 8 checks passed.");
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
