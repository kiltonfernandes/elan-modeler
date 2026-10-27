import { randomUUID } from "node:crypto";
import type { Project } from "../shared/project.ts";
import type { CloudList, CloudModel, CloudSummary } from "../shared/cloud.ts";
import type { Database } from "./database.ts";
import { ApiError } from "./errors.ts";

const columns =
  "id, name, diagram_count, revision, created_at, updated_at, archived_at";
function summary(row: Record<string, unknown>): CloudSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    diagramCount: Number(row.diagram_count),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    archivedAt: row.archived_at === null ? null : String(row.archived_at),
  };
}
export class ModelStore {
  db: Database;
  constructor(db: Database) {
    this.db = db;
  }
  async list(archived = false, offset = 0, query = ""): Promise<CloudList> {
    const pattern = "%" + query.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
    const result = await this.db.execute({
      sql: `SELECT ${columns} FROM elan_models WHERE archived_at IS ${archived ? "NOT " : ""}NULL ${query ? "AND (name LIKE ? ESCAPE '\\' OR payload_json LIKE ? ESCAPE '\\')" : ""} ORDER BY updated_at DESC, id DESC LIMIT 51 OFFSET ?`,
      args: query ? [pattern, pattern, offset] : [offset],
    });
    return {
      models: result.rows.slice(0, 50).map(summary),
      hasMore: result.rows.length > 50,
    };
  }
  async get(id: string): Promise<CloudModel> {
    const result = await this.db.execute({
      sql: `SELECT ${columns}, payload_json FROM elan_models WHERE id = ?`,
      args: [id],
    });
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "model_not_found", "Model not found.");
    return {
      ...summary(row),
      project: JSON.parse(String(row.payload_json)) as Project,
    };
  }
  async create(project: Project): Promise<CloudModel> {
    const id = randomUUID(),
      now = new Date().toISOString();
    const result = await this.db.execute({
      sql: `INSERT INTO elan_models(id, name, payload_json, diagram_count, revision, created_at, updated_at)
      SELECT ?, ?, ?, ?, 1, ?, ? WHERE (SELECT COUNT(*) FROM elan_models) < 500 RETURNING ${columns}`,
      args: [
        id,
        project.name,
        JSON.stringify(project),
        project.diagrams.length,
        now,
        now,
      ],
    });
    if (!result.rows.length)
      throw new ApiError(
        409,
        "model_limit",
        "This workspace is limited to 500 models, including archived models.",
      );
    return { ...summary(result.rows[0]), project };
  }
  async update(
    id: string,
    project: Project,
    revision: number,
  ): Promise<CloudModel> {
    const result = await this.db.execute({
      sql: `UPDATE elan_models SET name = ?, payload_json = ?, diagram_count = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? AND archived_at IS NULL RETURNING ${columns}`,
      args: [
        project.name,
        JSON.stringify(project),
        project.diagrams.length,
        new Date().toISOString(),
        id,
        revision,
      ],
    });
    if (!result.rows.length) return this.conflict(id);
    return { ...summary(result.rows[0]), project };
  }
  async archive(
    id: string,
    revision: number,
    archived: boolean,
  ): Promise<CloudSummary> {
    const now = new Date().toISOString();
    const result = await this.db.execute({
      sql: `UPDATE elan_models SET archived_at = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING ${columns}`,
      args: [archived ? now : null, now, id, revision],
    });
    if (!result.rows.length) return this.conflict(id);
    return summary(result.rows[0]);
  }
  private async conflict(id: string): Promise<never> {
    await this.get(id);
    throw new ApiError(
      409,
      "revision_conflict",
      "The model changed in another tab or was archived. Reload it or save a separate copy.",
    );
  }
}
