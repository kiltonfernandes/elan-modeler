import type { Lang } from "./i18n";
export type CatalogItem = {
  id: string;
  type: string;
  pt: string;
  en: string;
  icon: string;
  event?: string;
  events?: string[];
  props?: Record<string, unknown>;
  expanded?: boolean;
  hint?: string;
  connection?: string;
};
const task = (
  type: string,
  pt: string,
  en: string,
  icon: string,
): CatalogItem => ({ id: type, type: "bpmn:" + type, pt, en, icon });
const event = (
  kind: string,
  trigger: string,
  pt: string,
  en: string,
  extra: Partial<CatalogItem> = {},
): CatalogItem => ({
  id: kind + "_" + trigger,
  type: "bpmn:" + kind,
  pt,
  en,
  icon:
    "bpmn-icon-" +
    (kind === "StartEvent"
      ? "start-event"
      : kind === "EndEvent"
        ? "end-event"
        : kind === "BoundaryEvent"
          ? "intermediate-event-catch"
          : "intermediate-event") +
    "-" +
    (trigger || "none").replace("Compensate", "compensation").toLowerCase(),
  event: trigger ? "bpmn:" + trigger + "EventDefinition" : undefined,
  ...extra,
});
export const catalog: Record<string, CatalogItem[]> = {
  start: [
    event("StartEvent", "", "Sem gatilho", "None start"),
    event("StartEvent", "Timer", "Temporizador", "Timer start"),
    event("StartEvent", "Message", "Mensagem", "Message start"),
    event("StartEvent", "Signal", "Sinal", "Signal start"),
    event("StartEvent", "Conditional", "Condicional", "Conditional start"),
    event(
      "StartEvent",
      "ParallelMultiple",
      "Múltiplo paralelo",
      "Parallel multiple start",
      {
        event: undefined,
        events: ["Message", "Signal"],
        props: { parallelMultiple: true },
      },
    ),
    event("StartEvent", "Multiple", "Múltiplo", "Multiple start", {
      event: undefined,
      events: ["Message", "Signal"],
    }),
    ...["Error", "Escalation", "Compensate"].map((trigger) =>
      event(
        "StartEvent",
        trigger,
        (
          {
            Error: "Erro",
            Escalation: "Escalação",
            Compensate: "Compensação",
          } as Record<string, string>
        )[trigger] + " · subprocesso de evento",
        trigger + " start · event subprocess",
        { hint: "event-subprocess" },
      ),
    ),
    ...["Timer", "Message", "Signal", "Conditional", "Escalation"].map(
      (trigger) =>
        event(
          "StartEvent",
          trigger,
          (
            {
              Timer: "Temporizador",
              Message: "Mensagem",
              Signal: "Sinal",
              Conditional: "Condicional",
              Escalation: "Escalação",
            } as Record<string, string>
          )[trigger] + " · não interruptivo",
          trigger + " start · non-interrupting",
          {
            id: "nonInterruptingStart_" + trigger,
            props: { isInterrupting: false },
            hint: "event-subprocess",
          },
        ),
    ),
    event(
      "StartEvent",
      "Multiple",
      "Múltiplo · não interruptivo",
      "Multiple start · non-interrupting",
      {
        id: "nonInterruptingStart_Multiple",
        events: ["Message", "Signal"],
        event: undefined,
        props: { isInterrupting: false },
        hint: "event-subprocess",
      },
    ),
    event(
      "StartEvent",
      "ParallelMultiple",
      "Múltiplo paralelo · não interruptivo",
      "Parallel multiple start · non-interrupting",
      {
        id: "nonInterruptingStart_ParallelMultiple",
        events: ["Message", "Signal"],
        event: undefined,
        props: { isInterrupting: false, parallelMultiple: true },
        hint: "event-subprocess",
      },
    ),
  ],
  task: [
    task("Task", "Tarefa sem tipo", "None task", "bpmn-icon-task"),
    task("UserTask", "Tarefa de usuário", "User task", "bpmn-icon-user-task"),
    task(
      "ServiceTask",
      "Tarefa de serviço",
      "Service task",
      "bpmn-icon-service-task",
    ),
    task(
      "ReceiveTask",
      "Receber mensagem",
      "Receive task",
      "bpmn-icon-receive-task",
    ),
    task(
      "SendTask",
      "Enviar mensagem / e-mail",
      "Send task / email",
      "bpmn-icon-send-task",
    ),
    task(
      "ScriptTask",
      "Tarefa de script",
      "Script task",
      "bpmn-icon-script-task",
    ),
    task("ManualTask", "Tarefa manual", "Manual task", "bpmn-icon-manual-task"),
    task(
      "BusinessRuleTask",
      "Regra de negócio",
      "Business rule task",
      "bpmn-icon-business-rule-task",
    ),
  ],
  subprocess: [
    {
      ...task(
        "CallActivity",
        "Processo reutilizável (chamada)",
        "Reusable process (call activity)",
        "bpmn-icon-call-activity",
      ),
      id: "call",
    },
    {
      ...task(
        "SubProcess",
        "Subprocesso recolhido",
        "Collapsed subprocess",
        "bpmn-icon-subprocess-collapsed",
      ),
      id: "subCollapsed",
      expanded: false,
    },
    {
      ...task(
        "SubProcess",
        "Subprocesso expandido",
        "Expanded subprocess",
        "bpmn-icon-subprocess-expanded",
      ),
      id: "subExpanded",
      expanded: true,
    },
    {
      ...task(
        "SubProcess",
        "Subprocesso de evento",
        "Event subprocess",
        "bpmn-icon-event-subprocess-expanded",
      ),
      id: "eventSub",
      props: { triggeredByEvent: true },
      expanded: true,
    },
    task("Transaction", "Transação", "Transaction", "bpmn-icon-transaction"),
    task(
      "AdHocSubProcess",
      "Subprocesso ad hoc",
      "Ad-hoc subprocess",
      "bpmn-icon-ad-hoc-marker",
    ),
  ],
  gateway: [
    task(
      "ParallelGateway",
      "Gateway paralelo",
      "Parallel gateway",
      "bpmn-icon-gateway-parallel",
    ),
    task(
      "ExclusiveGateway",
      "Gateway exclusivo",
      "Exclusive gateway",
      "bpmn-icon-gateway-xor",
    ),
    task(
      "InclusiveGateway",
      "Gateway inclusivo",
      "Inclusive gateway",
      "bpmn-icon-gateway-or",
    ),
    {
      ...task(
        "EventBasedGateway",
        "Baseado em eventos",
        "Event-based gateway",
        "bpmn-icon-gateway-eventbased",
      ),
      id: "eventGateway",
      props: { eventGatewayType: "Exclusive", instantiate: false },
    },
    {
      ...task(
        "EventBasedGateway",
        "Exclusivo baseado em eventos (início)",
        "Exclusive event-based gateway (instantiate)",
        "bpmn-icon-gateway-eventbased",
      ),
      id: "exclusiveEventGateway",
      props: { eventGatewayType: "Exclusive", instantiate: true },
    },
    {
      ...task(
        "EventBasedGateway",
        "Paralelo baseado em eventos (início)",
        "Parallel event-based gateway (instantiate)",
        "bpmn-icon-gateway-parallel-eventbased",
      ),
      id: "parallelEventGateway",
      props: { eventGatewayType: "Parallel", instantiate: true },
    },
    task(
      "ComplexGateway",
      "Gateway complexo",
      "Complex gateway",
      "bpmn-icon-gateway-complex",
    ),
  ],
  intermediate: [
    event("IntermediateThrowEvent", "", "Sem gatilho", "None intermediate"),
    event(
      "IntermediateCatchEvent",
      "Timer",
      "Temporizador (captura)",
      "Timer catch",
    ),
    event(
      "IntermediateCatchEvent",
      "Message",
      "Mensagem (captura)",
      "Message catch",
    ),
    event(
      "IntermediateThrowEvent",
      "Message",
      "Mensagem (lançamento)",
      "Message throw",
    ),
    event(
      "IntermediateCatchEvent",
      "Signal",
      "Sinal (captura)",
      "Signal catch",
    ),
    event(
      "IntermediateThrowEvent",
      "Signal",
      "Sinal (lançamento)",
      "Signal throw",
    ),
    event("IntermediateCatchEvent", "Link", "Link (captura)", "Link catch"),
    event("IntermediateThrowEvent", "Link", "Link (lançamento)", "Link throw"),
    event(
      "IntermediateThrowEvent",
      "Compensate",
      "Compensação",
      "Compensate throw",
    ),
    event(
      "IntermediateThrowEvent",
      "Escalation",
      "Escalação",
      "Escalation throw",
    ),
    event(
      "IntermediateCatchEvent",
      "Conditional",
      "Condicional",
      "Conditional catch",
    ),
    event(
      "IntermediateCatchEvent",
      "ParallelMultiple",
      "Múltiplo paralelo",
      "Parallel multiple catch",
      {
        event: undefined,
        events: ["Message", "Signal"],
        props: { parallelMultiple: true },
      },
    ),
    event(
      "IntermediateCatchEvent",
      "Multiple",
      "Múltiplo (captura)",
      "Multiple catch",
      { event: undefined, events: ["Message", "Signal"] },
    ),
    event(
      "IntermediateThrowEvent",
      "Multiple",
      "Múltiplo (lançamento)",
      "Multiple throw",
      { event: undefined, events: ["Message", "Signal"] },
    ),
  ],
  end: [
    event("EndEvent", "", "Sem resultado", "None end"),
    event(
      "EndEvent",
      "Terminate",
      "Término de todas as instâncias",
      "Terminate end",
    ),
    event("EndEvent", "Message", "Mensagem", "Message end"),
    event("EndEvent", "Signal", "Sinal", "Signal end"),
    event("EndEvent", "Compensate", "Compensação", "Compensate end"),
    event("EndEvent", "Escalation", "Escalação", "Escalation end"),
    event("EndEvent", "Error", "Erro", "Error end"),
    event("EndEvent", "Cancel", "Cancelamento de transação", "Cancel end"),
    event("EndEvent", "Multiple", "Múltiplo", "Multiple end", {
      event: undefined,
      events: ["Message", "Signal"],
    }),
  ],
  boundary: [
    ...[
      "Timer",
      "Message",
      "Signal",
      "Conditional",
      "Error",
      "Escalation",
      "Compensate",
      "Cancel",
    ].map((trigger) =>
      event(
        "BoundaryEvent",
        trigger,
        (
          {
            Timer: "Temporizador",
            Message: "Mensagem",
            Signal: "Sinal",
            Conditional: "Condicional",
            Error: "Erro",
            Escalation: "Escalação",
            Compensate: "Compensação",
            Cancel: "Cancelamento",
          } as Record<string, string>
        )[trigger] + " · interruptivo",
        trigger + " boundary · interrupting",
        { props: { cancelActivity: true } },
      ),
    ),
    ...["Timer", "Message", "Signal", "Conditional", "Escalation"].map(
      (trigger) =>
        event(
          "BoundaryEvent",
          trigger,
          (
            {
              Timer: "Temporizador",
              Message: "Mensagem",
              Signal: "Sinal",
              Conditional: "Condicional",
              Escalation: "Escalação",
            } as Record<string, string>
          )[trigger] + " · não interruptivo",
          trigger + " boundary · non-interrupting",
          {
            id: "nonInterrupting_" + trigger,
            props: { cancelActivity: false },
          },
        ),
    ),
    event(
      "BoundaryEvent",
      "Multiple",
      "Múltiplo · interruptivo",
      "Multiple boundary · interrupting",
      { events: ["Message", "Signal"], event: undefined },
    ),
    event(
      "BoundaryEvent",
      "ParallelMultiple",
      "Múltiplo paralelo · interruptivo",
      "Parallel multiple boundary · interrupting",
      {
        events: ["Message", "Signal"],
        event: undefined,
        props: { parallelMultiple: true },
      },
    ),
    event(
      "BoundaryEvent",
      "Multiple",
      "Múltiplo · não interruptivo",
      "Multiple boundary · non-interrupting",
      {
        id: "nonInterrupting_Multiple",
        events: ["Message", "Signal"],
        event: undefined,
        props: { cancelActivity: false },
      },
    ),
    event(
      "BoundaryEvent",
      "ParallelMultiple",
      "Múltiplo paralelo · não interruptivo",
      "Parallel multiple boundary · non-interrupting",
      {
        id: "nonInterrupting_ParallelMultiple",
        events: ["Message", "Signal"],
        event: undefined,
        props: { parallelMultiple: true, cancelActivity: false },
      },
    ),
  ],
  connections: [
    {
      id: "sequence",
      type: "bpmn:SequenceFlow",
      pt: "Fluxo de sequência",
      en: "Sequence flow",
      icon: "bpmn-icon-connection",
      connection: "bpmn:SequenceFlow",
    },
    {
      id: "conditional",
      type: "bpmn:SequenceFlow",
      pt: "Fluxo condicional",
      en: "Conditional flow",
      icon: "bpmn-icon-conditional-flow",
      connection: "conditional",
    },
    {
      id: "default",
      type: "bpmn:SequenceFlow",
      pt: "Fluxo padrão",
      en: "Default flow",
      icon: "bpmn-icon-default-flow",
      connection: "default",
    },
    {
      id: "messageFlow",
      type: "bpmn:MessageFlow",
      pt: "Fluxo de mensagem",
      en: "Message flow",
      icon: "bpmn-icon-connection-multi",
      connection: "bpmn:MessageFlow",
    },
    {
      id: "association",
      type: "bpmn:Association",
      pt: "Associação sem direção",
      en: "Undirected association",
      icon: "bpmn-icon-association",
      connection: "bpmn:Association",
    },
    {
      id: "associationOne",
      type: "bpmn:Association",
      pt: "Associação em uma direção",
      en: "Directed association",
      icon: "bpmn-icon-association",
      connection: "associationOne",
    },
    {
      id: "associationBoth",
      type: "bpmn:Association",
      pt: "Associação bidirecional",
      en: "Bidirectional association",
      icon: "bpmn-icon-association",
      connection: "associationBoth",
    },
    {
      id: "dataInputAssociation",
      type: "bpmn:DataInputAssociation",
      pt: "Associação de entrada de dados",
      en: "Data input association",
      icon: "bpmn-icon-data-input",
      connection: "bpmn:DataInputAssociation",
    },
    {
      id: "dataOutputAssociation",
      type: "bpmn:DataOutputAssociation",
      pt: "Associação de saída de dados",
      en: "Data output association",
      icon: "bpmn-icon-data-output",
      connection: "bpmn:DataOutputAssociation",
    },
    {
      id: "conversationLink",
      type: "bpmn:ConversationLink",
      pt: "Vínculo de conversação",
      en: "Conversation link",
      icon: "bpmn-icon-connection-multi",
      connection: "bpmn:ConversationLink",
    },
  ],
  data: [
    task(
      "DataObjectReference",
      "Objeto de dados",
      "Data object",
      "bpmn-icon-data-object",
    ),
    {
      ...task(
        "DataObjectReference",
        "Coleção de dados",
        "Data collection",
        "bpmn-icon-data-object",
      ),
      id: "dataCollection",
      props: { collection: true },
    },
    task(
      "DataStoreReference",
      "Armazenamento de dados",
      "Data store",
      "bpmn-icon-data-store",
    ),
    task("DataInput", "Entrada de dados", "Data input", "bpmn-icon-data-input"),
    task(
      "DataOutput",
      "Saída de dados",
      "Data output",
      "bpmn-icon-data-output",
    ),
  ],
  conversation: [
    task(
      "Conversation",
      "Conversação",
      "Conversation",
      "bpmn-icon-gateway-none",
    ),
    task(
      "SubConversation",
      "Subconversação",
      "Sub-conversation",
      "bpmn-icon-gateway-none",
    ),
    task(
      "CallConversation",
      "Chamada de conversação",
      "Call conversation",
      "bpmn-icon-gateway-none",
    ),
  ],
  artifact: [
    {
      id: "milestone",
      type: "bpmn:Group",
      pt: "Marco / fase (extensão Élan)",
      en: "Milestone / phase (Élan extension)",
      icon: "bpmn-icon-lane",
      props: { elanKind: "milestone" },
    },
    task("Group", "Grupo", "Group", "bpmn-icon-group"),
    task(
      "TextAnnotation",
      "Anotação de texto",
      "Text annotation",
      "bpmn-icon-text-annotation",
    ),
  ],
};
export const catalogLabel = (item: CatalogItem, lang: Lang) =>
  lang === "en" ? item.en : item.pt;
