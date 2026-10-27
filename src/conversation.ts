import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";
const is = (e: any, type: string) =>
  !!(e?.businessObject || e)?.$instanceOf?.(type);
const conv = (e: any) => is(e, "bpmn:ConversationNode");
function svg(tag: string, attrs: Record<string, unknown> = {}) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}
class ConversationRenderer extends BaseRenderer {
  static $inject = ["eventBus"];
  constructor(eventBus: any) {
    super(eventBus, 1600);
  }
  canRender(e: any) {
    return (
      !e.labelTarget &&
      (conv(e) ||
        is(e, "bpmn:ConversationLink") ||
        e.businessObject?.$attrs?.["elan:kind"] === "milestone")
    );
  }
  drawShape(parent: SVGElement, e: any) {
    if (e.businessObject?.$attrs?.["elan:kind"] === "milestone") {
      const w = e.width,
        h = e.height;
      const border = svg("rect", {
        width: w,
        height: h,
        fill: "none",
        stroke: "#8a9b7b",
        "stroke-width": 1,
        "stroke-dasharray": "5,4",
      });
      parent.append(border);
      parent.append(
        svg("path", {
          d: `M0 0H${w - 14}L${w} 14L${w - 14} 28H0Z`,
          fill: "#f1f5e9",
          stroke: "#8a9b7b",
          "stroke-width": 1,
        }),
      );
      return border;
    }
    const w = e.width,
      h = e.height,
      p = `${w * 0.22},0 ${w * 0.78},0 ${w},${h / 2} ${w * 0.78},${h} ${w * 0.22},${h} 0,${h / 2}`;
    const poly = svg("polygon", {
      points: p,
      fill: e.di?.get("color:background-color") || "#fff",
      stroke: "#344b45",
      "stroke-width": is(e, "bpmn:CallConversation") ? 3.5 : 1.7,
    });
    parent.append(poly);
    const words = String(e.businessObject.name || "").split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > 15 && line) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    const tx = svg("text", {
      "text-anchor": "middle",
      "font-family": "Segoe UI, sans-serif",
      "font-size": 11,
      fill: "#344b45",
    });
    lines.slice(0, 3).forEach((line, i) => {
      const span = svg("tspan", {
        x: w / 2,
        y: h / 2 - (Math.min(lines.length, 3) - 1) * 7 + i * 14,
      });
      span.textContent = line;
      tx.append(span);
    });
    parent.append(tx);
    if (is(e, "bpmn:SubConversation")) {
      const square = svg("rect", {
        x: w / 2 - 6,
        y: h - 17,
        width: 12,
        height: 12,
        fill: "#fff",
        stroke: "#344b45",
      });
      parent.append(square);
      parent.append(
        svg("path", {
          d: `M${w / 2 - 4} ${h - 11}h8M${w / 2} ${h - 15}v8`,
          stroke: "#344b45",
          "stroke-width": 1,
        }),
      );
    }
    return poly;
  }
  drawConnection(parent: SVGElement, e: any) {
    const d = this.getConnectionPath(e),
      outer = svg("path", {
        d,
        fill: "none",
        stroke: "#344b45",
        "stroke-width": 4,
        "stroke-linejoin": "round",
      });
    parent.append(outer);
    parent.append(
      svg("path", {
        d,
        fill: "none",
        stroke: "#fff",
        "stroke-width": 2,
        "stroke-linejoin": "round",
      }),
    );
    return outer;
  }
  getShapePath(e: any) {
    const { x, y, width: w, height: h } = e;
    return `M${x + w * 0.22},${y}L${x + w * 0.78},${y}L${x + w},${y + h / 2}L${x + w * 0.78},${y + h}L${x + w * 0.22},${y + h}L${x},${y + h / 2}Z`;
  }
  getConnectionPath(e: any) {
    return e.waypoints
      .map((p: any, i: number) => `${i ? "L" : "M"}${p.x},${p.y}`)
      .join("");
  }
}
class ConversationRules extends RuleProvider {
  static $inject = ["eventBus"];
  init() {
    const io = (e: any) => is(e, "bpmn:DataInput") || is(e, "bpmn:DataOutput");
    const ioTarget = (e: any) =>
      is(e, "bpmn:Process") ||
      is(e, "bpmn:Activity") ||
      is(e, "bpmn:Lane") ||
      (is(e, "bpmn:Participant") && !!e.businessObject.processRef);
    this.addRule("shape.create", 2100, (c: any) => {
      if (io(c.shape)) return ioTarget(c.target);
    });
    this.addRule("elements.create", 2100, (c: any) => {
      if (c.elements?.every((e: any) => conv(e) || io(e)))
        return c.elements.every((e: any) =>
          conv(e)
            ? is(c.target, "bpmn:Collaboration") ||
              is(c.target, "bpmn:SubConversation")
            : ioTarget(c.target),
        );
    });
    this.addRule("shape.create", 2000, (c: any) => {
      if (conv(c.shape))
        return (
          is(c.target, "bpmn:Collaboration") ||
          is(c.target, "bpmn:SubConversation")
        );
    });
    this.addRule("elements.move", 2000, (c: any) => {
      if (c.shapes?.some(conv))
        return (
          is(c.target, "bpmn:Collaboration") ||
          is(c.target, "bpmn:SubConversation")
        );
    });
    this.addRule("shape.resize", 2000, (c: any) => {
      if (conv(c.shape)) return true;
    });
    this.addRule(
      ["connection.create", "connection.reconnect"],
      2000,
      (c: any) => {
        const a = c.source,
          b = c.target;
        if (conv(a) || conv(b) || is(c.connection, "bpmn:ConversationLink")) {
          if (!a || !b || a === b) return false;
          if (
            (conv(a) && (conv(b) || is(b, "bpmn:Participant"))) ||
            (conv(b) && is(a, "bpmn:Participant"))
          )
            return { type: "bpmn:ConversationLink" };
          return false;
        }
      },
    );
  }
}
function ConversationSupport(
  eventBus: any,
  bpmnjs: any,
  canvas: any,
  elementFactory: any,
  elementRegistry: any,
  bpmnUpdater: any,
  bpmnFactory: any,
) {
  const originalNeedsId = bpmnFactory._needsId.bind(bpmnFactory);
  bpmnFactory._needsId = (bo: any) =>
    originalNeedsId(bo) ||
    [
      "bpmn:ConversationNode",
      "bpmn:ConversationLink",
      "bpmn:DataInput",
      "bpmn:DataOutput",
      "bpmn:EventDefinition",
      "bpmn:InputOutputSpecification",
      "bpmn:InputSet",
      "bpmn:OutputSet",
    ].some((t) => bo.$instanceOf(t));
  const original = bpmnUpdater.updateSemanticParent.bind(bpmnUpdater);
  bpmnUpdater.updateSemanticParent = function (
    bo: any,
    parent: any,
    visual: any,
  ) {
    if (bo.$instanceOf("bpmn:DataInput") || bo.$instanceOf("bpmn:DataOutput")) {
      if (parent?.$instanceOf("bpmn:Participant")) parent = parent.processRef;
      while (
        parent?.$instanceOf("bpmn:Lane") ||
        parent?.$instanceOf("bpmn:LaneSet")
      )
        parent = parent.$parent;
      const input = bo.$instanceOf("bpmn:DataInput"),
        key = input ? "dataInputs" : "dataOutputs",
        setKey = input ? "inputSets" : "outputSets",
        refKey = input ? "dataInputRefs" : "dataOutputRefs";
      if (bo.$parent && bo.$parent === parent?.ioSpecification) return;
      if (bo.$parent) {
        const arr = bo.$parent.get(key);
        const idx = arr.indexOf(bo);
        if (idx >= 0) arr.splice(idx, 1);
        for (const set of bo.$parent.get(setKey)) {
          const refs = set.get(refKey);
          const i = refs.indexOf(bo);
          if (i >= 0) refs.splice(i, 1);
        }
      }
      if (parent) {
        if (!parent.ioSpecification) {
          parent.ioSpecification = bpmnFactory.create(
            "bpmn:InputOutputSpecification",
          );
          parent.ioSpecification.$parent = parent;
        }
        const spec = parent.ioSpecification;
        spec.get(key).push(bo);
        let set = spec.get(setKey)[0];
        if (!set) {
          set = bpmnFactory.create(input ? "bpmn:InputSet" : "bpmn:OutputSet");
          set.$parent = spec;
          spec.get(setKey).push(set);
        }
        set.get(refKey).push(bo);
        bo.$parent = spec;
      } else bo.$parent = undefined;
      return;
    }
    if (
      !bo.$instanceOf("bpmn:ConversationNode") &&
      !bo.$instanceOf("bpmn:ConversationLink")
    )
      return original(bo, parent, visual);
    if (parent?.$instanceOf("bpmn:Participant")) parent = parent.$parent;
    while (
      parent &&
      !parent.$instanceOf("bpmn:Collaboration") &&
      !parent.$instanceOf("bpmn:SubConversation")
    )
      parent = parent.$parent;
    const key = (p: any) =>
      bo.$instanceOf("bpmn:ConversationLink")
        ? "conversationLinks"
        : p?.$instanceOf("bpmn:SubConversation")
          ? "conversationNodes"
          : "conversations";
    if (bo.$parent === parent) return;
    if (bo.$parent) {
      const a = bo.$parent.get(key(bo.$parent));
      const i = a.indexOf(bo);
      if (i >= 0) a.splice(i, 1);
    }
    if (parent) {
      const a = parent.get(key(parent));
      if (!a.includes(bo)) a.push(bo);
    }
    bo.$parent = parent;
  };
  eventBus.on("import.done", 1800, () => {
    const defs = bpmnjs.getDefinitions();
    if (!defs) return;
    for (const root of canvas.getRootElements()) {
      const collab = root.businessObject;
      if (!collab?.$instanceOf("bpmn:Collaboration")) continue;
      const planes = defs.diagrams
        .filter((d: any) => d.plane.bpmnElement === collab)
        .map((d: any) => d.plane);
      const dis = planes.flatMap((p: any) => p.planeElement || []);
      const add = (node: any, parent: any) => {
        const di = dis.find((d: any) => d.bpmnElement === node);
        if (!di || elementRegistry.get(node.id)) return;
        const b = di.bounds;
        const shape = elementFactory.createShape({
          type: node.$type,
          businessObject: node,
          di,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        });
        canvas.addShape(shape, parent);
        for (const child of node.conversationNodes || []) add(child, shape);
      };
      for (const node of collab.conversations || []) add(node, root);
      for (const link of collab.conversationLinks || []) {
        const di = dis.find((d: any) => d.bpmnElement === link),
          source = elementRegistry.get(link.sourceRef?.id),
          target = elementRegistry.get(link.targetRef?.id);
        if (di && source && target && !elementRegistry.get(link.id)) {
          const edge = elementFactory.createConnection({
            type: link.$type,
            businessObject: link,
            di,
            source,
            target,
            waypoints: di.waypoint.map((p: any) => ({ x: p.x, y: p.y })),
          });
          canvas.addConnection(edge, root);
        }
      }
    }
  });
  eventBus.on("commandStack.changed", 1800, () => {
    const defs = bpmnjs.getDefinitions();
    for (const root of defs?.rootElements || []) {
      if (!root.$instanceOf("bpmn:Collaboration")) continue;
      const collect = (nodes: any[]) => {
        for (const node of nodes || []) {
          const participants = new Set<any>();
          for (const link of root.conversationLinks || []) {
            if (
              link.sourceRef === node &&
              link.targetRef?.$instanceOf("bpmn:Participant")
            )
              participants.add(link.targetRef);
            if (
              link.targetRef === node &&
              link.sourceRef?.$instanceOf("bpmn:Participant")
            )
              participants.add(link.sourceRef);
          }
          node.participantRef = [
            ...new Set([...(node.participantRef || []), ...participants]),
          ];
          collect(node.conversationNodes);
        }
      };
      collect(root.conversations);
    }
  });
}
ConversationSupport.$inject = [
  "eventBus",
  "bpmnjs",
  "canvas",
  "elementFactory",
  "elementRegistry",
  "bpmnUpdater",
  "bpmnFactory",
];
export default {
  __init__: [
    "conversationRenderer",
    "conversationRules",
    "conversationSupport",
  ],
  conversationRenderer: ["type", ConversationRenderer],
  conversationRules: ["type", ConversationRules],
  conversationSupport: ["type", ConversationSupport],
};
