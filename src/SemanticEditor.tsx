import { useState } from "react";
import { Plus, ChevronDown, Code2, ArrowUpRight } from "lucide-react";
import type { Lang } from "./i18n";
import {
  catalog,
  catalogLabel,
  type CatalogItem,
  createCatalogShape,
} from "./catalog";
export function eventOptions(bo: any) {
  return bo.$type === "bpmn:StartEvent"
    ? catalog.start
    : bo.$type === "bpmn:EndEvent"
      ? catalog.end
      : bo.$type === "bpmn:BoundaryEvent"
        ? catalog.boundary
        : catalog.intermediate;
}
export function setEventVariant(m: any, element: any, item: CatalogItem) {
  const bo = element.businessObject,
    bpmn = m.get("bpmnFactory");
  const definitions = (
    item.events || [
      item.event?.replace("bpmn:", "").replace("EventDefinition", ""),
    ]
  )
    .filter(Boolean)
    .map((name: any) => {
      const d = bpmn.create("bpmn:" + name + "EventDefinition");
      d.$parent = bo;
      if (name === "Conditional")
        d.condition = bpmn.create("bpmn:FormalExpression", { body: "" });
      return d;
    });
  let target = element;
  if (item.type !== bo.$type)
    target = m.get("bpmnReplace").replaceElement(element, { type: item.type });
  m.get("modeling").updateProperties(target, {
    eventDefinitions: definitions,
    parallelMultiple: item.props?.parallelMultiple || false,
    ...(bo.$type === "bpmn:StartEvent"
      ? { isInterrupting: item.props?.isInterrupting !== false }
      : {}),
    ...(bo.$type === "bpmn:BoundaryEvent"
      ? { cancelActivity: item.props?.cancelActivity !== false }
      : {}),
  });
  m.get("selection").select(target);
  return target;
}
export default function SemanticEditor({
  modeler: m,
  element,
  lang,
  disabled,
  notify,
  onSource,
  onLibrary,
}: {
  modeler: any;
  element: any;
  lang: Lang;
  disabled: boolean;
  notify: (s: string) => void;
  onSource: () => void;
  onLibrary: () => void;
}) {
  const en = lang === "en",
    bo = element.businessObject,
    modeling = m.get("modeling"),
    factory = m.get("bpmnFactory");
  const [advanced, setAdvanced] = useState(false);
  const [propName, setPropName] = useState(""),
    [value, setValue] = useState("");
  const update = (props: Record<string, unknown>) =>
    modeling.updateProperties(element, props);
  const nested = (target: any, props: Record<string, unknown>) =>
    modeling.updateModdleProperties(element, target, props);
  const expression = (body: string) =>
    factory.create("bpmn:FormalExpression", { body });
  const field = (
    label: string,
    current: unknown,
    save: (s: string) => void,
    placeholder?: string,
  ) => (
    <label>
      {label}
      <input
        key={label + String(current)}
        defaultValue={String(current ?? "")}
        placeholder={placeholder}
        disabled={disabled}
        onBlur={(e) => {
          if (e.target.value !== String(current ?? "")) save(e.target.value);
        }}
      />
    </label>
  );
  const longfield = (
    label: string,
    current: unknown,
    save: (s: string) => void,
  ) => (
    <label>
      {label}
      <textarea
        key={label + String(current)}
        defaultValue={String(current ?? "")}
        rows={4}
        disabled={disabled}
        onBlur={(e) => {
          if (e.target.value !== String(current ?? "")) save(e.target.value);
        }}
      />
    </label>
  );
  const checkbox = (
    label: string,
    current: boolean,
    save: (v: boolean) => void,
  ) => (
    <label className="check-field">
      <input
        type="checkbox"
        checked={current}
        disabled={disabled}
        onChange={(e) => save(e.target.checked)}
      />
      {label}
    </label>
  );
  const definitions = m.getDefinitions();
  const definitionsOf = (type: string) =>
    (definitions.rootElements || []).filter((r: any) => r.$instanceOf(type));
  const refs = (label: string, target: any, key: string, type: string) => {
    const roots = definitionsOf(type);
    return (
      <label>
        {label}
        <div className="reference-field">
          <select
            disabled={disabled}
            value={target[key]?.id || ""}
            onChange={(e) =>
              nested(target, {
                [key]: roots.find((r: any) => r.id === e.target.value),
              })
            }
          >
            <option value="">—</option>
            {roots.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.name || r.id}
              </option>
            ))}
          </select>
          <button
            title={en ? "New definition" : "Nova definição"}
            disabled={disabled}
            onClick={() => {
              const name = prompt(en ? "Definition name" : "Nome da definição");
              if (!name) return;
              const root = factory.create(type, { name });
              root.$parent = definitions;
              nested(definitions, {
                rootElements: [...definitions.rootElements, root],
              });
              nested(target, { [key]: root });
            }}
          >
            <Plus size={15} />
          </button>
        </div>
      </label>
    );
  };
  const event = bo.$instanceOf("bpmn:Event");
  const activity = bo.$instanceOf("bpmn:Activity");
  const loop = bo.loopCharacteristics;
  const currentEvent = event
    ? eventOptions(bo).find(
        (i) =>
          i.type === bo.$type &&
          (i.events
            ? bo.eventDefinitions?.length > 1 &&
              !!i.props?.parallelMultiple === !!bo.parallelMultiple
            : (i.event || "") === (bo.eventDefinitions?.[0]?.$type || "")) &&
          (bo.$type !== "bpmn:StartEvent" ||
            (i.props?.isInterrupting !== false) ===
              (bo.isInterrupting !== false)) &&
          (bo.$type !== "bpmn:BoundaryEvent" ||
            (i.props?.cancelActivity !== false) ===
              (bo.cancelActivity !== false)),
      )
    : null;
  const props = bo.$descriptor.properties.filter(
    (p: any) =>
      !p.isVirtual &&
      !p.isReadOnly &&
      p.name !== "id" &&
      ![
        "di",
        "incoming",
        "outgoing",
        "flowElements",
        "artifacts",
        "laneSets",
        "lanes",
      ].includes(p.name),
  );
  return (
    <div className="semantic-editor">
      <div className="field-section-title">
        BPMN 2.0
        <ChevronDown size={14} />
      </div>
      {event && (
        <>
          <label>
            {en ? "Event type" : "Tipo de evento"}
            <select
              value={currentEvent?.id || ""}
              disabled={disabled}
              onChange={(e) => {
                const item = eventOptions(bo).find(
                  (i) => i.id === e.target.value,
                );
                if (item) setEventVariant(m, element, item);
              }}
            >
              <option value="" disabled>
                {en ? "Custom combination" : "Combinação personalizada"}
              </option>
              {eventOptions(bo).map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogLabel(item, lang)}
                </option>
              ))}
            </select>
          </label>
          {bo.$type === "bpmn:StartEvent" &&
            bo.$parent?.triggeredByEvent &&
            checkbox(
              en ? "Interrupting" : "Interruptivo",
              bo.isInterrupting !== false,
              (v) => update({ isInterrupting: v }),
            )}
          {bo.$type === "bpmn:BoundaryEvent" &&
            checkbox(
              en ? "Interrupts the activity" : "Interrompe a atividade",
              bo.cancelActivity !== false,
              (v) => update({ cancelActivity: v }),
            )}
          {bo.eventDefinitions?.length > 1 && (
            <label>
              {en ? "Multiple event triggers" : "Gatilhos do evento múltiplo"}
              <div className="multiple-events">
                {[
                  "Message",
                  "Signal",
                  "Timer",
                  "Conditional",
                  "Escalation",
                  "Error",
                  "Compensate",
                  "Terminate",
                  "Link",
                ].map((type) => (
                  <label className="check-field" key={type}>
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={bo.eventDefinitions.some(
                        (d: any) =>
                          d.$type === "bpmn:" + type + "EventDefinition",
                      )}
                      onChange={(e) => {
                        const next = bo.eventDefinitions.filter(
                          (d: any) =>
                            d.$type !== "bpmn:" + type + "EventDefinition",
                        );
                        if (e.target.checked) {
                          const d = factory.create(
                            "bpmn:" + type + "EventDefinition",
                          );
                          d.$parent = bo;
                          next.push(d);
                        }
                        if (next.length) update({ eventDefinitions: next });
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </label>
          )}
          {(bo.eventDefinitions || []).map((d: any) => (
            <div className="event-definition" key={d.id}>
              <small>
                {d.$type.replace("bpmn:", "").replace("EventDefinition", "")}
              </small>
              {d.$type === "bpmn:TimerEventDefinition" && (
                <>
                  {field(
                    en ? "Date · ISO 8601" : "Data · ISO 8601",
                    d.timeDate?.body,
                    (s) =>
                      nested(d, {
                        timeDate: s ? expression(s) : undefined,
                        timeDuration: undefined,
                        timeCycle: undefined,
                      }),
                    "2026-10-26T09:00:00-03:00",
                  )}
                  {field(
                    en ? "Duration · ISO 8601" : "Duração · ISO 8601",
                    d.timeDuration?.body,
                    (s) =>
                      nested(d, {
                        timeDuration: s ? expression(s) : undefined,
                        timeDate: undefined,
                        timeCycle: undefined,
                      }),
                    "PT30M",
                  )}
                  {field(
                    en ? "Cycle · ISO 8601" : "Ciclo · ISO 8601",
                    d.timeCycle?.body,
                    (s) =>
                      nested(d, {
                        timeCycle: s ? expression(s) : undefined,
                        timeDate: undefined,
                        timeDuration: undefined,
                      }),
                    "R3/PT1H",
                  )}
                </>
              )}
              {d.$type === "bpmn:ConditionalEventDefinition" &&
                longfield(
                  en ? "Condition" : "Condição",
                  d.condition?.body,
                  (s) => nested(d, { condition: expression(s) }),
                )}
              {d.$type === "bpmn:MessageEventDefinition" &&
                refs(
                  en ? "Message" : "Mensagem",
                  d,
                  "messageRef",
                  "bpmn:Message",
                )}
              {d.$type === "bpmn:SignalEventDefinition" &&
                refs(en ? "Signal" : "Sinal", d, "signalRef", "bpmn:Signal")}
              {d.$type === "bpmn:ErrorEventDefinition" &&
                refs(en ? "Error" : "Erro", d, "errorRef", "bpmn:Error")}
              {d.$type === "bpmn:EscalationEventDefinition" &&
                refs(
                  en ? "Escalation" : "Escalação",
                  d,
                  "escalationRef",
                  "bpmn:Escalation",
                )}
              {d.$type === "bpmn:LinkEventDefinition" &&
                field(
                  en
                    ? "Link name (same name at both ends)"
                    : "Nome do link (igual nas duas pontas)",
                  d.name,
                  (s) => nested(d, { name: s }),
                )}
              {d.$type === "bpmn:CompensateEventDefinition" && (
                <>
                  {checkbox(
                    en ? "Wait for completion" : "Aguardar conclusão",
                    d.waitForCompletion !== false,
                    (v) => nested(d, { waitForCompletion: v }),
                  )}
                  <label>
                    {en ? "Compensated activity" : "Atividade compensada"}
                    <select
                      value={d.activityRef?.id || ""}
                      disabled={disabled}
                      onChange={(e) =>
                        nested(d, {
                          activityRef: m
                            .get("elementRegistry")
                            .get(e.target.value)?.businessObject,
                        })
                      }
                    >
                      <option value="">—</option>
                      {m
                        .get("elementRegistry")
                        .getAll()
                        .filter(
                          (x: any) =>
                            !x.labelTarget &&
                            x.businessObject?.$instanceOf("bpmn:Activity"),
                        )
                        .map((x: any) => (
                          <option key={x.id} value={x.id}>
                            {x.businessObject.name || x.id}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          ))}
        </>
      )}
      {activity && (
        <>
          <label>
            {en ? "Loop behavior" : "Comportamento de repetição"}
            <select
              disabled={disabled}
              value={
                !loop
                  ? "none"
                  : loop.$type === "bpmn:StandardLoopCharacteristics"
                    ? "loop"
                    : loop.isSequential
                      ? "sequential"
                      : "parallel"
              }
              onChange={(e) => {
                const v = e.target.value;
                const obj =
                  v === "none"
                    ? undefined
                    : v === "loop"
                      ? factory.create("bpmn:StandardLoopCharacteristics")
                      : factory.create(
                          "bpmn:MultiInstanceLoopCharacteristics",
                          { isSequential: v === "sequential" },
                        );
                if (obj) obj.$parent = bo;
                update({ loopCharacteristics: obj });
              }}
            >
              <option value="none">{en ? "None" : "Nenhum"}</option>
              <option value="loop">
                {en ? "Standard loop" : "Repetição padrão"}
              </option>
              <option value="sequential">
                {en
                  ? "Sequential multi-instance"
                  : "Múltiplas instâncias sequenciais"}
              </option>
              <option value="parallel">
                {en
                  ? "Parallel multi-instance"
                  : "Múltiplas instâncias paralelas"}
              </option>
            </select>
          </label>
          {loop?.$type === "bpmn:StandardLoopCharacteristics" && (
            <>
              {longfield(
                en ? "Loop condition" : "Condição de repetição",
                loop.loopCondition?.body,
                (s) => nested(loop, { loopCondition: expression(s) }),
              )}
              {field(
                en ? "Maximum repetitions" : "Máximo de repetições",
                loop.loopMaximum,
                (s) => nested(loop, { loopMaximum: s ? Number(s) : undefined }),
              )}
              {checkbox(
                en ? "Test before running" : "Testar antes de executar",
                !!loop.testBefore,
                (v) => nested(loop, { testBefore: v }),
              )}
            </>
          )}
          {loop?.$type === "bpmn:MultiInstanceLoopCharacteristics" && (
            <>
              {field(
                en
                  ? "Instance count expression"
                  : "Expressão de quantidade de instâncias",
                loop.loopCardinality?.body,
                (s) => nested(loop, { loopCardinality: expression(s) }),
              )}
              {longfield(
                en ? "Completion condition" : "Condição de conclusão",
                loop.completionCondition?.body,
                (s) => nested(loop, { completionCondition: expression(s) }),
              )}
            </>
          )}
          {checkbox(
            en ? "For compensation" : "Para compensação",
            !!bo.isForCompensation,
            (v) => update({ isForCompensation: v }),
          )}
        </>
      )}
      {bo.$type === "bpmn:ScriptTask" && (
        <>
          {field(
            en ? "Script format" : "Formato do script",
            bo.scriptFormat,
            (s) => update({ scriptFormat: s }),
            "javascript",
          )}
          {longfield("Script", bo.script, (s) => update({ script: s }))}
        </>
      )}
      {[
        "bpmn:UserTask",
        "bpmn:ServiceTask",
        "bpmn:BusinessRuleTask",
        "bpmn:SendTask",
        "bpmn:ReceiveTask",
      ].includes(bo.$type) &&
        field(
          en ? "Implementation" : "Implementação",
          bo.implementation,
          (s) => update({ implementation: s }),
          "##unspecified",
        )}
      {["bpmn:SendTask", "bpmn:ReceiveTask", "bpmn:MessageFlow"].includes(
        bo.$type,
      ) && refs(en ? "Message" : "Mensagem", bo, "messageRef", "bpmn:Message")}
      {bo.$type === "bpmn:ReceiveTask" &&
        checkbox(
          en ? "Instantiate process" : "Iniciar instância do processo",
          !!bo.instantiate,
          (v) => update({ instantiate: v }),
        )}
      {bo.$type === "bpmn:CallActivity" && (
        <>
          <label>
            {en
              ? "Reusable process / global task"
              : "Processo reutilizável / tarefa global"}
            <select
              value={bo.calledElement || ""}
              disabled={disabled}
              onChange={(e) => update({ calledElement: e.target.value })}
            >
              <option value="">—</option>
              {(definitions.rootElements || [])
                .filter((r: any) => r.$instanceOf("bpmn:CallableElement"))
                .map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name || r.id}
                  </option>
                ))}
            </select>
          </label>
          {field("calledElement", bo.calledElement, (s) =>
            update({ calledElement: s }),
          )}
          <button className="secondary full" onClick={onLibrary}>
            <Plus size={14} />
            {en ? "Reusable process library" : "Biblioteca de processos"}
          </button>
        </>
      )}
      {bo.$instanceOf("bpmn:SubProcess") && (
        <>
          {checkbox(
            en ? "Triggered by event" : "Disparado por evento",
            !!bo.triggeredByEvent,
            (v) => update({ triggeredByEvent: v }),
          )}
          {bo.$type === "bpmn:Transaction" &&
            field(
              en ? "Transaction method" : "Método de transação",
              bo.method,
              (s) => update({ method: s }),
              "##Compensate",
            )}
          {bo.$type === "bpmn:AdHocSubProcess" && (
            <>
              {field(
                en
                  ? "Ordering (Parallel / Sequential)"
                  : "Ordem (Parallel / Sequential)",
                bo.ordering,
                (s) => update({ ordering: s }),
              )}
              {longfield(
                en ? "Completion condition" : "Condição de conclusão",
                bo.completionCondition?.body,
                (s) => update({ completionCondition: expression(s) }),
              )}
            </>
          )}
        </>
      )}
      {bo.$type === "bpmn:EventBasedGateway" && (
        <>
          <label>
            {en ? "Gateway mode" : "Modo do gateway"}
            <select
              disabled={disabled}
              value={bo.eventGatewayType || "Exclusive"}
              onChange={(e) => update({ eventGatewayType: e.target.value })}
            >
              <option value="Exclusive">
                {en ? "Exclusive" : "Exclusivo"}
              </option>
              <option value="Parallel">{en ? "Parallel" : "Paralelo"}</option>
            </select>
          </label>
          {checkbox(
            en ? "Instantiate process" : "Iniciar instância do processo",
            !!bo.instantiate,
            (v) => update({ instantiate: v }),
          )}
        </>
      )}
      {bo.$type === "bpmn:ComplexGateway" &&
        longfield(
          en ? "Activation condition" : "Condição de ativação",
          bo.activationCondition?.body,
          (s) => update({ activationCondition: expression(s) }),
        )}
      {(activity || bo.$instanceOf("bpmn:Gateway")) &&
        bo.outgoing?.length > 1 && (
          <label>
            {en ? "Default sequence flow" : "Fluxo de sequência padrão"}
            <select
              disabled={disabled}
              value={bo.default?.id || ""}
              onChange={(e) =>
                update({
                  default: bo.outgoing.find(
                    (f: any) => f.id === e.target.value,
                  ),
                })
              }
            >
              <option value="">—</option>
              {bo.outgoing.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name || f.id}
                </option>
              ))}
            </select>
          </label>
        )}
      {bo.$type === "bpmn:SequenceFlow" &&
        longfield(
          en ? "Condition expression" : "Expressão de condição",
          bo.conditionExpression?.body,
          (s) => update({ conditionExpression: s ? expression(s) : undefined }),
        )}
      {bo.$type === "bpmn:Association" && (
        <label>
          {en ? "Association direction" : "Direção da associação"}
          <select
            disabled={disabled}
            value={bo.associationDirection || "None"}
            onChange={(e) => update({ associationDirection: e.target.value })}
          >
            {["None", "One", "Both"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}
      {bo.$type === "bpmn:DataObjectReference" &&
        bo.dataObjectRef &&
        checkbox(
          en ? "Data collection" : "Coleção de dados",
          !!bo.dataObjectRef.isCollection,
          (v) => nested(bo.dataObjectRef, { isCollection: v }),
        )}
      <button
        className="advanced-toggle"
        onClick={() => setAdvanced(!advanced)}
      >
        <Code2 size={14} />
        {en ? "BPMN metamodel properties" : "Propriedades do metamodelo BPMN"}
        <ChevronDown size={13} />
      </button>
      {advanced && (
        <div className="advanced-props">
          <p className="field-help">
            {en
              ? "Edit a standard property using its BPMN name. References use element IDs. Structured values use JSON with $type. Invalid types are rejected; semantic conformance still needs review."
              : "Edite uma propriedade padrão pelo nome BPMN. Referências usam IDs de elementos. Valores estruturados usam JSON com $type. Tipos inválidos são rejeitados; a conformidade semântica ainda exige revisão."}
          </p>
          <label>
            {en ? "Standard property" : "Propriedade padrão"}
            <select
              value={propName}
              onChange={(e) => {
                setPropName(e.target.value);
                const p = props.find((p: any) => p.name === e.target.value);
                const v = bo.get(p.name);
                setValue(
                  p.isReference
                    ? Array.isArray(v)
                      ? v.map((x) => x.id).join(",")
                      : v?.id || ""
                    : typeof v === "object"
                      ? JSON.stringify(serialize(v), null, 2)
                      : String(v ?? ""),
                );
              }}
            >
              <option value="">—</option>
              {props.map((p: any) => (
                <option key={p.name} value={p.name}>
                  {p.name} · {p.type}
                  {p.isMany ? "[]" : ""}
                  {p.isReference ? " →" : ""}
                </option>
              ))}
            </select>
          </label>
          {propName && (
            <>
              <label>
                {en ? "Value" : "Valor"}
                <textarea
                  rows={6}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={disabled}
                />
              </label>
              <button
                className="secondary full"
                disabled={disabled}
                onClick={() => {
                  try {
                    const p = props.find((p: any) => p.name === propName);
                    let v: unknown;
                    if (!value) v = p.isMany ? [] : undefined;
                    else if (p.isReference) {
                      const ids = value.split(",").map((s) => s.trim());
                      const all = collect(definitions);
                      const found = ids.map((id) => {
                        const ref = all.find((x) => x.id === id);
                        if (!ref) throw new Error("Unknown reference: " + id);
                        return ref;
                      });
                      v = p.isMany ? found : found[0];
                    } else if (p.type === "Boolean") {
                      if (!["true", "false"].includes(value))
                        throw new Error("Use true / false");
                      v = value === "true";
                    } else if (["Integer", "Real"].includes(p.type)) {
                      v = Number(value);
                      if (!Number.isFinite(v))
                        throw new Error("Invalid number");
                    } else if (p.type === "String" || (p.isAttr && !p.isMany))
                      v = value;
                    else {
                      v = deserialize(JSON.parse(value), m, definitions);
                      if (v && typeof v === "object" && !Array.isArray(v))
                        (v as any).$parent = bo;
                    }
                    update({ [propName]: v });
                    notify(
                      en
                        ? "BPMN property updated"
                        : "Propriedade BPMN atualizada",
                    );
                  } catch (err) {
                    notify(String(err));
                  }
                }}
              >
                {en ? "Apply property" : "Aplicar propriedade"}
              </button>
            </>
          )}
        </div>
      )}
      <button className="source-link" onClick={onSource}>
        <Code2 size={13} />
        {en ? "Open BPMN XML source" : "Abrir código BPMN XML"}
        <ArrowUpRight size={12} />
      </button>
    </div>
  );
}
export function collect(root: any): any[] {
  const result: any[] = [],
    seen = new Set();
  function visit(x: any) {
    if (!x || typeof x !== "object" || seen.has(x)) return;
    seen.add(x);
    if (x.$type) result.push(x);
    if (Array.isArray(x)) x.forEach(visit);
    else
      for (const p of x.$descriptor?.properties || []) {
        if (!p.isReference && !p.isVirtual) visit(x.get(p.name));
      }
  }
  visit(root);
  return result;
}
export function serialize(x: any): any {
  if (Array.isArray(x)) return x.map(serialize);
  if (!x || typeof x !== "object") return x;
  const out: any = { $type: x.$type };
  for (const p of x.$descriptor?.properties || []) {
    if (p.isVirtual) continue;
    const v = x.get(p.name);
    if (v === undefined || v === null || (Array.isArray(v) && !v.length))
      continue;
    out[p.name] = p.isReference
      ? Array.isArray(v)
        ? v.map((y) => ({ $ref: y.id }))
        : { $ref: v.id }
      : serialize(v);
  }
  return out;
}
export function deserialize(x: any, m: any, defs: any): any {
  if (Array.isArray(x)) return x.map((y) => deserialize(y, m, defs));
  if (!x || typeof x !== "object") return x;
  if (x.$ref) {
    const ref = collect(defs).find((r) => r.id === x.$ref);
    if (!ref) throw new Error("Unknown reference: " + x.$ref);
    return ref;
  }
  if (!x.$type) throw new Error("Structured values need $type");
  const type = x.$type,
    attrs = Object.fromEntries(
      Object.entries(x)
        .filter(([k]) => k !== "$type")
        .map(([k, v]) => [k, deserialize(v, m, defs)]),
    );
  return m.get("moddle").create(type, attrs);
}
