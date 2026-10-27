import type { ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
  MCP_NAME,
  MCP_TOOLS,
  MCP_VERSION,
  type McpInfo,
} from "../shared/mcp.ts";
import { MAX_CLOUD_BYTES } from "../shared/cloud.ts";
import { getDatabase, type Database } from "./database.ts";
import { ApiError } from "./errors.ts";
import { jsonBody, type ApiRequest } from "./http.ts";
import { createElanMcpServer } from "./mcp-server.ts";

export function mcpInfo(env: NodeJS.ProcessEnv = process.env): McpInfo {
  return {
    name: MCP_NAME,
    version: MCP_VERSION,
    transport: "streamable-http",
    endpointPath: "/mcp",
    authentication: "none",
    notionEndpointPath: "/mcp/notion",
    notionTokenConfigured:
      (env.ELAN_MCP_NOTION_TOKEN?.trim().length || 0) >= 32,
    tools: MCP_TOOLS,
  };
}
function originFor(req: ApiRequest, env: NodeJS.ProcessEnv) {
  let url: URL;
  try {
    url = new URL(`${env.VERCEL ? "https" : "http"}://${req.headers.host}`);
  } catch {
    throw new ApiError(403, "invalid_host", "Invalid Host header.");
  }
  const configured = env.ELAN_PUBLIC_URL
    ? new URL(env.ELAN_PUBLIC_URL).origin
    : undefined;
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !env.VERCEL &&
    !loopback &&
    (!configured || new URL(configured).host !== url.host)
  )
    throw new ApiError(
      403,
      "invalid_host",
      "Use the local application address or configure ELAN_PUBLIC_URL for self-hosting.",
    );
  const origin = req.headers.origin;
  const allowed = new Set([
    url.origin,
    configured,
    "https://chatgpt.com",
    "https://www.notion.so",
    "https://notion.so",
    "https://app.notion.com",
    "https://www.notion.com",
    "https://claude.ai",
    ...(env.ELAN_MCP_ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ]);
  if (origin && !allowed.has(origin))
    throw new ApiError(
      403,
      "invalid_origin",
      "Origin is not allowed for this MCP server.",
    );
  return configured || url.origin;
}
function rpcError(
  res: ServerResponse,
  status: number,
  code: number,
  message: string,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }),
  );
}
export function createMcpHttpHandler(
  connect: () => Promise<Database> = getDatabase,
  env: NodeJS.ProcessEnv = process.env,
) {
  return async (req: ApiRequest, res: ServerResponse) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    let handler: ReturnType<typeof createMcpHandler> | undefined;
    try {
      const origin = originFor(req, env);
      const url = new URL(req.url || "/mcp", origin);
      const profile = req.query?.profile ?? url.searchParams.get("profile");
      const notion =
        url.pathname.replace(/\/$/, "") === "/mcp/notion" ||
        profile === "notion";
      if (
        !["/mcp", "/mcp/", "/mcp/notion", "/mcp/notion/", "/api/mcp"].includes(
          url.pathname,
        )
      )
        return rpcError(res, 404, -32600, "MCP endpoint not found.");
      if (notion) {
        const token = env.ELAN_MCP_NOTION_TOKEN?.trim();
        if (!token || token.length < 32)
          return rpcError(
            res,
            503,
            -32000,
            "Configure ELAN_MCP_NOTION_TOKEN with at least 32 characters to enable the Notion header-auth endpoint. Public /mcp remains available.",
          );
        const supplied =
          /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "")?.[1] || "";
        const expectedBytes = Buffer.from(token),
          suppliedBytes = Buffer.from(supplied);
        if (
          expectedBytes.length !== suppliedBytes.length ||
          !timingSafeEqual(expectedBytes, suppliedBytes)
        ) {
          res.setHeader("WWW-Authenticate", 'Bearer realm="elan-notion-mcp"');
          return rpcError(
            res,
            401,
            -32001,
            "A valid Authorization: Bearer token is required for this endpoint.",
          );
        }
      }
      if (!["POST", "GET", "DELETE"].includes(req.method || "GET")) {
        res.setHeader("Allow", "POST, GET, DELETE");
        return rpcError(res, 405, -32600, "Method not allowed.");
      }
      const body = req.method === "POST" ? await jsonBody(req) : undefined;
      handler = createMcpHandler(() => createElanMcpServer(origin, connect), {
        responseMode: "auto",
        legacy: "stateless",
      });
      await toNodeHandler(handler, {
        maxRequestBodySize: MAX_CLOUD_BYTES + 1024,
      })(req, res, body);
    } catch (error) {
      if (res.writableEnded) return;
      if (error instanceof ApiError)
        return rpcError(
          res,
          error.status,
          error.code === "invalid_json" ? -32700 : -32600,
          error.message,
        );
      return rpcError(
        res,
        500,
        -32603,
        "Unable to process the MCP request. Internal details and credentials are not exposed.",
      );
    } finally {
      await handler?.close();
    }
  };
}
export function mcpInfoHandler(_req: ApiRequest, res: ServerResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(mcpInfo()));
}
