import { readBPMN, xmlDocument } from "./interchange";
import type { Graph } from "./model";
export type Issue = {
  id: string;
  severity: "error" | "warning";
  code: string;
  pt: string;
  en: string;
};
export function validateXML(xml: string): Issue[] {
  const result: Issue[] = [];
  function check(g: Graph) {
    const nodes = new Set(g.nodes.map((n) => n.id));
    const flows = g.flows.filter((f) => !f.type || f.type === "sequenceFlow");
    const add = (
      id: string,
      severity: "error" | "warning",
      code: string,
      pt: string,
      en: string,
    ) => result.push({ id, severity, code, pt, en });
    const starts = g.nodes.filter((n) => n.type === "startEvent");
    if (g.nodes.length && !starts.length)
      add(
        g.id,
        "warning",
        "missing-start",
        "O processo não contém evento inicial.",
        "The process has no start event.",
      );
    if (g.nodes.length && !g.nodes.some((n) => n.type === "endEvent"))
      add(
        g.id,
        "warning",
        "missing-end",
        "O processo não contém evento final.",
        "The process has no end event.",
      );
    for (const f of flows)
      if (!nodes.has(f.from) || !nodes.has(f.to))
        add(
          f.id,
          "error",
          "dangling",
          "Conexão com referência inexistente.",
          "Connection references a missing element.",
        );
    const reachable = new Set<string>();
    const stack = starts.map((n) => n.id);
    while (stack.length) {
      const id = stack.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      stack.push(...flows.filter((f) => f.from === id).map((f) => f.to));
    }
    for (const n of g.nodes) {
      if (/dataObject|dataStore|textAnnotation|group/i.test(n.type)) continue;
      const incoming = flows.filter((f) => f.to === n.id),
        outgoing = flows.filter((f) => f.from === n.id);
      if (n.type === "startEvent" && incoming.length)
        add(
          n.id,
          "error",
          "start-incoming",
          "Evento inicial não pode receber fluxo de sequência.",
          "Start events cannot have incoming sequence flows.",
        );
      if (n.type === "endEvent" && outgoing.length)
        add(
          n.id,
          "error",
          "end-outgoing",
          "Evento final não pode ter fluxo de saída.",
          "End events cannot have outgoing sequence flows.",
        );
      if (n.type !== "startEvent" && !incoming.length)
        add(
          n.id,
          "warning",
          "no-incoming",
          "Elemento sem fluxo de entrada.",
          "Element has no incoming sequence flow.",
        );
      if (n.type !== "endEvent" && !outgoing.length)
        add(
          n.id,
          "warning",
          "no-outgoing",
          "Elemento sem fluxo de saída.",
          "Element has no outgoing sequence flow.",
        );
      if (starts.length && !reachable.has(n.id))
        add(
          n.id,
          "warning",
          "unreachable",
          "Elemento não é alcançável pelo evento inicial.",
          "Element is not reachable from a start event.",
        );
      if (/Gateway$/.test(n.type) && incoming.length < 2 && outgoing.length < 2)
        add(
          n.id,
          "warning",
          "gateway-branches",
          "Gateway precisa dividir ou juntar caminhos.",
          "Gateway should split or join paths.",
        );
      if (
        n.type === "exclusiveGateway" &&
        outgoing.length > 1 &&
        outgoing.some((f) => !f.name)
      )
        add(
          n.id,
          "warning",
          "branch-label",
          "Identifique os caminhos de decisão.",
          "Label the decision branches.",
        );
      if (/Task$|^task$|subProcess/.test(n.type) && !n.name.trim())
        add(
          n.id,
          "warning",
          "unnamed",
          "Atividade sem nome.",
          "Activity has no name.",
        );
      if (n.children) check(n.children);
    }
  }
  readBPMN(xml).forEach(check);
  const d = xmlDocument(xml),
    elements = Array.from(d.getElementsByTagName("*")),
    ids = new Set<string>();
  const add = (
    e: Element,
    code: string,
    pt: string,
    en: string,
    severity: "error" | "warning" = "warning",
  ) =>
    result.push({
      id: e.getAttribute("id") || e.parentElement?.getAttribute("id") || "",
      code,
      pt,
      en,
      severity,
    });
  for (const e of elements) {
    const id = e.getAttribute("id");
    if (id) {
      if (ids.has(id))
        add(
          e,
          "duplicate-id",
          "Identificador duplicado.",
          "Duplicate identifier.",
          "error",
        );
      ids.add(id);
    }
    if (
      e.localName === "timerEventDefinition" &&
      Array.from(e.children).filter((c) =>
        ["timeDate", "timeDuration", "timeCycle"].includes(c.localName),
      ).length !== 1
    )
      add(
        e,
        "timer-definition",
        "Configure exatamente uma data, duração ou ciclo para o temporizador.",
        "Configure exactly one timer date, duration or cycle.",
      );
    if (e.localName === "boundaryEvent") {
      const defs = Array.from(e.children).filter((c) =>
        /EventDefinition$/.test(c.localName),
      );
      if (!defs.length)
        add(
          e,
          "boundary-trigger",
          "Evento de borda exige um gatilho.",
          "Boundary events require a trigger.",
          "error",
        );
      const host = elements.find(
        (h) => h.getAttribute("id") === e.getAttribute("attachedToRef"),
      );
      if (!host)
        add(
          e,
          "boundary-host",
          "Evento de borda sem atividade de referência.",
          "Boundary event has no attached activity.",
          "error",
        );
      if (
        defs.some((c) => c.localName === "cancelEventDefinition") &&
        host?.localName !== "transaction"
      )
        add(
          e,
          "cancel-boundary",
          "Cancelamento de borda exige uma transação.",
          "Cancel boundary events require a transaction.",
          "error",
        );
      if (
        defs.some((c) => c.localName === "errorEventDefinition") &&
        e.getAttribute("cancelActivity") === "false"
      )
        add(
          e,
          "error-interrupting",
          "Evento de erro de borda deve ser interruptivo.",
          "Error boundary events must be interrupting.",
          "error",
        );
    }
    if (e.localName === "startEvent") {
      const parent = e.parentElement,
        eventSub =
          parent?.localName === "subProcess" &&
          parent.getAttribute("triggeredByEvent") === "true";
      if (e.getAttribute("isInterrupting") === "false" && !eventSub)
        add(
          e,
          "non-interrupting-start",
          "Início não interruptivo pertence a subprocesso de evento.",
          "Non-interrupting starts belong in an event subprocess.",
          "error",
        );
      if (
        Array.from(e.children).some((c) =>
          [
            "errorEventDefinition",
            "escalationEventDefinition",
            "compensateEventDefinition",
          ].includes(c.localName),
        ) &&
        !eventSub
      )
        add(
          e,
          "event-subprocess-trigger",
          "Este início exige um subprocesso de evento.",
          "This start trigger requires an event subprocess.",
          "error",
        );
    }
    if (
      e.localName === "endEvent" &&
      Array.from(e.children).some(
        (c) => c.localName === "cancelEventDefinition",
      ) &&
      e.parentElement?.localName !== "transaction"
    )
      add(
        e,
        "cancel-end",
        "Evento final de cancelamento pertence a uma transação.",
        "Cancel end events belong in a transaction.",
        "error",
      );
  }
  if (d.getElementsByTagNameNS("*", "choreography").length)
    add(
      d.documentElement,
      "choreography-review",
      "A validação semântica completa de coreografias requer revisão específica.",
      "Full choreography semantic validation requires a dedicated review.",
    );
  if (d.getElementsByTagNameNS("*", "conversation").length)
    add(
      d.documentElement,
      "conversation-review",
      "A validação semântica completa de conversações requer revisão específica.",
      "Full conversation semantic validation requires a dedicated review.",
    );
  return result;
}
