import type { Project, Diagram, Comment } from "../shared/project.ts";
import { MAX_CLOUD_BYTES } from "../shared/cloud.ts";
import { ApiError } from "./errors.ts";

function invalid(message: string): never {
  throw new ApiError(400, "invalid_project", message);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid("Expected an object.");
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  max: number,
  label: string,
  required = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    return invalid("Invalid " + label + ".");
  return value;
}
function timestamp(value: unknown): string {
  const s = text(value, 40, "timestamp", true);
  if (!Number.isFinite(Date.parse(s))) return invalid("Invalid timestamp.");
  return s;
}
function xml(value: unknown): string {
  const s = text(value, MAX_CLOUD_BYTES, "BPMN XML", true);
  if (/<!DOCTYPE|<!ENTITY/i.test(s))
    return invalid("DTD and XML entities are not supported.");
  return s;
}
export function validateProject(value: unknown): Project {
  const p = record(value);
  if (p.format !== "elan-model" || p.version !== 1)
    return invalid("Unsupported Élan project format.");
  if (
    !Array.isArray(p.diagrams) ||
    !p.diagrams.length ||
    p.diagrams.length > 100
  )
    return invalid("Expected 1–100 diagrams.");
  const ids = new Set<string>();
  const diagrams: Diagram[] = p.diagrams.map((item) => {
    const d = record(item);
    const id = text(d.id, 200, "diagram ID", true);
    if (ids.has(id)) return invalid("Duplicate diagram ID.");
    ids.add(id);
    const result: Diagram = {
      id,
      name: text(d.name, 300, "diagram name", true),
      xml: xml(d.xml),
    };
    if (d.sourceXml !== undefined) result.sourceXml = xml(d.sourceXml);
    if (d.sourceFilename !== undefined)
      result.sourceFilename = text(d.sourceFilename, 300, "source filename");
    return result;
  });
  const activeId = text(p.activeId, 200, "active diagram", true);
  if (!ids.has(activeId)) return invalid("Active diagram does not exist.");
  if (!Array.isArray(p.comments) || p.comments.length > 10000)
    return invalid("Invalid comments.");
  const commentIds = new Set<string>();
  const comments: Comment[] = p.comments.map((item) => {
    const c = record(item);
    const id = text(c.id, 200, "comment ID", true);
    if (commentIds.has(id)) return invalid("Duplicate comment ID.");
    commentIds.add(id);
    const diagramId = text(c.diagramId, 200, "comment diagram", true);
    if (!ids.has(diagramId) || typeof c.resolved !== "boolean")
      return invalid("Invalid comment context.");
    return {
      id,
      diagramId,
      elementId: text(c.elementId, 200, "element ID", true),
      author: text(c.author, 200, "author"),
      text: text(c.text, 20000, "comment"),
      created: timestamp(c.created),
      resolved: c.resolved,
    };
  });
  const result: Project = {
    format: "elan-model",
    version: 1,
    name: text(p.name, 300, "project name", true),
    diagrams,
    activeId,
    comments,
    updated: timestamp(p.updated),
  };
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > MAX_CLOUD_BYTES)
    throw new ApiError(
      413,
      "project_too_large",
      "Cloud projects are limited to 3 MiB. Export larger projects as .elan.",
    );
  return result;
}
export function validateRevision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1)
    throw new ApiError(
      400,
      "invalid_revision",
      "A positive revision number is required.",
    );
  return Number(value);
}
