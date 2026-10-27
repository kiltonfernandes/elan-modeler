class ConnectionTool {
  static $inject = [
    "eventBus",
    "bpmnRules",
    "rules",
    "canvas",
    "elementFactory",
    "modeling",
    "selection",
    "bpmnFactory",
  ];
  mode = "";
  source: any;
  lang = "pt-BR";
  notify: (s: string) => void = () => {};
  constructor(
    private eventBus: any,
    private bpmnRules: any,
    private rules: any,
    private canvas: any,
    private factory: any,
    private modeling: any,
    private selection: any,
    private bpmnFactory: any,
  ) {
    eventBus.on("element.click", 2500, (e: any) => {
      if (!this.mode || e.element.labelTarget) return;
      const el = e.element;
      if (!this.source) {
        this.source = el;
        canvas.addMarker(el, "elan-connect-source");
        selection.select(el);
        this.notify(
          this.lang === "en"
            ? "Choose the target element."
            : "Escolha o elemento de destino.",
        );
        return false;
      }
      try {
        const mode = this.mode,
          source = this.source;
        this.cancel();
        const connection = this.connect(source, el, mode);
        selection.select(connection);
      } catch (err) {
        this.notify(String(err));
      }
      return false;
    });
    eventBus.on("import.parse.start", () => this.cancel());
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.cancel();
    };
    document.addEventListener("keydown", key);
    eventBus.on("diagram.destroy", () =>
      document.removeEventListener("keydown", key),
    );
  }
  configure(lang: string, notify: (s: string) => void) {
    this.lang = lang;
    this.notify = notify;
  }
  start(mode: string) {
    this.cancel();
    this.mode = mode;
    this.notify(
      this.lang === "en"
        ? "Choose the source element, then the target. Esc cancels."
        : "Escolha a origem e depois o destino. Esc cancela.",
    );
  }
  cancel() {
    if (this.source)
      this.canvas.removeMarker(this.source, "elan-connect-source");
    this.source = null;
    this.mode = "";
  }
  connect(source: any, target: any, mode: string) {
    const special = ["conditional", "default"].includes(mode),
      type = special ? "bpmn:SequenceFlow" : mode;
    if (
      source === target ||
      this.canvas.findRoot(source) !== this.canvas.findRoot(target)
    )
      throw new Error(
        this.lang === "en"
          ? "Choose two different elements in the same diagram."
          : "Escolha dois elementos diferentes no mesmo diagrama.",
      );
    const attrs: any = { type };
    if (type === "bpmn:Association") attrs.associationDirection = "None";
    if (mode === "associationOne") {
      attrs.type = "bpmn:Association";
      attrs.associationDirection = "One";
    }
    if (mode === "associationBoth") {
      attrs.type = "bpmn:Association";
      attrs.associationDirection = "Both";
    }
    const candidate = this.factory.createConnection(attrs);
    const allowed =
      type === "bpmn:ConversationLink"
        ? this.rules.allowed("connection.create", {
            source,
            target,
            connection: candidate,
          })
        : this.bpmnRules.canConnect(source, target, candidate);
    if (!allowed)
      throw new Error(
        this.lang === "en"
          ? "This connection is not valid between these BPMN elements."
          : "Esta conexão não é válida entre esses elementos BPMN.",
      );
    if (
      special &&
      !source.businessObject.$instanceOf("bpmn:Activity") &&
      ![
        "bpmn:ExclusiveGateway",
        "bpmn:InclusiveGateway",
        "bpmn:ComplexGateway",
      ].includes(source.type)
    )
      throw new Error(
        this.lang === "en"
          ? "Default and conditional flows require an activity or a supported decision gateway as source."
          : "Fluxos padrão e condicionais exigem uma atividade ou gateway de decisão compatível na origem.",
      );
    const conn = this.modeling.connect(source, target, attrs);
    if (mode === "default")
      this.modeling.updateProperties(source, { default: conn.businessObject });
    if (mode === "conditional") {
      const moddle = this.bpmnFactory;
      this.modeling.updateProperties(conn, {
        conditionExpression: moddle.create("bpmn:FormalExpression", {
          body: "condition",
        }),
      });
    }
    return conn;
  }
}
export default {
  __init__: ["elanConnectionTool"],
  elanConnectionTool: ["type", ConnectionTool],
};
