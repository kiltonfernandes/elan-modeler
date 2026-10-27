import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { MAX_CLOUD_BYTES } from "../shared/cloud.ts";
import { checkSchema, getDatabase, type Database } from "./database.ts";
import { ApiError } from "./errors.ts";
import { ModelStore } from "./models.ts";
import { validateProject, validateRevision } from "./project-validation.ts";

export type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
type Route = "health" | "status" | "models" | "model" | "not-found";
const BODY_LIMIT = MAX_CLOUD_BYTES + 1024;
export async function jsonBody(
  req: ApiRequest,
): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))
    throw new ApiError(415, "json_required", "Use application/json.");
  if (Number(req.headers["content-length"] || 0) > BODY_LIMIT)
    throw new ApiError(
      413,
      "project_too_large",
      "Cloud projects are limited to 3 MiB.",
    );
  let value = req.body;
  if (value === undefined) {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of req) {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += b.length;
      if (bytes > BODY_LIMIT)
        throw new ApiError(
          413,
          "project_too_large",
          "Cloud projects are limited to 3 MiB.",
        );
      chunks.push(b);
    }
    value = Buffer.concat(chunks).toString("utf8");
  }
  if (Buffer.isBuffer(value)) value = value.toString("utf8");
  if (typeof value === "string") {
    if (Buffer.byteLength(value) > BODY_LIMIT)
      throw new ApiError(
        413,
        "project_too_large",
        "Cloud projects are limited to 3 MiB.",
      );
    try {
      value = JSON.parse(value);
    } catch {
      throw new ApiError(400, "invalid_json", "Invalid JSON body.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "invalid_json", "Expected a JSON object.");
  if (Buffer.byteLength(JSON.stringify(value)) > BODY_LIMIT)
    throw new ApiError(
      413,
      "project_too_large",
      "Cloud projects are limited to 3 MiB.",
    );
  return value as Record<string, unknown>;
}

// There is deliberately no authentication in this initial, public workspace.
// Same-origin writes prevent accidental embedding; they are not access control.
function checkOrigin(req: ApiRequest) {
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host === req.headers.host) return;
  } catch {
    /* Invalid origins are rejected below. */
  }
  throw new ApiError(403, "cross_origin", "Use the application's own origin.");
}
function reply(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}
export function createHandler(
  route: Route,
  connect: () => Promise<Database> = getDatabase,
) {
  return async (req: ApiRequest, res: ServerResponse) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Request-Id", randomUUID());
    const method = req.method || "GET";
    const allowed =
      route === "models"
        ? ["GET", "POST"]
        : route === "model"
          ? ["GET", "PUT", "PATCH", "DELETE"]
          : ["GET"];
    try {
      if (!allowed.includes(method)) {
        res.setHeader("Allow", allowed.join(", "));
        throw new ApiError(405, "method_not_allowed", "Method not allowed.");
      }
      if (route === "not-found")
        throw new ApiError(404, "route_not_found", "API route not found.");
      if (route === "health")
        return reply(res, 200, {
          status: "ok",
          service: "elan-modeler",
          access: "public",
        });
      if (
        route === "status" &&
        !process.env.TURSO_DATABASE_URL &&
        connect === getDatabase
      ) {
        return reply(res, 200, {
          configured: false,
          ready: false,
          access: "public",
          maxProjectBytes: MAX_CLOUD_BYTES,
        });
      }
      const url = new URL(req.url || "/", "http://localhost");
      const id =
        route === "model"
          ? typeof req.query?.id === "string"
            ? req.query.id
            : url.pathname.split("/").filter(Boolean).at(-1) || ""
          : "";
      if (
        route === "model" &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        )
      )
        throw new ApiError(400, "invalid_id", "Invalid model ID.");
      let body: Record<string, unknown> | undefined;
      let project;
      let revision;
      if (method !== "GET") {
        checkOrigin(req);
        body = await jsonBody(req);
        if (method === "PUT" || method === "POST")
          project = validateProject(body.project);
        if (method !== "POST") revision = validateRevision(body.revision);
        if (method === "PATCH" && typeof body.archived !== "boolean")
          throw new ApiError(
            400,
            "invalid_archive",
            "archived must be a boolean.",
          );
      }
      const db = await connect();
      await checkSchema(db);
      if (route === "status")
        return reply(res, 200, {
          configured: true,
          ready: true,
          access: "public",
          maxProjectBytes: MAX_CLOUD_BYTES,
        });
      const store = new ModelStore(db);
      if (route === "models") {
        if (method === "POST")
          return reply(res, 201, await store.create(project!));
        const rawOffset = url.searchParams.get("offset") || "0";
        if (!/^\d{1,5}$/.test(rawOffset))
          throw new ApiError(400, "invalid_offset", "Invalid offset.");
        return reply(
          res,
          200,
          await store.list(
            url.searchParams.get("archived") === "true",
            Number(rawOffset),
          ),
        );
      }
      if (method === "GET") return reply(res, 200, await store.get(id));
      if (method === "PUT")
        return reply(res, 200, await store.update(id, project!, revision!));
      return reply(
        res,
        200,
        await store.archive(
          id,
          revision!,
          method === "DELETE" || body!.archived === true,
        ),
      );
    } catch (error) {
      if (error instanceof ApiError)
        return reply(res, error.status, {
          error: { code: error.code, message: error.message },
        });
      // Do not expose SDK errors, database URLs, tokens or model content.
      return reply(res, 503, {
        error: {
          code: "database_unavailable",
          message:
            "Unable to reach the database. Check server configuration and migrations.",
        },
      });
    }
  };
}
export function routeFor(pathname: string): Route {
  if (pathname === "/api/health") return "health";
  if (pathname === "/api/status") return "status";
  if (pathname === "/api/models" || pathname === "/api/models/")
    return "models";
  if (/^\/api\/models\/[^/]+$/.test(pathname)) return "model";
  return "not-found";
}