export const catalogItems = Object.values(catalog).flat();
export function createCatalogShape(m: any, item: CatalogItem) {
  const factory = m.get("elementFactory"),
    bpmn = m.get("bpmnFactory");
  const props = { ...item.props };
  const collection = props.collection,
    elanKind = props.elanKind;
  delete props.collection;
  delete props.elanKind;
  const options: any = { type: item.type, ...props };
  if (item.expanded !== undefined) options.isExpanded = item.expanded;
  if (item.type === "bpmn:Transaction" || item.type === "bpmn:AdHocSubProcess")
    options.isExpanded = true;
  if (item.event) options.eventDefinitionType = item.event;
  if (elanKind === "milestone") {
    options.width = 250;
    options.height = 400;
  }
  if (item.type.includes("Conversation")) {
    options.width = 100;
    options.height = 80;
  }
  const shape = factory.createShape(options);
  const bo = shape.businessObject;
  Object.assign(bo, props);
  if (elanKind) bo.$attrs["elan:kind"] = elanKind;
  if (item.events) {
    bo.eventDefinitions = item.events.map((name) => {
      const def = bpmn.create("bpmn:" + name + "EventDefinition");
      def.$parent = bo;
      return def;
    });
  }
  if (collection && bo.dataObjectRef) bo.dataObjectRef.isCollection = true;
  return shape;
}
