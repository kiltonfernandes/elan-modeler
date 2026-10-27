import { createServer } from "node:http";
import { createHandler, routeFor } from "../server/http.ts";

const port = Number(process.env.ELAN_API_PORT || 3001);
const server = createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  void createHandler(routeFor(pathname))(req, res);
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Élan API: http://127.0.0.1:${port}`),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
