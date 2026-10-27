// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { graphXML, recruitment, blankGraph, elanDescriptor } from "./model";
import {
  readBPMN,
  xmlDocument,
  exportXPDL,
  importXPDL,
  exportVDX,
  importVisio,
} from "./interchange";
import { validateXML } from "./validation";
import { parseProject, initialProject } from "./storage";
import { BpmnModdle } from "bpmn-moddle";
describe("BPMN interchange", () => {
  it("opens the recruitment collaboration and nested subprocess with the BPMN metamodel", async () => {
    const { rootElement, warnings } = await new BpmnModdle({
      elan: elanDescriptor,
    }).fromXML(graphXML([recruitment()]));
    expect(warnings).toEqual([]);
    expect(rootElement.rootElements).toHaveLength(2);
    const process = rootElement.rootElements.find(
      (r: any) => r.$type === "bpmn:Process",
    );
    expect(process.laneSets[0].lanes).toHaveLength(2);
    const sub = process.flowElements.find(
      (e: any) => e.$type === "bpmn:SubProcess",
    );
    expect(
      sub.flowElements.filter((e: any) => e.$type === "bpmn:ParallelGateway"),
    ).toHaveLength(2);
    expect(
      rootElement.diagrams.map((d: any) => d.plane.bpmnElement.id),
    ).toContain("Onboarding");
  });
  it("retains custom attributes and escapes XML control characters", async () => {
    const g = recruitment();
    g.nodes[1].name = 'A&B <review> "quote"';
    g.nodes[1].attrs = { owner: "R&D", policy: "A < B" };
    const xml = graphXML([g]);
    const read = readBPMN(xml)[0];
    expect(read.nodes[1].name).toBe(g.nodes[1].name);
    expect(read.nodes[1].attrs).toEqual(g.nodes[1].attrs);
    const { warnings } = await new BpmnModdle({ elan: elanDescriptor }).fromXML(
      xml,
    );
    expect(warnings).toEqual([]);
  });
  it("rejects malformed and entity-bearing XML", () => {
    expect(() => xmlDocument("<definitions><broken></definitions>")).toThrow(
      "Invalid XML",
    );
    expect(() =>
      xmlDocument(
        '<!DOCTYPE root [<!ENTITY x SYSTEM "file:///c:/private">]><root>&x;</root>',
      ),
    ).toThrow("DTD");
  });
  it("parses BPMN without a participant diagram without throwing", () => {
    const g = blankGraph("empty");
    g.participant = undefined;
    expect(readBPMN(graphXML([g]))[0].name).toBe("empty");
  });
});
describe("XPDL conversion", () => {
  it("round-trips lane assignment, task kinds, gateway branches and nested activities", () => {
    const source = recruitment();
    const result = importXPDL(exportXPDL(graphXML([source])));
    const g = readBPMN(result.xml)[0];
    expect(g.nodes.map((n) => [n.id, n.type, n.lane])).toEqual(
      source.nodes.map((n) => [n.id, n.type, n.lane]),
    );
    expect(g.flows.map((f) => [f.id, f.from, f.to, f.name || ""])).toEqual(
      source.flows.map((f) => [f.id, f.from, f.to, f.name || ""]),
    );
    expect(
      g.nodes.find((n) => n.id === "Onboarding")!.children!.nodes,
    ).toHaveLength(9);
    expect(g.lanes?.map((l) => l.name)).toEqual(
      source.lanes?.map((l) => l.name),
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("imports XPDL 2.1 with fallback coordinates", () => {
    const xml =
      '<Package xmlns="http://www.wfmc.org/2008/XPDL2.1"><WorkflowProcesses><WorkflowProcess Id="P" Name="Example"><Activities><Activity Id="A" Name="Begin"><Event><StartEvent Trigger="None"/></Event></Activity><Activity Id="B" Name="End"><Event><EndEvent Trigger="None"/></Event></Activity></Activities><Transitions><Transition Id="F" From="A" To="B"/></Transitions></WorkflowProcess></WorkflowProcesses></Package>';
    const r = importXPDL(xml);
    expect(readBPMN(r.xml)[0].nodes[0].type).toBe("startEvent");
    expect(r.warnings.join(" ")).toContain("coordinates");
  });
  it("rejects non-XPDL documents", () => {
    expect(() => importXPDL("<Package/>")).toThrow("WorkflowProcess");
    expect(() => importXPDL("<definitions/>")).toThrow("XPDL");
  });
});
describe("Visio adapters", () => {
  it("round-trips generic VDX shapes and connected flows without claiming BPMN stencil fidelity", async () => {
    const raw = exportVDX(graphXML([recruitment()]));
    const r = await importVisio(
      new TextEncoder().encode(raw).buffer as ArrayBuffer,
      "sample.vdx",
    );
    const g = readBPMN(r.xml)[0];
    expect(g.nodes).toHaveLength(10);
    expect(g.flows).toHaveLength(10);
    expect(r.warnings[0]).toContain("experimental");
  });
  it("reads an OPC VSDX page and its master mapping", async () => {
    const zip = new JSZip();
    zip.file(
      "visio/masters/masters.xml",
      '<Masters xmlns="http://schemas.microsoft.com/office/visio/2012/main"><Master ID="1" NameU="Start Event"/></Masters>',
    );
    zip.file(
      "visio/pages/page1.xml",
      '<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main"><Shapes><Shape ID="1" Master="1"><Cell N="PinX" V="2"/><Cell N="PinY" V="5"/><Cell N="Width" V="0.5"/><Cell N="Height" V="0.5"/><Text>Start</Text></Shape></Shapes></PageContents>',
    );
    const r = await importVisio(
      await zip.generateAsync({ type: "arraybuffer" }),
      "example.vsdx",
    );
    expect(readBPMN(r.xml)[0].nodes[0].type).toBe("startEvent");
  });
  it("rejects binary VSD", async () => {
    await expect(importVisio(new ArrayBuffer(1), "model.vsd")).rejects.toThrow(
      "Binary .vsd",
    );
  });
});
describe("validation and persistence", () => {
  it("accepts the complete recruitment example including the nested parallel split and join", () => {
    expect(validateXML(graphXML([recruitment()]))).toEqual([]);
  });
  it("detects unreachable nodes and disconnected branches", () => {
    const g = recruitment();
    g.flows = g.flows.filter((f) => f.to !== "Staffing");
    const codes = validateXML(graphXML([g])).map((i) => i.code);
    expect(codes).toContain("unreachable");
    expect(codes).toContain("no-incoming");
  });
  it("detects a sequence flow into a start event", () => {
    const g = recruitment();
    g.flows.push({ id: "invalid", from: "End", to: "Start" });
    expect(validateXML(graphXML([g])).map((i) => i.code)).toContain(
      "start-incoming",
    );
  });
  it("rejects corrupt projects and duplicate diagram IDs", () => {
    expect(() => parseProject('{"format":"elan-model"}')).toThrow();
    const p = initialProject();
    p.diagrams.push({ ...p.diagrams[0] });
    expect(() => parseProject(JSON.stringify(p))).toThrow("Invalid diagram");
  });
  it("round-trips the model with comments", () => {
    const p = initialProject();
    p.comments.push({
      id: "c1",
      diagramId: p.activeId,
      elementId: "Staffing",
      author: "QA",
      text: "Review",
      created: new Date().toISOString(),
      resolved: false,
    });
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
});
