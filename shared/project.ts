export type Diagram = {
  id: string;
  name: string;
  xml: string;
  sourceXml?: string;
  sourceFilename?: string;
};
export type Comment = {
  id: string;
  diagramId: string;
  elementId: string;
  author: string;
  text: string;
  created: string;
  resolved: boolean;
};
export type Project = {
  format: "elan-model";
  version: 1;
  name: string;
  diagrams: Diagram[];
  activeId: string;
  comments: Comment[];
  updated: string;
};
export type Snapshot = {
  id: string;
  name: string;
  created: string;
  project: Project;
};
