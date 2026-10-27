import { graphXML, recruitment, uid } from "./model";
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
export const STORAGE_KEY = "elan-modeler.project.v1";
export function initialProject(): Project {
  const id = uid("Diagram");
  return {
    format: "elan-model",
    version: 1,
    name: "Meu primeiro modelo",
    diagrams: [
      { id, name: "Recrutamento e seleção", xml: graphXML([recruitment()]) },
    ],
    activeId: id,
    comments: [],
    updated: new Date().toISOString(),
  };
}
export function parseProject(raw: string): Project {
  const p = JSON.parse(raw);
  if (
    p.format !== "elan-model" ||
    p.version !== 1 ||
    typeof p.name !== "string" ||
    !Array.isArray(p.diagrams) ||
    !p.diagrams.length ||
    p.diagrams.length > 100
  )
    throw new Error("Invalid Élan model.");
  const ids = new Set();
  for (const d of p.diagrams) {
    if (
      typeof d.id !== "string" ||
      typeof d.xml !== "string" ||
      typeof d.name !== "string" ||
      ids.has(d.id) ||
      d.xml.length > 25 * 1024 * 1024
    )
      throw new Error("Invalid diagram.");
    ids.add(d.id);
  }
  if (!ids.has(p.activeId)) p.activeId = p.diagrams[0].id;
  p.comments = Array.isArray(p.comments)
    ? p.comments
        .filter(
          (c: Comment) =>
            typeof c.id === "string" &&
            typeof c.diagramId === "string" &&
            typeof c.elementId === "string" &&
            typeof c.author === "string" &&
            typeof c.text === "string" &&
            typeof c.created === "string",
        )
        .slice(0, 10000)
    : [];
  return p as Project;
}
