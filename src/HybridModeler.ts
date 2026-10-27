import Modeler from "bpmn-js/lib/Modeler";
import TokenSimulation from "bpmn-js-token-simulation";
import choreographyScript from "chor-js/dist/chor-js-modeler.min.js?url";
import choreographyStyle from "chor-js/dist/assets/chor-js.css?inline";
import ConversationModule from "./conversation";
import ConnectionModule from "./connections";
let loading: Promise<any> | undefined;
async function choreographyConstructor() {
  if (!loading)
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = choreographyScript;
      script.onload = () => resolve((window as any).ChorJS);
      script.onerror = () =>
        reject(new Error("Unable to load the choreography editor."));
      document.head.append(script);
    });
  return loading;
}
export default class HybridModeler {
  options: any;
  engine: any;
  kind = "process";
  listeners: { event: string; priority: number; callback: (e: any) => void }[] =
    [];
  style?: HTMLStyleElement;
  constructor(options: any) {
    this.options = { additionalModules: [], ...options };
    this.engine = this.create(Modeler, "process");
  }
  create(Constructor: any, kind: string) {
    const opts = {
      ...this.options,
      additionalModules:
        kind === "process"
          ? [
              ...this.options.additionalModules,
              ConversationModule,
              ConnectionModule,
            ]
          : this.options.additionalModules.filter(
              (m: any) => m !== TokenSimulation,
            ),
    };
    const engine = new Constructor(opts);
    for (const event of [
      "palette.changed",
      "contextPad.open",
      "popupMenu.open",
    ])
      engine.on(event, () => queueMicrotask(() => this.localize()));
    return engine;
  }
  on(event: string, priority: any, callback?: any) {
    const listener = {
      event,
      priority: typeof priority === "number" ? priority : 1000,
      callback: callback || priority,
    };
    this.listeners.push(listener);
    if (event !== "engine.changed")
      this.engine.on(event, listener.priority, listener.callback);
  }
  get(name: string, strict = true): any {
    if (this.kind === "choreography" && name === "toggleMode")
      return { toggleMode: () => {}, _active: false };
    const value = this.engine.get(name, strict);
    if (name === "canvas" && !value.getRootElements) {
      value.getRootElements = () => {
        const root = value.getRootElement();
        return root ? [root] : [];
      };
      value.findRoot = (element: any) => {
        let e =
          typeof element === "string"
            ? this.engine.get("elementRegistry").get(element)
            : element;
        while (e?.parent) e = e.parent;
        return e || value.getRootElement();
      };
    }
    return value;
  }
  async importXML(xml: string) {
    const doc = new DOMParser().parseFromString(xml, "application/xml"),
      plane = doc.getElementsByTagNameNS("*", "BPMNPlane")[0],
      rootId = plane?.getAttribute("bpmnElement");
    const choreos = Array.from(doc.getElementsByTagNameNS("*", "choreography"));
    const kind = choreos.some((e) => e.getAttribute("id") === rootId)
      ? "choreography"
      : "process";
    if (kind !== this.kind) {
      const C =
        kind === "choreography" ? await choreographyConstructor() : Modeler;
      this.engine.destroy();
      if (this.style) {
        this.style.remove();
        this.style = undefined;
      }
      if (kind === "choreography") {
        this.style = document.createElement("style");
        this.style.textContent = choreographyStyle;
        document.head.append(this.style);
      }
      this.kind = kind;
      this.engine = this.create(C, kind);
      for (const l of this.listeners)
        if (l.event !== "engine.changed")
          this.engine.on(l.event, l.priority, l.callback);
      for (const l of this.listeners)
        if (l.event === "engine.changed") l.callback({ kind });
    }
    const result = await this.engine.importXML(xml);
    this.localize();
    return result;
  }
  localize() {
    if (!this.engine) return;
    const translate = this.engine.get("translate");
    const container =
      typeof this.options.container === "string"
        ? document.querySelector(this.options.container)
        : this.options.container;
    for (const el of container?.querySelectorAll("[title]") || []) {
      const title = el.getAttribute("title");
      if (title) {
        const original = el.getAttribute("data-elan-original-title") || title;
        el.setAttribute("data-elan-original-title", original);
        el.setAttribute("title", translate(original));
      }
    }
  }
  saveXML(options: any) {
    return this.engine.saveXML(options);
  }
  saveSVG(options?: any) {
    return this.engine.saveSVG(options);
  }
  getDefinitions() {
    return this.engine.getDefinitions();
  }
  destroy() {
    this.engine.destroy();
    this.style?.remove();
  }
}
