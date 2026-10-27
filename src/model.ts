export type Node = {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  lane?: string;
  doc?: string;
  event?: string;
  children?: Graph;
  attrs?: Record<string, string>;
};
export type Flow = {
  id: string;
  from: string;
  to: string;
  name?: string;
  points?: { x: number; y: number }[];
  type?: string;
};
export type Lane = { id: string; name: string; y: number; h: number };
export type Graph = {
  id: string;
  name: string;
  nodes: Node[];
  flows: Flow[];
  lanes?: Lane[];
  width?: number;
  height?: number;
  participant?: string;
};
export const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export const NS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
export const uid = (prefix = "Element") =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
export function bounds(n: Node) {
  return {
    x: n.x,
    y: n.y,
    width:
      n.w ?? (/Event$/.test(n.type) ? 36 : /Gateway$/.test(n.type) ? 50 : 120),
    height:
      n.h ?? (/Event$/.test(n.type) ? 36 : /Gateway$/.test(n.type) ? 50 : 80),
  };
}
export function graphXML(graphs: Graph[]) {
  const diagrams: string[] = [];
  function content(g: Graph, sub = false): string {
    const nodes = g.nodes
      .map((n) => {
        const incoming = g.flows
          .filter((f) => f.to === n.id)
          .map((f) => `<bpmn:incoming>${esc(f.id)}</bpmn:incoming>`)
          .join("");
        const outgoing = g.flows
          .filter((f) => f.from === n.id)
          .map((f) => `<bpmn:outgoing>${esc(f.id)}</bpmn:outgoing>`)
          .join("");
        const doc = n.doc
          ? `<bpmn:documentation>${esc(n.doc)}</bpmn:documentation>`
          : "";
        const attrs = n.attrs
          ? `<bpmn:extensionElements><elan:properties>${Object.entries(n.attrs)
              .map(
                ([name, value]) =>
                  `<elan:property name="${esc(name)}" value="${esc(value)}"/>`,
              )
              .join("")}</elan:properties></bpmn:extensionElements>`
          : "";
        if (n.children) {
          diagrams.push(plane(n.children, n.id));
        }
        return `<bpmn:${n.type} id="${esc(n.id)}" name="${esc(n.name)}">${doc}${attrs}${incoming}${outgoing}${n.event ? `<bpmn:${n.event} id="${esc(n.id)}_event"/>` : ""}${n.children ? content(n.children, true) : ""}</bpmn:${n.type}>`;
      })
      .join("");
    const lanes =
      !sub && g.lanes?.length
        ? `<bpmn:laneSet id="${esc(g.id)}_lanes">${g.lanes
            .map(
              (l) =>
                `<bpmn:lane id="${esc(l.id)}" name="${esc(l.name)}">${g.nodes
                  .filter((n) => n.lane === l.id)
                  .map(
                    (n) => `<bpmn:flowNodeRef>${esc(n.id)}</bpmn:flowNodeRef>`,
                  )
                  .join("")}</bpmn:lane>`,
            )
            .join("")}</bpmn:laneSet>`
        : "";
    return `${lanes}${nodes}${g.flows.map((f) => `<bpmn:${f.type || "sequenceFlow"} id="${esc(f.id)}" sourceRef="${esc(f.from)}" targetRef="${esc(f.to)}"${f.name ? ` name="${esc(f.name)}"` : ""}/>`).join("")}`;
  }
  function plane(g: Graph, root: string) {
    const shapes = g.nodes
      .map((n) => {
        const b = bounds(n);
        return `<bpmndi:BPMNShape id="${esc(n.id)}_di" bpmnElement="${esc(n.id)}"${n.type === "subProcess" ? ' isExpanded="false"' : ""}><dc:Bounds x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}"/></bpmndi:BPMNShape>`;
      })
      .join("");
    const edges = g.flows
      .map((f) => {
        const a = g.nodes.find((n) => n.id === f.from),
          b = g.nodes.find((n) => n.id === f.to);
        if (!a || !b) return "";
        const ab = bounds(a),
          bb = bounds(b);
        const from = { x: ab.x + ab.width, y: ab.y + ab.height / 2 },
          to = { x: bb.x, y: bb.y + bb.height / 2 };
        const pts =
          f.points ??
          (from.y === to.y
            ? [from, to]
            : [
                from,
                { x: (from.x + to.x) / 2, y: from.y },
                { x: (from.x + to.x) / 2, y: to.y },
                to,
              ]);
        return `<bpmndi:BPMNEdge id="${esc(f.id)}_di" bpmnElement="${esc(f.id)}">${pts.map((p) => `<di:waypoint x="${p.x}" y="${p.y}"/>`).join("")}${f.name ? `<bpmndi:BPMNLabel><dc:Bounds x="${(from.x + to.x) / 2 - 15}" y="${from.y - 24}" width="70" height="20"/></bpmndi:BPMNLabel>` : ""}</bpmndi:BPMNEdge>`;
      })
      .join("");
    const containers = g.participant
      ? `<bpmndi:BPMNShape id="${esc(g.participant)}_di" bpmnElement="${esc(g.participant)}" isHorizontal="true"><dc:Bounds x="100" y="100" width="${g.width || 1300}" height="${g.height || 460}"/></bpmndi:BPMNShape>${(g.lanes || []).map((l) => `<bpmndi:BPMNShape id="${esc(l.id)}_di" bpmnElement="${esc(l.id)}" isHorizontal="true"><dc:Bounds x="130" y="${l.y}" width="${(g.width || 1300) - 30}" height="${l.h}"/></bpmndi:BPMNShape>`).join("")}`
      : "";
    return `<bpmndi:BPMNDiagram id="${esc(root)}_diagram"><bpmndi:BPMNPlane id="${esc(root)}_plane" bpmnElement="${esc(root)}">${containers}${shapes}${edges}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>`;
  }
  const processes = graphs
    .map(
      (g) =>
        `<bpmn:process id="${esc(g.id)}" name="${esc(g.name)}" isExecutable="false">${content(g)}</bpmn:process>`,
    )
    .join("");
  const collaborations = graphs
    .filter((g) => g.participant)
    .map(
      (g) =>
        `<bpmn:collaboration id="${esc(g.id)}_collab"><bpmn:participant id="${esc(g.participant)}" name="${esc(g.name)}" processRef="${esc(g.id)}"/></bpmn:collaboration>`,
    )
    .join("");
  const rootPlanes = graphs
    .map((g) => plane(g, g.participant ? g.id + "_collab" : g.id))
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="${NS}" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:elan="https://elan-modeler.app/schema/1.0" id="Definitions_Elan" targetNamespace="https://elan-modeler.app/bpmn" exporter="Élan Modeler" exporterVersion="0.1.0">${processes}${collaborations}${rootPlanes}${diagrams.join("")}</bpmn:definitions>`;
}
export function recruitment(en = false): Graph {
  const t = (pt: string, enText: string) => (en ? enText : pt);
  const child: Graph = {
    id: "Onboarding",
    name: t("Integração do colaborador", "Employee onboarding"),
    nodes: [
      {
        id: "OnStart",
        type: "startEvent",
        name: t("Admissão confirmada", "Hire confirmed"),
        x: 180,
        y: 210,
      },
      {
        id: "OnCreate",
        type: "scriptTask",
        name: t("Criar onboarding", "Create onboarding"),
        x: 265,
        y: 188,
      },
      { id: "OnSplit", type: "parallelGateway", name: "", x: 440, y: 203 },
      {
        id: "OnVisa",
        type: "manualTask",
        name: t("Providenciar documentos", "Arrange documents"),
        x: 550,
        y: 120,
      },
      {
        id: "OnLaptop",
        type: "userTask",
        name: t("Preparar computador", "Prepare laptop"),
        x: 550,
        y: 300,
      },
      {
        id: "OnAccount",
        type: "serviceTask",
        name: t("Criar acessos", "Create accounts"),
        x: 740,
        y: 300,
      },
      { id: "OnJoin", type: "parallelGateway", name: "", x: 945, y: 203 },
      {
        id: "OnInduct",
        type: "userTask",
        name: t("Realizar integração", "Conduct induction"),
        x: 1060,
        y: 188,
      },
      {
        id: "OnEnd",
        type: "endEvent",
        name: t("Integrado", "Onboarded"),
        x: 1250,
        y: 210,
      },
    ],
    flows: [
      ["OnStart", "OnCreate"],
      ["OnCreate", "OnSplit"],
      ["OnSplit", "OnVisa"],
      ["OnSplit", "OnLaptop"],
      ["OnLaptop", "OnAccount"],
      ["OnVisa", "OnJoin"],
      ["OnAccount", "OnJoin"],
      ["OnJoin", "OnInduct"],
      ["OnInduct", "OnEnd"],
    ].map(([from, to], i) => ({ id: "OnFlow_" + i, from, to })),
  };
  return {
    id: "Recruitment",
    name: t("Recrutamento e seleção", "Recruitment & selection"),
    participant: "Participant_Recruitment",
    width: 1420,
    height: 510,
    lanes: [
      {
        id: "Lane_Manager",
        name: t("Gestor da área", "Department manager"),
        y: 100,
        h: 220,
      },
      {
        id: "Lane_HR",
        name: t("Recursos humanos", "Human resources"),
        y: 320,
        h: 290,
      },
    ],
    nodes: [
      {
        id: "Start",
        type: "startEvent",
        name: t("Necessidade de contratação", "Hiring need"),
        x: 205,
        y: 197,
        lane: "Lane_Manager",
      },
      {
        id: "Staffing",
        type: "userTask",
        name: t("Planejar contratação", "Plan staffing"),
        x: 300,
        y: 175,
        lane: "Lane_Manager",
        doc: t(
          "O gestor define o cargo, orçamento, competências e prazo da contratação.",
          "The manager defines role, budget, skills and hiring deadline.",
        ),
      },
      {
        id: "Opening",
        type: "userTask",
        name: t("Publicar vaga", "Publish vacancy"),
        x: 485,
        y: 385,
        lane: "Lane_HR",
      },
      {
        id: "Review",
        type: "userTask",
        name: t("Analisar candidaturas", "Review applications"),
        x: 675,
        y: 175,
        lane: "Lane_Manager",
      },
      {
        id: "Selected",
        type: "exclusiveGateway",
        name: t("Perfil aprovado?", "Suitable profile?"),
        x: 850,
        y: 190,
        lane: "Lane_Manager",
      },
      {
        id: "Interview",
        type: "userTask",
        name: t("Conduzir entrevista", "Conduct interview"),
        x: 970,
        y: 175,
        lane: "Lane_Manager",
      },
      {
        id: "Offer",
        type: "sendTask",
        name: t("Enviar proposta", "Send offer"),
        x: 970,
        y: 385,
        lane: "Lane_HR",
      },
      {
        id: "Appointment",
        type: "userTask",
        name: t("Confirmar admissão", "Confirm appointment"),
        x: 1155,
        y: 385,
        lane: "Lane_HR",
      },
      {
        id: "Onboarding",
        type: "subProcess",
        name: t("Integrar colaborador", "Onboard employee"),
        x: 1350,
        y: 385,
        lane: "Lane_HR",
        children: child,
        doc: t(
          "Abra o subprocesso para editar as atividades de integração.",
          "Open the subprocess to edit onboarding activities.",
        ),
      },
      {
        id: "End",
        type: "endEvent",
        name: t("Admissão concluída", "Hiring complete"),
        x: 1387,
        y: 530,
        lane: "Lane_HR",
      },
    ],
    flows: [
      { id: "F1", from: "Start", to: "Staffing" },
      { id: "F2", from: "Staffing", to: "Opening" },
      { id: "F3", from: "Opening", to: "Review" },
      { id: "F4", from: "Review", to: "Selected" },
      { id: "F5", from: "Selected", to: "Interview", name: t("Sim", "Yes") },
      {
        id: "F6",
        from: "Selected",
        to: "Opening",
        name: t("Não", "No"),
        points: [
          { x: 875, y: 240 },
          { x: 875, y: 510 },
          { x: 545, y: 510 },
          { x: 545, y: 465 },
        ],
      },
      {
        id: "F7",
        from: "Interview",
        to: "Offer",
        points: [
          { x: 1030, y: 255 },
          { x: 1030, y: 385 },
        ],
      },
      { id: "F8", from: "Offer", to: "Appointment" },
      { id: "F9", from: "Appointment", to: "Onboarding" },
      {
        id: "F10",
        from: "Onboarding",
        to: "End",
        points: [
          { x: 1410, y: 465 },
          { x: 1410, y: 505 },
          { x: 1405, y: 505 },
          { x: 1405, y: 530 },
        ],
      },
    ],
  };
}
export function blankGraph(name: string): Graph {
  const id = uid("Process");
  return {
    id,
    name,
    participant: uid("Participant"),
    width: 1150,
    height: 400,
    lanes: [{ id: uid("Lane"), name: "", y: 100, h: 400 }],
    nodes: [],
    flows: [],
  };
}
export const elanDescriptor = {
  name: "Élan",
  uri: "https://elan-modeler.app/schema/1.0",
  prefix: "elan",
  xml: { tagAlias: "lowerCase" },
  types: [
    {
      name: "Properties",
      superClass: ["Element"],
      properties: [{ name: "values", type: "Property", isMany: true }],
    },
    {
      name: "Property",
      superClass: ["Element"],
      properties: [
        { name: "name", type: "String", isAttr: true },
        { name: "value", type: "String", isAttr: true },
      ],
    },
  ],
};
