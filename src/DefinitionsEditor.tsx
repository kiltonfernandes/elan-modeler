import { useState } from "react";
import { Plus, Save, Code2, Search, Layers } from "lucide-react";
import { serialize, deserialize } from "./SemanticEditor";
import type { Lang } from "./i18n";
export default function DefinitionsEditor({
  modeler: m,
  lang,
  notify,
}: {
  modeler: any;
  lang: Lang;
  notify: (s: string) => void;
}) {
  const en = lang === "en",
    defs = m.getDefinitions(),
    moddle = m.get("moddle"),
    factory = m.get("bpmnFactory"),
    canvas = m.get("canvas");
  const types = moddle
    .getPackages()
    .find((p: any) => p.prefix === "bpmn")
    .types.filter((t: any) => !t.isAbstract)
    .filter((t: any) => {
      try {
        return moddle.create("bpmn:" + t.name).$instanceOf("bpmn:RootElement");
      } catch {
        return false;
      }
    })
    .map((t: any) => "bpmn:" + t.name)
    .sort();
  const [type, setType] = useState("bpmn:Message"),
    [selected, setSelected] = useState<any>(null),
    [raw, setRaw] = useState(""),
    [query, setQuery] = useState(""),
    [revision, setRevision] = useState(0);
  const choose = (root: any) => {
    setSelected(root);
    const data = serialize(root);
    for (const key of [
      "id",
      "$type",
      "flowElements",
      "artifacts",
      "laneSets",
      "participants",
      "messageFlows",
      "conversations",
      "conversationLinks",
    ])
      delete data[key];
    setRaw(JSON.stringify(data, null, 2));
  };
  const edit = (target: any, props: any) =>
    m
      .get("modeling")
      .updateModdleProperties(canvas.getRootElement(), target, props);
  return (
    <div className="definitions-editor">
      <p className="field-help">
        {en
          ? "Standard BPMN definitions: messages, signals, errors, resources, item types, interfaces, global tasks and more. Changes are part of the same BPMN XML and support undo. Graphical contents are edited on the canvas or in the XML source."
          : "Definições BPMN padrão: mensagens, sinais, erros, recursos, tipos de dados, interfaces, tarefas globais e outras. As alterações pertencem ao mesmo XML BPMN e têm desfazer. Conteúdos gráficos são editados no canvas ou no código XML."}
      </p>
      <div className="definition-create">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t: string) => (
            <option key={t} value={t}>
              {t.replace("bpmn:", "")}
            </option>
          ))}
        </select>
        <button
          className="primary"
          onClick={() => {
            const name = prompt(en ? "Definition name" : "Nome da definição");
            if (!name) return;
            const root = factory.create(type);
            if (root.$descriptor.properties.some((p: any) => p.name === "name"))
              root.name = name;
            else
              root.documentation = [
                moddle.create("bpmn:Documentation", { text: name }),
              ];
            root.$parent = defs;
            edit(defs, { rootElements: [...defs.rootElements, root] });
            setRevision((r) => r + 1);
            choose(root);
          }}
        >
          <Plus size={15} />
          {en ? "Create" : "Criar"}
        </button>
      </div>
      <div className="definitions-columns">
        <div className="definitions-list">
          <div className="search-box">
            <Search size={14} />
            <input
              placeholder={en ? "Find definition…" : "Buscar definição…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {defs.rootElements
            .filter((r: any) =>
              `${r.id} ${r.name} ${r.$type}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((r: any) => (
              <button
                key={r.id}
                className={selected === r ? "active" : ""}
                onClick={() => choose(r)}
              >
                <Layers size={14} />
                <span>
                  <strong>{r.name || r.id}</strong>
                  <small>{r.$type.replace("bpmn:", "")}</small>
                </span>
              </button>
            ))}
        </div>
        <div className="definition-detail">
          {selected ? (
            <>
              <strong>{selected.name || selected.id}</strong>
              <p className="field-help">
                <code>{selected.id}</code> · {selected.$type}
              </p>
              <label>
                {en
                  ? "Standard properties (JSON)"
                  : "Propriedades padrão (JSON)"}
                <textarea
                  spellCheck={false}
                  rows={18}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </label>
              <button
                className="secondary full"
                onClick={() => {
                  try {
                    const data = JSON.parse(raw);
                    if (
                      !data ||
                      typeof data !== "object" ||
                      Array.isArray(data)
                    )
                      throw new Error("Use a JSON object");
                    const allowed = new Set(
                      selected.$descriptor.properties
                        .filter((p: any) => !p.isVirtual)
                        .map((p: any) => p.name),
                    );
                    const props: any = {};
                    for (const [key, value] of Object.entries(data)) {
                      if (
                        !allowed.has(key) ||
                        [
                          "id",
                          "$type",
                          "flowElements",
                          "artifacts",
                          "laneSets",
                          "participants",
                          "messageFlows",
                          "conversations",
                          "conversationLinks",
                        ].includes(key)
                      )
                        throw new Error("Unsupported property: " + key);
                      props[key] = deserialize(value, m, defs);
                    }
                    for (const p of selected.$descriptor.properties) {
                      if (
                        p.isVirtual ||
                        p.name === "id" ||
                        [
                          "flowElements",
                          "artifacts",
                          "laneSets",
                          "participants",
                          "messageFlows",
                          "conversations",
                          "conversationLinks",
                        ].includes(p.name)
                      )
                        continue;
                      if (selected[p.name] !== undefined && !(p.name in props))
                        props[p.name] = p.isMany ? [] : undefined;
                    }
                    edit(selected, props);
                    setRevision((r) => r + 1);
                    notify(
                      en ? "BPMN definition saved" : "Definição BPMN salva",
                    );
                  } catch (e) {
                    notify(String(e));
                  }
                }}
              >
                <Save size={14} />
                {en ? "Save definition" : "Salvar definição"}
              </button>
              <p className="field-help">
                {en
                  ? 'Nested elements use {"$type":"bpmn:Operation", ...}; references use {"$ref":"Element_ID"}.'
                  : 'Elementos internos usam {"$type":"bpmn:Operation", ...}; referências usam {"$ref":"ID_do_elemento"}.'}
              </p>
            </>
          ) : (
            <div className="property-empty">
              <Code2 size={32} />
              <p>
                {en
                  ? "Select a definition to inspect its BPMN properties."
                  : "Selecione uma definição para inspecionar suas propriedades BPMN."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
