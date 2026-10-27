import { useState, type MouseEvent } from "react";
import {
  ChevronDown,
  MousePointer2,
  Move,
  Link2,
  Scan,
  Plus,
  Columns2,
  Rows3,
  Flag,
  Search,
  X,
} from "lucide-react";
import {
  catalog,
  catalogLabel,
  createCatalogShape,
  type CatalogItem,
} from "./catalog";
import type { Lang } from "./i18n";
export default function BpmnPalette({
  modeler,
  lang,
  simulation,
  selected,
  onMessage,
  onCatalog,
}: {
  modeler: any;
  lang: Lang;
  simulation: boolean;
  selected: any;
  onMessage: (s: string) => void;
  onCatalog: () => void;
}) {
  const [menu, setMenu] = useState<string | null>(null),
    [query, setQuery] = useState("");
  const en = lang === "en";
  if (!modeler || simulation) return null;
  const start = (e: MouseEvent, item: CatalogItem) => {
    try {
      if (item.connection) {
        modeler.get("elanConnectionTool").configure(lang, onMessage);
        modeler.get("elanConnectionTool").start(item.connection);
        setMenu(null);
        return;
      }
      const shape = createCatalogShape(modeler, item);
      modeler.get("create").start(e.nativeEvent, shape);
      setMenu(null);
      setQuery("");
    } catch (err) {
      onMessage(String(err));
    }
  };
  const group = (id: string, icon: string, label: string) => (
    <div className="palette-category" key={id}>
      <button
        title={label}
        aria-label={label}
        onMouseDown={(e) => {
          if (e.button === 0)
            start(
              e,
              catalog[id].find((i) => i.icon === icon) || catalog[id][0],
            );
        }}
      >
        <i className={icon} />
      </button>
      <button
        className="palette-arrow"
        aria-label={label + " · " + (en ? "types" : "tipos")}
        title={label + " · " + (en ? "types" : "tipos")}
        onClick={() => {
          setMenu(menu === id ? null : id);
          setQuery("");
        }}
      >
        <ChevronDown size={10} />
      </button>
    </div>
  );
  const tool = (service: string) => {
    const s = modeler.get(service);
    if (s.toggle) s.toggle();
    else if (s.activateSelection) s.activateSelection();
  };
  const addLane = () => {
    let p = selected;
    while (p && p.type !== "bpmn:Participant" && p.type !== "bpmn:Lane")
      p = p.parent;
    if (!p) {
      onMessage(
        en
          ? "Select a pool or lane before adding a lane."
          : "Selecione um pool ou uma raia antes de adicionar outra raia.",
      );
      return;
    }
    modeler.get("modeling").addLane(p, "bottom");
  };
  return (
    <>
      <div className="elan-palette">
        <div className="palette-tools">
          <button
            title={en ? "Select" : "Selecionar"}
            onClick={() => modeler.get("selection").select(null)}
          >
            <MousePointer2 size={17} />
          </button>
          <button
            title={en ? "Pan" : "Mover tela"}
            onClick={() => tool("handTool")}
          >
            <Move size={17} />
          </button>
          <button
            title={en ? "Connect" : "Conectar"}
            onClick={() => tool("globalConnect")}
          >
            <Link2 size={17} />
          </button>
          <button
            title={en ? "Lasso" : "Selecionar área"}
            onClick={() => tool("lassoTool")}
          >
            <Scan size={17} />
          </button>
        </div>
        <div className="palette-shapes">
          {group(
            "start",
            "bpmn-icon-start-event-none",
            en ? "Start event" : "Evento inicial",
          )}
          {group("task", "bpmn-icon-task", en ? "Task" : "Tarefa")}
          {group(
            "subprocess",
            "bpmn-icon-subprocess-collapsed",
            en ? "Subprocess" : "Subprocesso",
          )}
          {group(
            "gateway",
            "bpmn-icon-gateway-xor",
            en ? "Gateway" : "Gateway",
          )}
          {group(
            "intermediate",
            "bpmn-icon-intermediate-event-none",
            en ? "Intermediate event" : "Evento intermediário",
          )}
          {group(
            "end",
            "bpmn-icon-end-event-none",
            en ? "End event" : "Evento final",
          )}
          {group(
            "boundary",
            "bpmn-icon-intermediate-event-catch-timer",
            en ? "Boundary event" : "Evento de borda",
          )}
          {group(
            "connections",
            "bpmn-icon-connection-multi",
            en ? "Connections" : "Conexões",
          )}
        </div>
        <div className="palette-containers">
          <button
            title={en ? "Pool" : "Pool"}
            onMouseDown={(e) => {
              const shape = modeler
                .get("elementFactory")
                .createParticipantShape();
              modeler.get("create").start(e.nativeEvent, shape);
            }}
          >
            <Columns2 size={25} />
          </button>
          <button title={en ? "Add lane" : "Adicionar raia"} onClick={addLane}>
            <Rows3 size={25} />
          </button>
          {group("data", "bpmn-icon-data-object", en ? "Data" : "Dados")}
          {group("artifact", "bpmn-icon-group", en ? "Artifacts" : "Artefatos")}
          {group(
            "conversation",
            "bpmn-icon-gateway-none",
            en ? "Conversation" : "Conversação",
          )}
        </div>
        <button
          className="catalog-button"
          title={en ? "Full BPMN catalog" : "Catálogo BPMN completo"}
          onClick={onCatalog}
        >
          <Plus size={13} />
          <span>BPMN</span>
        </button>
      </div>
      {menu && (
        <div
          className="palette-menu"
          style={{
            top:
              menu === "start" || menu === "task"
                ? 87
                : menu === "subprocess" || menu === "gateway"
                  ? 128
                  : menu === "intermediate" || menu === "end"
                    ? 169
                    : menu === "boundary"
                      ? 209
                      : 290,
          }}
        >
          <div className="palette-menu-heading">
            <strong>{en ? "Choose a type" : "Escolha um tipo"}</strong>
            <button
              onClick={() => setMenu(null)}
              title={en ? "Close" : "Fechar"}
            >
              <X size={14} />
            </button>
          </div>
          {catalog[menu].length > 10 && (
            <div className="palette-filter">
              <Search size={13} />
              <input
                autoFocus
                placeholder={en ? "Filter…" : "Filtrar…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <div className="palette-menu-list">
            {catalog[menu]
              .filter((i) =>
                (i.pt + " " + i.en).toLowerCase().includes(query.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.id}
                  title={catalogLabel(item, lang)}
                  onMouseDown={(e) => {
                    if (e.button === 0) start(e, item);
                  }}
                >
                  <i className={item.icon} />
                  <span>{catalogLabel(item, lang)}</span>
                </button>
              ))}
          </div>
          {menu === "boundary" && (
            <small>
              {en
                ? "Drop on the edge of an activity."
                : "Solte na borda de uma atividade."}
            </small>
          )}
        </div>
      )}
    </>
  );
}
