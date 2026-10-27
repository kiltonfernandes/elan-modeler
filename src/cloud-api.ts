import {
  MAX_CLOUD_BYTES,
  type CloudList,
  type CloudModel,
  type CloudStatus,
  type CloudSummary,
} from "../shared/cloud";
import type { Project } from "./storage";

export class CloudError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/api/" + path, {
      method,
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new CloudError(
        "api_unavailable",
        "Cloud API is not available at this address.",
      );
    const value = await response.json();
    if (!response.ok)
      throw new CloudError(
        value.error?.code || "api_unavailable",
        value.error?.message || "Cloud request failed.",
      );
    return value as T;
  } catch (error) {
    if (error instanceof CloudError) throw error;
    throw new CloudError(
      "api_unavailable",
      "Cloud API is unavailable. Your local copy is preserved.",
    );
  } finally {
    clearTimeout(timer);
  }
}
function checkSize(project: Project) {
  if (new Blob([JSON.stringify(project)]).size > MAX_CLOUD_BYTES)
    throw new CloudError(
      "project_too_large",
      "Cloud projects are limited to 3 MiB.",
    );
}
export const cloudApi = {
  status: () => request<CloudStatus>("status"),
  list: (archived = false, offset = 0) =>
    request<CloudList>(`models?archived=${archived}&offset=${offset}`),
  get: (id: string) => request<CloudModel>("models/" + encodeURIComponent(id)),
  save: (project: Project, current: CloudSummary | null) => {
    checkSize(project);
    return current
      ? request<CloudModel>("models/" + encodeURIComponent(current.id), "PUT", {
          project,
          revision: current.revision,
        })
      : request<CloudModel>("models", "POST", { project });
  },
  archive: (model: CloudSummary, archived: boolean) =>
    request<CloudSummary>("models/" + encodeURIComponent(model.id), "PATCH", {
      revision: model.revision,
      archived,
    }),
};
