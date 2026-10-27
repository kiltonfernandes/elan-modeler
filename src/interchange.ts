import JSZip from "jszip";
import {
  bounds,
  esc,
  graphXML,
  type Graph,
  type Node,
  type Flow,
} from "./model";
export function xmlDocument(text: string) {
  if (text.length > 25 * 1024 * 1024) throw new Error("XML exceeds 25 MiB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("DTD and XML entities are not supported.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror"))
    throw new Error(
      "Invalid XML: " +
        doc.querySelector("parsererror")!.textContent?.slice(0, 180),
    );
  return doc;
}
const all = (el: Element | Document, name: string) =>
  Array.from(el.getElementsByTagNameNS("*", name));
const direct = (el: Element, name: string) =>
  Array.from(el.children).filter((c) => c.localName === name);
const attr = (el: Element | null | undefined, key: string, fallback = "") =>
  el?.getAttribute(key) || fallback;
const num = (el: Element | undefined, key: string, fallback: number) => {
  const n = Number(el?.getAttribute(key));
  return el?.hasAttribute(key) && Number.isFinite(n) ? n : fallback;
};
export function readBPMN(xml: string): Graph[] {
  const d = xmlDocument(xml);
  const shapes = new Map(
    all(d, "BPMNShape").map((s) => [attr(s, "bpmnElement"), s]),
  );
  const edges = new Map(
    all(d, "BPMNEdge").map((s) => [attr(s, "bpmnElement"), s]),
  );
  function parse(p: Element): Graph {
    const id = attr(p, "id");
    const participant = all(d, "participant").find(
      (e) => attr(e, "processRef") === id,
    );
    const g: Graph = {
      id,
      name: attr(participant, "name", attr(p, "name", id)),
      participant: participant ? attr(participant, "id") : undefined,
      nodes: [],
      flows: [],
      lanes: [],
    };
    const poolShape = participant
      ? shapes.get(attr(participant, "id"))
      : undefined;
    const pool = poolShape ? all(poolShape, "Bounds")[0] : undefined;
    if (pool) {
      g.width = num(pool, "width", 1300);
      g.height = num(pool, "height", 400);
    }
    const ls = direct(p, "laneSet")[0];
    if (ls)
      for (const l of direct(ls, "lane")) {
        const b = shapes
          .get(attr(l, "id"))
          ?.getElementsByTagNameNS("*", "Bounds")[0];
        g.lanes!.push({
          id: attr(l, "id"),
          name: attr(l, "name"),
          y: num(b, "y", 100),
          h: num(b, "height", 200),
        });
      }
    for (const e of Array.from(p.children)) {
      const type = e.localName;
      if (/Flow$|^association$|^conversationLink$/.test(type)) {
        const di = edges.get(attr(e, "id"));
        g.flows.push({
          id: attr(e, "id"),
          from: attr(e, "sourceRef"),
          to: attr(e, "targetRef"),
          name: attr(e, "name"),
          type,
          points: di
            ? all(di, "waypoint").map((w) => ({
                x: num(w, "x", 0),
                y: num(w, "y", 0),
              }))
            : undefined,
        });
        continue;
      }
      if (
        !/Task$|^task$|Event$|Gateway$|^subProcess$|^transaction$|^adHocSubProcess$|^choreographyTask$|^subChoreography$|^callChoreography$|^conversation$|^subConversation$|^callConversation$|^callActivity$|^dataObjectReference$|^dataStoreReference$|^textAnnotation$|^group$/.test(
          type,
        )
      )
        continue;
      const b = shapes
        .get(attr(e, "id"))
        ?.getElementsByTagNameNS("*", "Bounds")[0];
      const n: Node = {
        id: attr(e, "id"),
        type,
        name: attr(e, "name"),
        x: num(b, "x", 180 + g.nodes.length * 170),
        y: num(b, "y", 180),
        w: num(b, "width", 120),
        h: num(b, "height", 80),
        doc: direct(e, "documentation")
          .map((d) => d.textContent)
          .join("\n"),
      };
      if (ls)
        n.lane =
          all(ls, "lane")
            .find((l) =>
              direct(l, "flowNodeRef").some((r) => r.textContent === n.id),
            )
            ?.getAttribute("id") || undefined;
      n.event = Array.from(e.children).find((c) =>
        /EventDefinition$/.test(c.localName),
      )?.localName;
      if (
        [
          "subProcess",
          "transaction",
          "adHocSubProcess",
          "subChoreography",
        ].includes(type)
      )
        n.children = parse(e);
      n.attrs = Object.fromEntries(
        all(e, "property")
          .filter(
            (a) => a.namespaceURI === "https://elan-modeler.app/schema/1.0",
          )
          .map((a) => [attr(a, "name"), attr(a, "value")]),
      );
      g.nodes.push(n);
    }
    return g;
  }
  return [
    ...all(d, "process"),
    ...all(d, "choreography"),
    ...all(d, "collaboration").filter(
      (c) =>
        direct(c, "conversation").length ||
        direct(c, "subConversation").length ||
        direct(c, "callConversation").length,
    ),
  ].map(parse);
}
export function exportXPDL(xml: string) {
  assertProcessInterchange(xml);
  const graphs = readBPMN(xml);
  function activities(g: Graph): string {
    return `<Activities>${g.nodes
      .map((n) => {
        const b = bounds(n);
        let kind = "<Implementation><No/></Implementation>";
        if (n.type === "subProcess")
          kind = `<BlockActivity ActivitySetId="${esc(n.id)}_set"/>`;
        else if (/Task$/.test(n.type) || n.type === "task") {
          const type =
            (
              {
                userTask: "TaskUser",
                manualTask: "TaskManual",
                serviceTask: "TaskService",
                scriptTask: "TaskScript",
                sendTask: "TaskSend",
                receiveTask: "TaskReceive",
                businessRuleTask: "TaskBusinessRule",
              } as Record<string, string>
            )[n.type] || "Task";
          kind = `<Implementation><Task>${type === "Task" ? "" : `<${type}/>`}</Task></Implementation>`;
        } else if (/Gateway$/.test(n.type))
          kind = `<Route GatewayType="${n.type === "parallelGateway" ? "Parallel" : n.type === "inclusiveGateway" ? "Inclusive" : n.type === "eventBasedGateway" ? "Exclusive" : n.type === "complexGateway" ? "Complex" : "Exclusive"}"${n.type === "eventBasedGateway" ? ' ExclusiveType="Event"' : ""}/>`;
        else if (/Event$/.test(n.type)) {
          const en =
            n.type === "startEvent"
              ? "StartEvent"
              : n.type === "endEvent"
                ? "EndEvent"
                : "IntermediateEvent";
          kind = `<Event><${en} Trigger="${n.event?.replace("EventDefinition", "").replace(/^./, (c) => c.toUpperCase()) || "None"}"/></Event>`;
        }
        return `<Activity Id="${esc(n.id)}" Name="${esc(n.name)}">${n.doc ? `<Description>${esc(n.doc)}</Description>` : ""}${kind}<NodeGraphicsInfos><NodeGraphicsInfo Width="${b.width}" Height="${b.height}"${n.lane ? ` LaneId="${esc(n.lane)}"` : ""}><Coordinates XCoordinate="${b.x}" YCoordinate="${b.y}"/></NodeGraphicsInfo></NodeGraphicsInfos></Activity>`;
      })
      .join("")}</Activities><Transitions>${g.flows
      .filter((f) => !f.type || f.type === "sequenceFlow")
      .map(
        (f) =>
          `<Transition Id="${esc(f.id)}" From="${esc(f.from)}" To="${esc(f.to)}" Name="${esc(f.name || "")}">${f.points ? `<ConnectorGraphicsInfos><ConnectorGraphicsInfo>${f.points.map((p) => `<Coordinates XCoordinate="${p.x}" YCoordinate="${p.y}"/>`).join("")}</ConnectorGraphicsInfo></ConnectorGraphicsInfos>` : ""}</Transition>`,
      )
      .join("")}</Transitions>`;
  }
  function sets(g: Graph): string {
    return g.nodes
      .filter((n) => n.children)
      .map(
        (n) =>
          `<ActivitySet Id="${esc(n.id)}_set">${activities(n.children!)}</ActivitySet>${sets(n.children!)}`,
      )
      .join("");
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://www.wfmc.org/2009/XPDL2.2" Id="Package_Elan" Name="Élan Modeler"><PackageHeader><XPDLVersion>2.2</XPDLVersion><Vendor>Élan Modeler</Vendor><Created>${new Date().toISOString()}</Created></PackageHeader><Pools>${graphs
    .filter((g) => g.participant)
    .map(
      (g) =>
        `<Pool Id="${esc(g.participant)}" Name="${esc(g.name)}" Process="${esc(g.id)}" BoundaryVisible="true"><Lanes>${(g.lanes || []).map((l) => `<Lane Id="${esc(l.id)}" Name="${esc(l.name)}"><NodeGraphicsInfos><NodeGraphicsInfo Height="${l.h}" Width="${(g.width || 1300) - 30}"><Coordinates XCoordinate="130" YCoordinate="${l.y}"/></NodeGraphicsInfo></NodeGraphicsInfos></Lane>`).join("")}</Lanes><NodeGraphicsInfos><NodeGraphicsInfo Width="${g.width || 1300}" Height="${g.height || 400}"><Coordinates XCoordinate="100" YCoordinate="100"/></NodeGraphicsInfo></NodeGraphicsInfos></Pool>`,
    )
    .join(
      "",
    )}</Pools><WorkflowProcesses>${graphs.map((g) => `<WorkflowProcess Id="${esc(g.id)}" Name="${esc(g.name)}">${sets(g) ? `<ActivitySets>${sets(g)}</ActivitySets>` : ""}${activities(g)}</WorkflowProcess>`).join("")}</WorkflowProcesses></Package>`;
}
export function importXPDL(xml: string): { xml: string; warnings: string[] } {
  const d = xmlDocument(xml);
  if (d.documentElement.localName !== "Package")
    throw new Error("Not an XPDL package.");
  const warnings = new Set<string>();
  function parse(p: Element): Graph {
    const id = attr(p, "Id");
    const pool = all(d, "Pool").find((s) => attr(s, "Process") === id);
    const pg = pool ? all(pool, "NodeGraphicsInfo").at(-1) : undefined;
    const g: Graph = {
      id,
      name: attr(p, "Name", id),
      participant: pool ? attr(pool, "Id") : undefined,
      width: num(pg, "Width", 1300),
      height: num(pg, "Height", 400),
      nodes: [],
      flows: [],
      lanes: pool
        ? all(pool, "Lane").map((l) => {
            const b = all(l, "NodeGraphicsInfo")[0],
              c = all(l, "Coordinates")[0];
            return {
              id: attr(l, "Id"),
              name: attr(l, "Name"),
              y: num(c, "YCoordinate", 100),
              h: num(b, "Height", 200),
            };
          })
        : [],
    };
    const acts = direct(p, "Activities")[0];
    if (acts)
      for (const a of direct(acts, "Activity")) {
        const ev = all(a, "Event")[0],
          route = all(a, "Route")[0],
          block = all(a, "BlockActivity")[0],
          task = all(a, "Task")[0];
        let type = "task";
        let event: string | undefined;
        if (ev) {
          const e = ev.children[0];
          type =
            e?.localName === "StartEvent"
              ? "startEvent"
              : e?.localName === "EndEvent"
                ? "endEvent"
                : "intermediateCatchEvent";
          const trigger = attr(e, "Trigger", "None");
          if (trigger !== "None")
            event =
              trigger[0].toLowerCase() + trigger.slice(1) + "EventDefinition";
        } else if (route) {
          type =
            attr(route, "GatewayType") === "Parallel"
              ? "parallelGateway"
              : attr(route, "GatewayType") === "Inclusive"
                ? "inclusiveGateway"
                : attr(route, "GatewayType") === "Complex"
                  ? "complexGateway"
                  : attr(route, "ExclusiveType") === "Event"
                    ? "eventBasedGateway"
                    : "exclusiveGateway";
        } else if (block) type = "subProcess";
        else if (task) {
          const child = task.children[0]?.localName;
          type =
            (
              {
                TaskUser: "userTask",
                TaskManual: "manualTask",
                TaskService: "serviceTask",
                TaskScript: "scriptTask",
                TaskSend: "sendTask",
                TaskReceive: "receiveTask",
                TaskBusinessRule: "businessRuleTask",
              } as Record<string, string>
            )[child] || "task";
        } else if (all(a, "SubFlow").length) {
          type = "callActivity";
          warnings.add(
            "External XPDL SubFlow references require manual review.",
          );
        }
        const b = all(a, "NodeGraphicsInfo")[0],
          c = b ? all(b, "Coordinates")[0] : undefined;
        const n: Node = {
          id: attr(a, "Id"),
          type,
          name: attr(a, "Name"),
          x: num(c, "XCoordinate", 180 + g.nodes.length * 170),
          y: num(c, "YCoordinate", 180),
          w: num(
            b,
            "Width",
            /Event$/.test(type) ? 36 : /Gateway$/.test(type) ? 50 : 120,
          ),
          h: num(
            b,
            "Height",
            /Event$/.test(type) ? 36 : /Gateway$/.test(type) ? 50 : 80,
          ),
          lane: attr(b, "LaneId") || undefined,
          event,
          doc: direct(a, "Description")[0]?.textContent || "",
        };
        if (block) {
          const set = all(d, "ActivitySet").find(
            (s) => attr(s, "Id") === attr(block, "ActivitySetId"),
          );
          if (set) n.children = parse(set);
          else
            warnings.add(
              "Missing activity set: " + attr(block, "ActivitySetId"),
            );
        }
        if (!b)
          warnings.add(
            "Some elements have no coordinates; a simple fallback layout was applied.",
          );
        g.nodes.push(n);
      }
    const ts = direct(p, "Transitions")[0];
    if (ts)
      for (const t of direct(ts, "Transition")) {
        const pts = all(t, "Coordinates");
        g.flows.push({
          id: attr(t, "Id"),
          from: attr(t, "From"),
          to: attr(t, "To"),
          name: attr(t, "Name"),
          points: pts.length
            ? pts.map((c) => ({
                x: num(c, "XCoordinate", 0),
                y: num(c, "YCoordinate", 0),
              }))
            : undefined,
        });
      }
    return g;
  }
  const graphs = all(d, "WorkflowProcess").map(parse);
  if (!graphs.length) throw new Error("No XPDL WorkflowProcess found.");
  warnings.add(
    "XPDL adapter: review event details, vendor extensions, data artifacts and simulation parameters after conversion.",
  );
  return { xml: graphXML(graphs), warnings: [...warnings] };
}
export function exportVDX(xml: string) {
  assertProcessInterchange(xml);
  const graphs = readBPMN(xml);
  return `<?xml version="1.0" encoding="UTF-8"?><VisioDocument xmlns="urn:schemas-microsoft-com:office:visio"><DocumentProperties><Creator>Élan Modeler</Creator></DocumentProperties><Pages>${graphs
    .map((g, i) => {
      const ids = new Map(g.nodes.map((n, j) => [n.id, j + 1]));
      const pageH = 12;
      const shapes = g.nodes
        .map((n) => {
          const b = bounds(n);
          return `<Shape ID="${ids.get(n.id)}" NameU="${esc(n.type)}" Type="Shape"><XForm><PinX>${(b.x + b.width / 2) / 96}</PinX><PinY>${pageH - (b.y + b.height / 2) / 96}</PinY><Width>${b.width / 96}</Width><Height>${b.height / 96}</Height><LocPinX>${b.width / 192}</LocPinX><LocPinY>${b.height / 192}</LocPinY></XForm><Geom IX="0"><MoveTo IX="1"><X>0</X><Y>0</Y></MoveTo><LineTo IX="2"><X>${b.width / 96}</X><Y>0</Y></LineTo><LineTo IX="3"><X>${b.width / 96}</X><Y>${b.height / 96}</Y></LineTo><LineTo IX="4"><X>0</X><Y>${b.height / 96}</Y></LineTo><LineTo IX="5"><X>0</X><Y>0</Y></LineTo></Geom><Text>${esc(n.name)}</Text></Shape>`;
        })
        .join("");
      const flows = g.flows.filter((f) => ids.has(f.from) && ids.has(f.to));
      const connectors = flows
        .map((f, j) => {
          const a = bounds(g.nodes.find((n) => n.id === f.from)!),
            b = bounds(g.nodes.find((n) => n.id === f.to)!);
          return `<Shape ID="${g.nodes.length + j + 1}" NameU="Dynamic connector" Type="Shape"><XForm1D><BeginX>${(a.x + a.width) / 96}</BeginX><BeginY>${pageH - (a.y + a.height / 2) / 96}</BeginY><EndX>${b.x / 96}</EndX><EndY>${pageH - (b.y + b.height / 2) / 96}</EndY></XForm1D><Line><EndArrow>13</EndArrow></Line><Text>${esc(f.name || "")}</Text></Shape>`;
        })
        .join("");
      return `<Page ID="${i}" Name="${esc(g.name)}"><PageSheet><PageProps><PageWidth>18</PageWidth><PageHeight>${pageH}</PageHeight></PageProps></PageSheet><Shapes>${shapes}${connectors}</Shapes><Connects>${flows.map((f, j) => `<Connect FromSheet="${g.nodes.length + j + 1}" FromCell="BeginX" ToSheet="${ids.get(f.from)}" ToCell="PinX"/><Connect FromSheet="${g.nodes.length + j + 1}" FromCell="EndX" ToSheet="${ids.get(f.to)}" ToCell="PinX"/>`).join("")}</Connects></Page>`;
    })
    .join("")}</Pages></VisioDocument>`;
}
export async function importVisio(
  data: ArrayBuffer,
  name: string,
): Promise<{ xml: string; warnings: string[] }> {
  const warnings = [
    "Visio conversion is experimental. Stencils, groups, nested coordinates, lanes and BPMN event semantics need review.",
  ];
  let docs: Document[] = [];
  let masters = new Map<string, string>();
  if (/\.vsdx$/i.test(name)) {
    const zip = await JSZip.loadAsync(data);
    const files = Object.keys(zip.files).filter((n) =>
      /^visio\/pages\/page\d+\.xml$/.test(n),
    );
    if (files.length > 100) throw new Error("Maximum 100 Visio pages.");
    if (Object.keys(zip.files).length > 2000)
      throw new Error("Visio package has too many entries.");
    let totalSize = 0;
    for (const path of [...files, "visio/masters/masters.xml"]) {
      const entry = zip.file(path);
      if (!entry) continue;
      const size = (entry as any)._data?.uncompressedSize || 0;
      if (size > 10 * 1024 * 1024)
        throw new Error("Visio XML part exceeds 10 MiB.");
      totalSize += size;
    }
    if (totalSize > 50 * 1024 * 1024)
      throw new Error("Visio XML content exceeds 50 MiB.");
    const master = zip.file("visio/masters/masters.xml");
    if (master) {
      const d = xmlDocument(await master.async("string"));
      masters = new Map(
        all(d, "Master").map((m) => [attr(m, "ID"), attr(m, "NameU")]),
      );
    }
    for (const file of files) {
      const f = zip.file(file)!;
      const raw = await f.async("string");
      if (raw.length > 10 * 1024 * 1024)
        throw new Error("Visio page exceeds 10 MiB.");
      docs.push(xmlDocument(raw));
    }
  } else if (/\.vdx$/i.test(name)) {
    docs = [xmlDocument(new TextDecoder().decode(data))];
  } else
    throw new Error(
      "Binary .vsd is not supported. Export .vdx, .vsdx or BPMN from Visio.",
    );
  const graphs: Graph[] = [];
  for (const doc of docs) {
    const pages = all(doc, "Page");
    for (const page of pages.length ? pages : [doc.documentElement]) {
      const id = "Visio_" + graphs.length;
      const g: Graph = {
        id,
        name: attr(page, "Name", name),
        nodes: [],
        flows: [],
      };
      function val(s: Element, key: string, def: number) {
        const c = Array.from(s.children).find(
          (c) => c.localName === "Cell" && attr(c, "N") === key,
        );
        const old = all(s, key)[0];
        const n = Number(c?.getAttribute("V") ?? old?.textContent);
        return Number.isFinite(n) && (c || old) ? n : def;
      }
      const pageH = val(page, "PageHeight", 12);
      const connectors: Element[] = [];
      for (const s of all(page, "Shape")) {
        const key = attr(s, "ID");
        const master = masters.get(attr(s, "Master")) || "";
        const shapeName = (attr(s, "NameU") + " " + master).toLowerCase();
        if (
          all(s, "XForm1D").length ||
          Array.from(s.children).some((c) => attr(c, "N") === "BeginX") ||
          /connector|sequence flow|message flow/.test(shapeName)
        ) {
          connectors.push(s);
          continue;
        }
        const type = /start/.test(shapeName)
          ? "startEvent"
          : /end event|endevent/.test(shapeName)
            ? "endEvent"
            : /parallel/.test(shapeName)
              ? "parallelGateway"
              : /gateway|decision/.test(shapeName)
                ? "exclusiveGateway"
                : /subprocess|sub-process/.test(shapeName)
                  ? "subProcess"
                  : /usertask|user task/.test(shapeName)
                    ? "userTask"
                    : "task";
        const w = val(s, "Width", 1.25) * 96,
          h = val(s, "Height", 0.83) * 96;
        g.nodes.push({
          id: id + "_" + key,
          type,
          name: all(s, "Text")[0]?.textContent || attr(s, "Name", ""),
          x: val(s, "PinX", 2) * 96 - w / 2,
          y: (pageH - val(s, "PinY", 8)) * 96 - h / 2,
          w,
          h,
        });
      }
      for (const c of connectors) {
        const connects = all(page, "Connect").filter(
          (e) => attr(e, "FromSheet") === attr(c, "ID"),
        );
        const from = connects.find((e) =>
            attr(e, "FromCell").startsWith("Begin"),
          ),
          to = connects.find((e) => attr(e, "FromCell").startsWith("End"));
        if (from && to) {
          const f: Flow = {
            id: id + "_Flow_" + attr(c, "ID"),
            from: id + "_" + attr(from, "ToSheet"),
            to: id + "_" + attr(to, "ToSheet"),
            name: all(c, "Text")[0]?.textContent || "",
          };
          if (
            g.nodes.some((n) => n.id === f.from) &&
            g.nodes.some((n) => n.id === f.to)
          )
            g.flows.push(f);
        } else
          warnings.push("Disconnected connector omitted: " + attr(c, "ID"));
      }
      if (g.nodes.length) graphs.push(g);
    }
  }
  if (!graphs.length) throw new Error("No supported Visio shapes found.");
  return { xml: graphXML(graphs), warnings };
}
export function download(data: BlobPart, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function rasterize(svg: string, format = "png"): Promise<Blob> {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to rasterize diagram."));
      image.src = url;
    });
    const c = document.createElement("canvas");
    const scale = Math.min(2, 10000 / Math.max(image.width, image.height));
    c.width = Math.max(1, image.width * scale);
    c.height = Math.max(1, image.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(image, 0, 0, c.width, c.height);
    return await new Promise((resolve, reject) =>
      c.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image conversion failed"))),
        "image/" + format,
        0.95,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function assertProcessInterchange(xml: string) {
  const d = xmlDocument(xml);
  if (
    [
      "choreography",
      "conversation",
      "subConversation",
      "callConversation",
    ].some((t) => d.getElementsByTagNameNS("*", t).length)
  )
    throw new Error(
      "Choreography and conversation diagrams must be exchanged using BPMN XML. The experimental XPDL / VDX adapters cover process diagrams only.",
    );
}
