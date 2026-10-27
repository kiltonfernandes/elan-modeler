import type { Project } from "./project.ts";

// Leave headroom under the Vercel Function request/response limit.
export const MAX_CLOUD_BYTES = 3 * 1024 * 1024;
export type CloudSummary = {
  id: string;
  name: string;
  revision: number;
  diagramCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
export type CloudModel = CloudSummary & { project: Project };
export type CloudList = { models: CloudSummary[]; hasMore: boolean };
export type CloudStatus = {
  configured: boolean;
  ready: boolean;
  access: "public";
  maxProjectBytes: number;
};
