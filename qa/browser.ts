import HybridModeler from "../src/HybridModeler";
import { catalog, createCatalogShape } from "../src/catalog";
import {
  graphXML,
  blankGraph,
  elanDescriptor,
  recruitment,
} from "../src/model";
import { exportWord, exportExcel, exportPDF } from "../src/reports";
import { conversationXML, choreographyXML } from "../src/special-models";
import { setEventVariant } from "../src/SemanticEditor";
import { download } from "../src/interchange";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
const output = document.querySelector("#results")!;
const fixtures = document.createElement("button");
fixtures.textContent = "Generate publication fixtures";
document.body.insertBefore(fixtures, output);
fixtures.addEventListener("click", async () => {
  fixtures.disabled = true;
  const host = document.createElement("div");
  host.style.cssText = "width:1200px;height:600px";
  document.body.append(host);
  const modeler = new HybridModeler({
    container: host,
    moddleExtensions: { elan: elanDescriptor },
  });
  const pending: Promise<void>[] = [];
  const save = (data: BlobPart, name: string, type = "text/plain") => {
    pending.push(
      new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const block = document.createElement("details");
          const heading = document.createElement("summary");
          heading.textContent = name;
          const content = document.createElement("pre");
          content.setAttribute("data-artifact", name);
          content.textContent = String(reader.result);
          block.append(heading, content);
          document.body.append(block);
          resolve();
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([data], { type }));
      }),
    );
  };
  try {
    const xml = graphXML([recruitment()]);
    await modeler.importXML(xml);
    const { svg } = await modeler.saveSVG();
    await exportPDF(xml, svg, "Recrutamento e seleção", "pt-BR", save);
    await exportWord(xml, svg, "Recrutamento e seleção", "pt-BR", save);
    await exportExcel(xml, "Recrutamento e seleção", "pt-BR", save);
    await Promise.all(pending);
    output.textContent =
      "3 publication fixtures generated using the production generators.";
  } catch (e) {
    output.textContent = "Publication fixture failed: " + String(e);
  } finally {
    modeler.destroy();
    host.remove();
    fixtures.disabled = false;
  }
});
let log: string[] = [];
document.querySelector("#run")!.addEventListener("click", async () => {
  const button = document.querySelector("#run") as HTMLButtonElement;
  button.disabled = true;
  log = [];
  const errors: string[] = [],
    checks: string[] = [];
  let m: any;
  const record = (name: string, fn: () => unknown | Promise<unknown>) =>
    Promise.resolve()
      .then(fn)
      .then(() => {
        checks.push(name);
        log.push("PASS " + name);
        output.textContent = log.join("\n");
      })
      .catch((e) => {
        errors.push(name + ": " + String(e));
        log.push("FAIL " + name + ": " + String(e));
        output.textContent = log.join("\n");
      });
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const blank = graphXML([blankGraph("Integration test")]);
  try {
    m = new HybridModeler({
      container: document.querySelector("#canvas"),
      additionalModules: [],
      moddleExtensions: { elan: elanDescriptor },
    });
    for (const [group, items] of Object.entries(catalog))
      for (const item of items.filter((i) => !i.connection))
        await record(group + "/" + item.id, async () => {
          await m.importXML(blank);
          const c = m.get("canvas"),
            root = c.getRootElement(),
            pool = m
              .get("elementRegistry")
              .getAll()
              .find((e: any) => e.type === "bpmn:Participant");
          const shape = createCatalogShape(m, item);
          let target =
            group === "conversation" ||
            item.type === "bpmn:Group" ||
            item.type === "bpmn:TextAnnotation"
              ? root
              : pool;
          let hints: any;
          if (item.hint === "event-subprocess") {
            const sub = createCatalogShape(
              m,
              catalog.subprocess.find((i) => i.id === "eventSub")!,
            );
            m.get("modeling").createShape(sub, { x: 500, y: 300 }, pool);
            target = sub;
          }
          if (group === "boundary") {
            const host = createCatalogShape(
              m,
              item.event?.includes("Cancel")
                ? catalog.subprocess.find((i) => i.type === "bpmn:Transaction")!
                : catalog.task[1],
            );
            m.get("modeling").createShape(host, { x: 400, y: 300 }, pool);
            target = host;
            hints = { attach: true };
          }
          const position =
            group === "boundary"
              ? { x: target.x + target.width / 2, y: target.y + target.height }
              : { x: 450, y: 300 };
          const allowed = m
            .get("rules")
            .allowed(group === "boundary" ? "shape.attach" : "shape.create", {
              shape,
              target,
              position,
              source: undefined,
            });
          assert(allowed !== false, "Creation rejected by BPMN modeling rules");
          m.get("modeling").createShape(shape, position, target, hints);
          const before = m.get("elementRegistry").get(shape.id);
          assert(before, "Shape not registered");
          const exported = await m.saveXML({ format: true });
          assert(
            exported.xml.includes(shape.id),
            "Element missing from exported XML",
          );
          await m.importXML(exported.xml);
          const restored = m.get("elementRegistry").get(shape.id);
          assert(restored, "Shape missing after reimport");
          assert(
            restored.businessObject.$type === item.type,
            "Element type changed",
          );
          if (item.events)
            assert(
              restored.businessObject.eventDefinitions.length ===
                item.events.length,
              "Multiple event definitions lost",
            );
          if (item.props?.parallelMultiple)
            assert(
              restored.businessObject.parallelMultiple === true,
              "Parallel multiple marker lost",
            );
          if (item.props?.instantiate)
            assert(
              restored.businessObject.instantiate === true,
              "Instantiating gateway marker lost",
            );
          if (item.props?.cancelActivity === false)
            assert(
              restored.businessObject.cancelActivity === false,
              "Boundary event became interrupting",
            );
        });
    for (const item of catalog.connections)
      await record("connections/" + item.id, async () => {
        await m.importXML(blank);
        const root = m.get("canvas").getRootElement(),
          pool = m
            .get("elementRegistry")
            .getAll()
            .find((e: any) => e.type === "bpmn:Participant");
        let a: any, b: any;
        const modeling = m.get("modeling");
        if (item.connection === "bpmn:MessageFlow") {
          a = pool;
          b = m
            .get("elementFactory")
            .createParticipantShape({ isExpanded: false });
          modeling.createShape(b, { x: 550, y: 650 }, root);
        } else if (item.connection === "bpmn:ConversationLink") {
          a = pool;
          b = createCatalogShape(m, catalog.conversation[0]);
          modeling.createShape(b, { x: 600, y: 650 }, root);
        } else {
          a = createCatalogShape(
            m,
            item.connection === "bpmn:DataInputAssociation"
              ? catalog.data[0]
              : catalog.task[1],
          );
          b = createCatalogShape(
            m,
            item.connection === "bpmn:DataOutputAssociation"
              ? catalog.data[0]
              : catalog.task[1],
          );
          modeling.createShape(a, { x: 350, y: 250 }, pool);
          modeling.createShape(b, { x: 650, y: 250 }, pool);
        }
        const flow = m.get("elanConnectionTool").connect(a, b, item.connection);
        const { xml } = await m.saveXML({ format: true });
        await m.importXML(xml);
        const restored = m.get("elementRegistry").get(flow.id);
        assert(restored, "Connection lost after reimport");
        assert(
          restored.businessObject.$type === item.type,
          "Connection type changed",
        );
      });
    await record("Advanced event properties / timer round trip", async () => {
      await m.importXML(blank);
      const pool = m
        .get("elementRegistry")
        .getAll()
        .find((e: any) => e.type === "bpmn:Participant");
      const shape = createCatalogShape(m, catalog.start[0]);
      m.get("modeling").createShape(shape, { x: 400, y: 250 }, pool);
      setEventVariant(m, shape, catalog.start[1]);
      const def = shape.businessObject.eventDefinitions[0];
      m.get("modeling").updateModdleProperties(shape, def, {
        timeDuration: m
          .get("bpmnFactory")
          .create("bpmn:FormalExpression", { body: "PT30M" }),
      });
      const { xml } = await m.saveXML({ format: true });
      await m.importXML(xml);
      assert(
        m.get("elementRegistry").get(shape.id).businessObject
          .eventDefinitions[0].timeDuration.body === "PT30M",
        "Timer duration lost",
      );
    });
    await record(
      "Conversation / shapes, links, editing, undo and reimport",
      async () => {
        const result = await m.importXML(
          conversationXML("Conversation integration"),
        );
        assert(!result.warnings.length, "Conversation import has warnings");
        const registry = m.get("elementRegistry"),
          node = registry
            .getAll()
            .find((e: any) => e.type === "bpmn:Conversation");
        assert(node, "Conversation hexagon missing");
        assert(
          registry
            .getAll()
            .filter((e: any) => e.type === "bpmn:ConversationLink").length ===
            2,
          "Conversation links missing",
        );
        m.get("modeling").updateProperties(node, {
          name: "Updated conversation",
        });
        m.get("commandStack").undo();
        assert(
          node.businessObject.name !== "Updated conversation",
          "Undo failed",
        );
        m.get("commandStack").redo();
        const { xml } = await m.saveXML({ format: true });
        await m.importXML(xml);
        assert(
          m.get("elementRegistry").get(node.id).businessObject.name ===
            "Updated conversation",
          "Conversation edit lost",
        );
      },
    );
    await record("Choreography / rendering and round trip", async () => {
      const result = await m.importXML(
        choreographyXML("Choreography integration"),
      );
      assert(!result.warnings.length, "Choreography import has warnings");
      const task = m
        .get("elementRegistry")
        .getAll()
        .find((e: any) => e.type === "bpmn:ChoreographyTask");
      assert(task, "Choreography task missing");
      assert(
        task.businessObject.participantRef.length === 2,
        "Participant bands missing",
      );
      const { xml } = await m.saveXML({ format: true });
      await m.importXML(xml);
      assert(
        m.get("elementRegistry").get(task.id),
        "Choreography task lost after reimport",
      );
    });
    await record("Switch back from choreography to process", async () => {
      await m.importXML(blank);
      assert(m.kind === "process", "Process editor not restored");
      assert(
        m.get("canvas").getRootElement().businessObject.$type ===
          "bpmn:Collaboration",
        "Wrong process root",
      );
    });
    const result = {
      passed: checks.length,
      failed: errors.length,
      checks,
      errors,
      created: new Date().toISOString(),
    };
    output.textContent =
      `${checks.length} passed · ${errors.length} failed\n\n` + log.join("\n");
    const reportBlock = document.createElement("details");
    const reportTitle = document.createElement("summary");
    reportTitle.textContent = "Integration report JSON";
    const reportContent = document.createElement("pre");
    reportContent.id = "report-json";
    reportContent.textContent = JSON.stringify(result, null, 2);
    reportBlock.append(reportTitle, reportContent);
    document.body.insertBefore(reportBlock, document.querySelector("#canvas"));
    const downloadButton = document.createElement("button");
    downloadButton.textContent = "Download integration report";
    downloadButton.addEventListener("click", () =>
      download(
        JSON.stringify(result, null, 2),
        "browser-integration.json",
        "application/json",
      ),
    );
    document.body.insertBefore(
      downloadButton,
      document.querySelector("#canvas"),
    );
  } catch (e) {
    output.textContent += "\nFATAL " + String(e);
  } finally {
    button.disabled = false;
  }
});
