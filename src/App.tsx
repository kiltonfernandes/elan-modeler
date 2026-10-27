import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Plus,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  MousePointer2,
  Move,
  Link2,
  Scan,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Maximize2,
  Minus,
  Search,
  FileText,
  GitBranch,
  Layers,
  Settings2,
  MoreHorizontal,
  X,
  Trash2,
  Download,
  Upload,
  Image as ImageIcon,
  Globe,
  History,
  HelpCircle,
  PanelRightClose,
  PanelRightOpen,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Copy,
  Square,
  MessageSquare,
  ShieldCheck,
  HardDrive,
  FileCode2,
  LayoutGrid,
  Network,
  Diamond,
  ArrowRight,
  ExternalLink,
  Flag,
  LayoutTemplate,
  GripVertical,
  Cloud,
} from "lucide-react";
import CloudPanel from "./CloudPanel";
import type { CloudModel, CloudSummary } from "../shared/cloud";
import Modeler from "./HybridModeler";
import { choreographyXML, conversationXML } from "./special-models";
import BpmnPalette from "./BpmnPalette";
import SemanticEditor from "./SemanticEditor";
import DefinitionsEditor from "./DefinitionsEditor";
import {
  catalog,
  catalogLabel,
  createCatalogShape,
  type CatalogItem,
} from "./catalog";
import TokenSimulation from "bpmn-js-token-simulation";
import { layoutProcess } from "bpmn-auto-layout";
import {
  graphXML,
  recruitment,
  blankGraph,
  elanDescriptor,
  uid,
  esc,
} from "./model";
import {
  download,
  exportXPDL,
  importXPDL,
  exportVDX,
  importVisio,
  xmlDocument,
  rasterize,
} from "./interchange";
import {
  reportHTML,
  exportWord,
  exportCSV,
  exportExcel,
  exportPDF,
} from "./reports";
import {
  initialProject,
  parseProject,
  STORAGE_KEY,
  type Project,
  type Snapshot,
} from "./storage";
import { strings, friendlyType, type Lang, type Key } from "./i18n";
import { validateXML, type Issue } from "./validation";

const translations: Record<string, string> = {
  "Activate hand tool": "Mover a tela",
  "Activate lasso tool": "Selecionar área",
  "Activate create/remove space tool": "Criar/remover espaço",
  "Activate global connect tool": "Conectar elementos",
  "Append intermediate/boundary event":
    "Adicionar evento intermediário/de borda",
  "Add text annotation": "Adicionar anotação",
  Delete: "Excluir",
  "Connect to other element": "Conectar com outro elemento",
  "Activate the hand tool": "Mover a tela",
  "Activate the lasso tool": "Selecionar área",
  "Activate the create/remove space tool": "Criar/remover espaço",
  "Activate the global connect tool": "Conectar elementos",
  "Create start event": "Criar evento inicial",
  "Create intermediate/boundary event": "Criar evento intermediário/de borda",
  "Create end event": "Criar evento final",
  "Create gateway": "Criar gateway",
  "Create task": "Criar tarefa",
  "Create expanded sub-process": "Criar subprocesso expandido",
  "Create data object reference": "Criar objeto de dados",
  "Create data store reference": "Criar armazenamento de dados",
  "Create pool/participant": "Criar pool/participante",
  "Create group": "Criar grupo",
  "Append task": "Adicionar tarefa",
  "Append gateway": "Adicionar gateway",
  "Append end event": "Adicionar evento final",
  "Append intermediate event": "Adicionar evento intermediário",
  "Append text annotation": "Adicionar anotação",
  "Connect using sequence/message flow or association":
    "Conectar com fluxo ou associação",
  "Change element": "Alterar elemento",
  Remove: "Excluir",
  "Start Event": "Evento inicial",
  "End Event": "Evento final",
  "Intermediate Throw Event": "Evento intermediário de lançamento",
  "Intermediate Catch Event": "Evento intermediário de captura",
  Task: "Tarefa",
  "User Task": "Tarefa de usuário",
  "Manual Task": "Tarefa manual",
  "Service Task": "Tarefa de serviço",
  "Script Task": "Tarefa de script",
  "Send Task": "Tarefa de envio",
  "Receive Task": "Tarefa de recebimento",
  "Business Rule Task": "Tarefa de regra de negócio",
  "Sub Process (collapsed)": "Subprocesso (recolhido)",
  "Sub Process (expanded)": "Subprocesso (expandido)",
  "Call Activity": "Atividade de chamada",
  "Exclusive Gateway": "Gateway exclusivo",
  "Parallel Gateway": "Gateway paralelo",
  "Inclusive Gateway": "Gateway inclusivo",
  "Complex Gateway": "Gateway complexo",
  "Event based Gateway": "Gateway baseado em eventos",
  "Message Start Event": "Evento inicial de mensagem",
  "Timer Start Event": "Evento inicial de tempo",
  "Signal Start Event": "Evento inicial de sinal",
  "Conditional Start Event": "Evento inicial condicional",
  "Message End Event": "Evento final de mensagem",
  "Signal End Event": "Evento final de sinal",
  "Terminate End Event": "Evento final de término",
  "Error End Event": "Evento final de erro",
  "Escalation End Event": "Evento final de escalação",
  "Compensation End Event": "Evento final de compensação",
  "Timer Intermediate Catch Event": "Evento intermediário de tempo",
  "Message Intermediate Catch Event":
    "Evento intermediário de captura de mensagem",
  "Signal Intermediate Catch Event": "Evento intermediário de captura de sinal",
  "Message Intermediate Throw Event":
    "Evento intermediário de envio de mensagem",
  Loop: "Repetição",
  "Parallel Multi Instance": "Múltiplas instâncias paralelas",
  "Sequential Multi Instance": "Múltiplas instâncias sequenciais",
  "Add Lane above": "Adicionar raia acima",
  "Add Lane below": "Adicionar raia abaixo",
  "Divide into two Lanes": "Dividir em duas raias",
  "Divide into three Lanes": "Dividir em três raias",
  "Remove Lane": "Excluir raia",
  "Activate the sub-process tool": "Criar subprocesso",
  "Expand Sub Process": "Expandir subprocesso",
  "Collapse Sub Process": "Recolher subprocesso",
  "Open Sub Process": "Abrir subprocesso",
  Search: "Buscar",
  "No results found": "Nenhum resultado",
  "Default Flow": "Fluxo padrão",
  "Conditional Flow": "Fluxo condicional",
  "Sequence Flow": "Fluxo de sequência",
  "Message Flow": "Fluxo de mensagem",
  Association: "Associação",
  "Text Annotation": "Anotação de texto",
};
function translatedTitle(value: string) {
  const parts: Record<string, string> = {
    "Create collapsed SubChoreography": "Criar subcoreografia recolhida",
    "Create expanded SubChoreography": "Criar subcoreografia expandida",
    "Create collapsed Call Choreography": "Criar chamada de coreografia",
    "Create ChoreographyTask": "Criar tarefa de coreografia",
    "Create StartEvent": "Criar evento inicial",
    "Create IntermediateThrowEvent": "Criar evento intermediário",
    "Create EndEvent": "Criar evento final",
    "Create ExclusiveGateway": "Criar gateway exclusivo",
    "Create ParallelGateway": "Criar gateway paralelo",
    "Create EventBasedGateway": "Criar gateway de eventos",
    "Activate the lasso tool": "Selecionar área",
    "Activate the create/remove space tool": "Criar/remover espaço",
    "Rename this choreography": "Renomear coreografia",
    "Delete this choreography": "Excluir coreografia",
    "Add a new choreography": "Adicionar coreografia",
    "Add participant above": "Adicionar participante acima",
    "Add participant below": "Adicionar participante abaixo",
    "Remove participant": "Remover participante",
  };
  if (parts[value]) return parts[value];
  const words: [string, string][] = [
    ["Parallel Multiple", "Múltiplo paralelo"],
    ["Intermediate Throw Event", "Evento intermediário de lançamento"],
    ["Intermediate Catch Event", "Evento intermediário de captura"],
    ["Non Interrupting", "Não interruptivo"],
    ["Non-interrupting", "Não interruptivo"],
    ["Boundary Event", "Evento de borda"],
    ["Start Event", "Evento inicial"],
    ["End Event", "Evento final"],
    ["Message", "Mensagem"],
    ["Signal", "Sinal"],
    ["Timer", "Temporizador"],
    ["Conditional", "Condicional"],
    ["Compensation", "Compensação"],
    ["Compensate", "Compensação"],
    ["Escalation", "Escalação"],
    ["Error", "Erro"],
    ["Cancel", "Cancelamento"],
    ["Terminate", "Término"],
    ["Multiple", "Múltiplo"],
  ];
  let result = value;
  for (const [from, to] of words) result = result.replaceAll(from, to);
  return result
    .replace(/^Open /, "Abrir ")
    .replace(/^Create /, "Criar ")
    .replace(/^Append /, "Adicionar ");
}
const taskTypes = [
  "Task",
  "UserTask",
  "ManualTask",
  "ServiceTask",
  "ScriptTask",
  "BusinessRuleTask",
  "SendTask",
  "ReceiveTask",
  "SubProcess",
  "CallActivity",
];
const gatewayTypes = [
  "ExclusiveGateway",
  "ParallelGateway",
  "InclusiveGateway",
  "EventBasedGateway",
  "ComplexGateway",
];
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseProject(raw) : initialProject();
  } catch {
    return initialProject();
  }
}
function Button({
  children,
  onClick,
  title,
  active,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`tool-btn ${active ? "active" : ""} ${className}`}
      title={title}
      aria-label={title}
      aria-pressed={active === undefined ? undefined : active}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem("elan-language") === "en" ? "en" : "pt-BR";
    } catch {
      return "pt-BR";
    }
  });
  const langRef = useRef(lang);
  langRef.current = lang;
  const t = (k: Key) => strings[lang][k];
  const [project, setProject] = useState<Project>(loadInitial);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudModel, setCloudModel] = useState<CloudSummary | null>(() => {
    try {
      const link = JSON.parse(
        sessionStorage.getItem("elan-cloud-link") || "null",
      );
      return link?.projectMarker === project.activeId &&
        typeof link.model?.id === "string" &&
        Number.isSafeInteger(link.model.revision)
        ? link.model
        : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      if (!cloudModel) sessionStorage.removeItem("elan-cloud-link");
      else {
        const {
          id,
          name,
          revision,
          diagramCount,
          createdAt,
          updatedAt,
          archivedAt,
        } = cloudModel;
        sessionStorage.setItem(
          "elan-cloud-link",
          JSON.stringify({
            projectMarker: project.activeId,
            model: {
              id,
              name,
              revision,
              diagramCount,
              createdAt,
              updatedAt,
              archivedAt,
            },
          }),
        );
      }
    } catch {
      /* Cloud links are optional; local projects remain available. */
    }
  }, [cloudModel, project.activeId]);
  const projectRef = useRef(project);
  projectRef.current = project;
  const [tab, setTab] = useState<Key>("home"),
    [panel, setPanel] = useState<
      "properties" | "documentation" | "attributes" | "comments"
    >("properties");
  const [selection, setSelection] = useState<any>(null),
    [revision, setRevision] = useState(0),
    [query, setQuery] = useState(""),
    [zoom, setZoom] = useState(1),
    [simulation, setSimulation] = useState(false),
    [rightOpen, setRightOpen] = useState(true),
    [presentation, setPresentation] = useState(false);
  const [modal, setModal] = useState<
      | "new"
      | "validation"
      | "history"
      | "help"
      | "warnings"
      | "catalog"
      | "source"
      | "library"
      | "definitions"
      | null
    >(null),
    [issues, setIssues] = useState<Issue[]>([]),
    [warnings, setWarnings] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [newName, setNewName] = useState(""),
    [template, setTemplate] = useState("blank"),
    [saved, setSaved] = useState(true),
    [root, setRoot] = useState<any>(null),
    [roots, setRoots] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("elan-versions") || "[]");
    } catch {
      return [];
    }
  });
  const [engineKind, setEngineKind] = useState("process");
  const [catalogSearch, setCatalogSearch] = useState(""),
    [xmlSource, setXmlSource] = useState("");
  const [comment, setComment] = useState(""),
    [author, setAuthor] = useState(""),
    [customKey, setCustomKey] = useState(""),
    [customValue, setCustomValue] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null),
    modelerRef = useRef<any>(null),
    fileRef = useRef<HTMLInputElement>(null),
    attrFileRef = useRef<HTMLInputElement>(null),
    importing = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    initialized = useRef(false),
    recoveryNeeded = useRef(false),
    busyRef = useRef(false),
    mounted = useRef(true);
  const notify = (s: string) => {
    setToast(s);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  };
  const persist = (p: Project) => {
    projectRef.current = p;
    setProject(p);
    try {
      if (!recoveryNeeded.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        setSaved(true);
      }
    } catch {
      setSaved(false);
      notify(strings[langRef.current].autosaveError);
    }
  };
  const capture = async () => {
    const m = modelerRef.current;
    if (!m || !initialized.current || importing.current)
      return projectRef.current;
    clearTimeout(timer.current);
    timer.current = undefined;
    const docId = projectRef.current.activeId;
    const { xml } = await m.saveXML({ format: true });
    const p = projectRef.current;
    if (p.activeId !== docId) return p;
    const next = {
      ...p,
      diagrams: p.diagrams.map((d) => (d.id === docId ? { ...d, xml } : d)),
      updated: new Date().toISOString(),
    };
    persist(next);
    return next;
  };
  const getXML = async () => {
    const p = await capture();
    return p.diagrams.find((d) => d.id === p.activeId)!.xml;
  };
  const act = async (fn: () => unknown | Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const fitCanvas = () => {
    const c = modelerRef.current?.get("canvas");
    if (!c) return;
    const box = c.viewbox(),
      b = box.inner;
    if (!b.width || !b.height) return;
    const left = 140,
      right = 36,
      top = 85,
      bottom = 100;
    const scale = Math.min(
      Math.max(150, box.outer.width - left - right) / b.width,
      Math.max(150, box.outer.height - top - bottom) / b.height,
      1,
    );
    const extraX = Math.max(
        0,
        (box.outer.width - left - right - b.width * scale) / 2,
      ),
      extraY = Math.max(
        0,
        (box.outer.height - top - bottom - b.height * scale) / 2,
      );
    c.viewbox({
      x: b.x - (left + extraX) / scale,
      y: b.y - (top + extraY) / scale,
      width: box.outer.width / scale,
      height: box.outer.height / scale,
    });
  };
  const updateRoots = () => {
    const m = modelerRef.current;
    if (!m) return;
    const c = m.get("canvas");
    setRoot(c.getRootElement());
    setRoots(
      (m.getDefinitions()?.diagrams || [])
        .filter(
          (d: any) =>
            d.plane?.bpmnElement?.$instanceOf("bpmn:Collaboration") ||
            d.plane?.bpmnElement?.$type === "bpmn:Process",
        )
        .map((d: any) => ({ id: d.id, businessObject: d.plane.bpmnElement })),
    );
  };
  const openXML = async (xml: string) => {
    const m = modelerRef.current;
    importing.current = true;
    try {
      m.get("toggleMode").toggleMode(false);
      const d = xmlDocument(xml);
      if (d.documentElement.localName !== "definitions")
        throw new Error(
          langRef.current === "en"
            ? "Expected BPMN definitions."
            : "O arquivo não contém definições BPMN.",
        );
      let input = xml;
      if (!d.getElementsByTagNameNS("*", "BPMNDiagram").length) {
        const layout = await layoutProcess(xml);
        input = typeof layout === "string" ? layout : layout.xml;
        notify(
          langRef.current === "en"
            ? "Missing diagram coordinates: automatic layout applied."
            : "Sem coordenadas: aplicado layout automático.",
        );
      }
      const result = await m.importXML(input);
      fitCanvas();
      setSelection(null);
      setSimulation(false);
      updateRoots();
      initialized.current = true;
      setReady(true);
      if (result.warnings?.length) {
        setWarnings(result.warnings.map((w: any) => w.message));
        setModal("warnings");
      }
    } finally {
      importing.current = false;
    }
  };
  const selectRoot = (diagram: any) =>
    act(async () => {
      const c = m().get("canvas");
      const existing = c
        .getRootElements()
        .find((r: any) => r.businessObject === diagram.businessObject);
      if (existing) {
        c.setRootElement(existing);
        fitCanvas();
        return;
      }
      const previous = await getXML(),
        doc = xmlDocument(previous);
      const target = Array.from(
        doc.getElementsByTagNameNS("*", "BPMNDiagram"),
      ).find((d) => d.getAttribute("id") === diagram.id);
      if (!target) return;
      const first = doc.getElementsByTagNameNS("*", "BPMNDiagram")[0];
      first.parentNode!.insertBefore(target, first);
      try {
        await openXML(new XMLSerializer().serializeToString(doc));
        await capture();
      } catch (err) {
        await openXML(previous);
        throw err;
      }
    });
  useEffect(() => {
    mounted.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) parseProject(raw);
    } catch {
      recoveryNeeded.current = true;
      notify(strings[langRef.current].initialError);
    }
    function translate(
      template: string,
      replacements: Record<string, string> = {},
    ) {
      const value =
        langRef.current === "pt-BR"
          ? translations[template] || translatedTitle(template)
          : template;
      return value.replace(
        /\{([^}]+)\}/g,
        (_, key) => replacements[key] ?? `{${key}}`,
      );
    }
    const m = new Modeler({
      container: canvasRef.current,
      additionalModules: [TokenSimulation, { translate: ["value", translate] }],
      moddleExtensions: { elan: elanDescriptor },
      keyboard: { bindTo: document },
    });
    modelerRef.current = m;
    m.on("engine.changed", (e: any) => {
      setEngineKind(e.kind);
      setSelection(null);
    });
    m.on("selection.changed", (e: any) => {
      setSelection(e.newSelection[0] || null);
      setComment("");
      setRevision((r) => r + 1);
    });
    m.on("element.changed", () => setRevision((r) => r + 1));
    m.on("canvas.viewbox.changed", (e: any) => setZoom(e.viewbox.scale));
    m.on("root.set", () => {
      updateRoots();
      queueMicrotask(fitCanvas);
    });
    m.on("tokenSimulation.toggleMode", (e: any) => setSimulation(e.active));
    m.on("commandStack.changed", () => {
      if (importing.current) return;
      setSaved(false);
      setRevision((r) => r + 1);
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => capture().catch((e) => notify(String(e))),
        650,
      );
    });
    const active = projectRef.current.diagrams.find(
      (d) => d.id === projectRef.current.activeId,
    )!;
    openXML(active.xml).catch(async (e) => {
      notify(strings[langRef.current].initialError + " " + String(e));
      recoveryNeeded.current = true;
      await openXML(graphXML([recruitment(langRef.current === "en")]));
    });
    const before = (e: BeforeUnloadEvent) => {
      if (timer.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveModel();
      }
      if (e.key === "Escape") setPresentation(false);
    };
    window.addEventListener("beforeunload", before);
    window.addEventListener("keydown", keys);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      clearTimeout(toastTimer.current);
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("keydown", keys);
      m.destroy();
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("elan-language", lang);
    } catch {}
    const modeler = modelerRef.current;
    if (modeler && ready) {
      modeler.get("palette")._update();
      const current = modeler.get("selection").get();
      if (current.length === 1) modeler.get("contextPad").open(current[0]);
    }
    const toggle = canvasRef.current?.querySelector(".bts-toggle-mode");
    if (toggle?.firstChild)
      toggle.firstChild.textContent =
        lang === "en" ? "Token Simulation " : "Simulação de tokens ";
    modeler?.localize();
  }, [lang, simulation, ready, engineKind]);
  const m = () => modelerRef.current;
  const elements = ready
    ? m()
        .get("elementRegistry")
        .getAll()
        .filter(
          (e: any) =>
            !e.labelTarget &&
            !e.type.startsWith("label") &&
            !e.type.includes("Plane") &&
            !m().get("canvas").getRootElements().includes(e),
        )
    : [];
  const visibleElements = elements.filter(
    (e: any) =>
      e.businessObject?.$type &&
      !["bpmn:Process", "bpmn:Collaboration"].includes(e.businessObject.$type),
  );
  const shapes = visibleElements.filter((e: any) => !e.waypoints);
  const results = query.trim()
    ? visibleElements
        .filter((e: any) =>
          (e.businessObject.name || e.id)
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 25)
    : [];
  const activeDoc = project.diagrams.find((d) => d.id === project.activeId)!;
  const business = selection?.businessObject;
  const getAttrs = () =>
    Object.fromEntries(
      (
        business?.extensionElements?.values?.find(
          (x: any) => x.$type === "elan:Properties",
        )?.values || []
      ).map((v: any) => [v.name, v.value]),
    ) as Record<string, string>;
  const attrs = getAttrs();
  const elementName =
    business?.$type === "bpmn:TextAnnotation"
      ? business.text || ""
      : business?.$type === "bpmn:Group"
        ? business.categoryValueRef?.value || ""
        : business?.name || "";
  const prop = (name: string, value: unknown) => {
    if (selection && !simulation) {
      if (
        name === "name" &&
        ["bpmn:TextAnnotation", "bpmn:Group"].includes(business.$type)
      )
        m().get("modeling").updateLabel(selection, value);
      else
        m()
          .get("modeling")
          .updateProperties(selection, { [name]: value });
      setRevision((r) => r + 1);
    }
  };
  const setAttribute = (key: string, value: string | undefined) => {
    if (!selection) return;
    const moddle = m().get("moddle"),
      existing = business.extensionElements;
    const values = (existing?.values || []).filter(
      (v: any) => v.$type !== "elan:Properties",
    );
    const pairs = { ...getAttrs() };
    if (value === undefined) delete pairs[key];
    else pairs[key] = value;
    const properties = moddle.create("elan:Properties", {
      values: Object.entries(pairs).map(([name, value]) =>
        moddle.create("elan:Property", { name, value }),
      ),
    });
    prop(
      "extensionElements",
      moddle.create("bpmn:ExtensionElements", {
        values: [...values, properties],
      }),
    );
  };
  const focus = (el: any) => {
    if (!el) return;
    const c = m().get("canvas");
    const plane = c.findRoot(el);
    if (plane) c.setRootElement(plane);
    m().get("selection").select(el);
    c.scrollToElement(el);
    setQuery("");
  };
  const switchDiagram = async (id: string) => {
    if (id === projectRef.current.activeId) return;
    const p = await capture();
    const previous = p.activeId;
    const target = p.diagrams.find((d) => d.id === id);
    if (!target) return;
    try {
      await openXML(target.xml);
      persist({ ...p, activeId: id });
    } catch (e) {
      await openXML(p.diagrams.find((d) => d.id === previous)!.xml);
      throw e;
    }
  };
  async function saveModel() {
    await act(async () => {
      const p = await capture();
      download(
        JSON.stringify(p, null, 2),
        p.name + ".elan",
        "application/json",
      );
      notify(t("exported"));
    });
  }
  async function addDiagram() {
    await act(async () => {
      const p = await capture();
      const id = uid("Diagram"),
        name =
          newName.trim() ||
          (template === "recruitment" ? t("recruitment") : t("diagram"));
      const graph =
        template === "recruitment"
          ? recruitment(lang === "en")
          : template === "onboarding"
            ? recruitment(lang === "en").nodes.find((n) => n.children)!
                .children!
            : blankGraph(name);
      graph.name = name;
      const d = {
        id,
        name,
        xml:
          template === "choreography"
            ? choreographyXML(name, lang === "en")
            : template === "conversation"
              ? conversationXML(name, lang === "en")
              : graphXML([graph]),
      };
      await openXML(d.xml);
      persist({ ...p, diagrams: [...p.diagrams, d], activeId: id });
      setModal(null);
      setNewName("");
    });
  }
  const removeDiagram = (id: string) =>
    act(async () => {
      if (project.diagrams.length === 1 || !confirm(t("confirmDelete"))) return;
      const p = await capture();
      const diagrams = p.diagrams.filter((d) => d.id !== id);
      const activeId = p.activeId === id ? diagrams[0].id : p.activeId;
      if (activeId !== p.activeId)
        await openXML(diagrams.find((d) => d.id === activeId)!.xml);
      persist({ ...p, diagrams, activeId });
    });
  const renameDiagram = (id: string) => {
    const d = project.diagrams.find((d) => d.id === id)!;
    const name = prompt(t("newName"), d.name)?.trim();
    if (name)
      persist({
        ...projectRef.current,
        diagrams: projectRef.current.diagrams.map((d) =>
          d.id === id ? { ...d, name } : d,
        ),
      });
  };
  async function openFile(file: File) {
    await act(async () => {
      if (file.size > 25 * 1024 * 1024)
        throw new Error(
          lang === "en"
            ? "Maximum file size: 25 MiB."
            : "Tamanho máximo: 25 MiB.",
        );
      const name = file.name.toLowerCase();
      if (name.endsWith(".bpm") || name.endsWith(".bpmc"))
        throw new Error(t("nativeBpm"));
      if (name.endsWith(".vsd")) throw new Error(t("nativeVsd"));
      const previous = await capture();
      let xml: string,
        notes: string[] = [];
      if (name.endsWith(".elan") || name.endsWith(".json")) {
        const p = parseProject(await file.text());
        for (const d of p.diagrams) xmlDocument(d.xml);
        try {
          await openXML(p.diagrams.find((d) => d.id === p.activeId)!.xml);
          if (previous.diagrams.length)
            storeSnapshot(
              previous,
              lang === "en" ? "Before opening model" : "Antes de abrir modelo",
            );
          recoveryNeeded.current = false;
          persist(p);
          setCloudModel(null);
        } catch (e) {
          await openXML(
            previous.diagrams.find((d) => d.id === previous.activeId)!.xml,
          );
          throw e;
        }
        return;
      }
      if (/\.(vdx|vsdx)$/.test(name)) {
        const result = await importVisio(await file.arrayBuffer(), file.name);
        xml = result.xml;
        notes = result.warnings;
      } else {
        const raw = await file.text(),
          doc = xmlDocument(raw);
        if (doc.documentElement.localName === "Package") {
          const result = importXPDL(raw);
          xml = result.xml;
          notes = result.warnings;
        } else xml = raw;
      }
      const id = uid("Diagram"),
        d = {
          id,
          name: file.name.replace(/\.[^.]+$/, ""),
          xml,
          sourceXml: xml,
          sourceFilename: file.name,
        };
      try {
        await openXML(xml);
        persist({
          ...previous,
          diagrams: [...previous.diagrams, d],
          activeId: id,
        });
        if (notes.length) {
          setWarnings(notes);
          setModal("warnings");
        }
        notify(t("success"));
      } catch (e) {
        await openXML(
          previous.diagrams.find((d) => d.id === previous.activeId)!.xml,
        );
        throw e;
      }
    });
  }
  async function exportFile(format: string) {
    await act(async () => {
      const xml = await getXML(),
        name = activeDoc.name;
      const svg = (await m().saveSVG()).svg;
      if (format === "bpmn") download(xml, name + ".bpmn", "application/xml");
      else if (format === "xpdl") {
        download(exportXPDL(xml), name + ".xpdl", "application/xml");
        setWarnings([
          lang === "en"
            ? "Experimental XPDL 2.2 conversion. Review event details, artifacts, message flows and vendor extensions in the destination tool."
            : "Conversão XPDL 2.2 experimental. Revise eventos, artefatos, fluxos de mensagem e extensões no destino.",
        ]);
        setModal("warnings");
      } else if (format === "vdx") {
        download(exportVDX(xml), name + ".vdx", "application/xml");
        setWarnings([
          lang === "en"
            ? "Visio VDX contains generic shapes and connectors. BPMN stencils, lanes and nested contents are not preserved."
            : "Visio VDX contém formas e conectores genéricos. Stencils BPMN, raias e conteúdo aninhado não são preservados.",
        ]);
        setModal("warnings");
      } else if (format === "svg")
        download(svg, name + ".svg", "image/svg+xml");
      else if (format === "png" || format === "jpeg")
        download(
          await rasterize(svg, format),
          name + "." + (format === "jpeg" ? "jpg" : format),
          "image/" + format,
        );
      else if (format === "html")
        download(reportHTML(xml, svg, name, lang), name + ".html", "text/html");
      else if (format === "word") await exportWord(xml, svg, name, lang);
      else if (format === "csv") exportCSV(xml, name, lang);
      else if (format === "xlsx") await exportExcel(xml, name, lang);
      else if (format === "pdf") await exportPDF(xml, svg, name, lang);
      else if (format === "print") {
        const report = reportHTML(xml, svg, name, lang);
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;width:0;height:0;border:0";
        document.body.append(frame);
        frame.onload = () => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => frame.remove(), 60000);
        };
        frame.srcdoc = report;
      }
      notify(t("exported"));
    });
  }
  function storeSnapshot(p: Project, name: string) {
    const snap = {
      id: uid("Version"),
      name,
      created: new Date().toISOString(),
      project: structuredClone(p),
    };
    const next = [snap, ...snapshots].slice(0, 20);
    localStorage.setItem("elan-versions", JSON.stringify(next));
    setSnapshots(next);
    return next;
  }
  const takeSnapshot = () =>
    act(async () => {
      const p = await capture();
      const name = prompt(t("snapshotName"), new Date().toLocaleString(lang));
      if (name) {
        storeSnapshot(p, name);
        notify(t("success"));
      }
    });
  const restore = (s: Snapshot) =>
    act(async () => {
      if (!confirm(t("confirmRestore"))) return;
      const p = await capture();
      storeSnapshot(p, lang === "en" ? "Before restore" : "Antes de restaurar");
      await openXML(
        s.project.diagrams.find((d) => d.id === s.project.activeId)!.xml,
      );
      persist(structuredClone(s.project));
      setModal(null);
    });
  const exportAttributes = () =>
    act(async () => {
      await capture();
      const attrs = elements
        .filter(
          (e: any) => !e.labelTarget && e.businessObject?.extensionElements,
        )
        .map((e: any) => ({
          id: e.id,
          props:
            e.businessObject.extensionElements.values?.find(
              (v: any) => v.$type === "elan:Properties",
            )?.values || [],
        }));
      download(
        `<?xml version="1.0" encoding="UTF-8"?><elan:attributes xmlns:elan="https://elan-modeler.app/schema/1.0" version="1">${attrs.map((a: any) => `<elan:element id="${esc(a.id)}">${a.props.map((v: any) => `<elan:property name="${esc(v.name)}" value="${esc(v.value)}"/>`).join("")}</elan:element>`).join("")}</elan:attributes>`,
        activeDoc.name + "-attributes.xml",
        "application/xml",
      );
    });
  const importAttributes = (file: File) =>
    act(async () => {
      const d = xmlDocument(await file.text());
      if (
        d.documentElement.namespaceURI !==
          "https://elan-modeler.app/schema/1.0" ||
        d.documentElement.localName !== "attributes"
      )
        throw new Error(
          lang === "en"
            ? "Expected Élan attribute XML. Bizagi attribute XML is not compatible."
            : "Use XML de atributos Élan. O esquema XML de atributos Bizagi não é compatível.",
        );
      let count = 0;
      const moddle = m().get("moddle");
      for (const row of Array.from(d.getElementsByTagNameNS("*", "element"))) {
        const e = m().get("elementRegistry").get(row.getAttribute("id"));
        if (!e) continue;
        const props = Array.from(
          row.getElementsByTagNameNS("*", "property"),
        ).map((p) =>
          moddle.create("elan:Property", {
            name: p.getAttribute("name"),
            value: p.getAttribute("value"),
          }),
        );
        const others = (
          e.businessObject.extensionElements?.values || []
        ).filter((v: any) => v.$type !== "elan:Properties");
        m()
          .get("modeling")
          .updateProperties(e, {
            extensionElements: moddle.create("bpmn:ExtensionElements", {
              values: [
                ...others,
                moddle.create("elan:Properties", { values: props }),
              ],
            }),
          });
        count++;
      }
      notify(`${t("applied")}: ${count}`);
    });
  const check = () =>
    act(async () => {
      setIssues(validateXML(await getXML()));
      setModal("validation");
    });
  const startTool = (name: string) => {
    if (!ready || simulation) return;
    const service = m().get(name);
    service.toggle
      ? service.toggle()
      : service.activateSelection
        ? service.activateSelection()
        : service.activateHand
          ? service.activateHand()
          : null;
  };
  const addShape = (type: string, event: React.MouseEvent) => {
    if (!ready || simulation) return;
    const shape = m().get("elementFactory").createShape({ type });
    m().get("create").start(event.nativeEvent, shape);
  };
  const selectedAll = ready ? m().get("selection").get() : [];
  const align = (direction: string) => {
    if (selectedAll.length > 1)
      m().get("alignElements").trigger(selectedAll, direction);
  };
  const openSub = () => {
    if (!selection) return;
    const c = m().get("canvas"),
      plane = c.findRoot(selection.id + "_plane");
    if (plane) c.setRootElement(plane);
    else {
      const roots = c.getRootElements();
      const found = roots.find(
        (r: any) => r.businessObject === selection.businessObject,
      );
      if (found) c.setRootElement(found);
      else
        m().get("bpmnReplace").replaceElement(selection, {
          type: "bpmn:SubProcess",
          isExpanded: true,
        });
    }
  };
  const isSub = business?.$type === "bpmn:SubProcess";
  const fieldsKey = selection?.id + "_" + revision;
  return (
    <div className={`app ${presentation ? "presentation" : ""}`}>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setModal("help");
          }}
          aria-label="Élan Modeler"
        >
          <span className="brand-mark">
            é<span>↗</span>
          </span>
          <span>
            élan<span className="brand-modeler">modeler</span>
          </span>
        </a>
        <span className="header-divider" />
        <div className="model-title">
          <input
            aria-label={t("title")}
            value={project.name}
            onChange={(e) =>
              persist({ ...projectRef.current, name: e.target.value })
            }
          />
          <span>
            <HardDrive size={11} />
            {t("local")}
            <span className="tiny-dot" />
            {t("workspace")}
          </span>
        </div>
        <div className="header-right">
          {location.protocol !== "file:" && (
            <button
              className="cloud-header-button"
              title={lang === "en" ? "Cloud models" : "Modelos na nuvem"}
              onClick={() => setCloudOpen(true)}
              disabled={busy || !ready}
            >
              <Cloud size={17} />
              <span>{lang === "en" ? "Cloud" : "Nuvem"}</span>
            </button>
          )}
          <span className={`save-state ${saved ? "" : "unsaved"}`}>
            <CheckCircle2 size={14} />
            {saved ? t("saved") : t("changed")}
          </span>
          <button
            className="header-icon"
            onClick={() => setModal("help")}
            title={t("help")}
          >
            <HelpCircle size={19} />
          </button>
          <select
            aria-label="Language / Idioma"
            className="language"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="pt-BR">PT-BR</option>
            <option value="en">EN</option>
          </select>
          <span className="avatar">KF</span>
        </div>
      </header>
      <nav className="ribbon-tabs">
        {(
          ["home", "format", "view", "exchange", "publish", "tools"] as Key[]
        ).map((k) => (
          <button
            key={k}
            className={tab === k ? "selected" : ""}
            onClick={() => setTab(k)}
          >
            {t(k)}
          </button>
        ))}
        <button className="file-open" onClick={() => fileRef.current?.click()}>
          <FolderOpen size={14} />
          {t("open")}
        </button>
      </nav>
      <div className="ribbon">
        {tab === "home" && (
          <>
            <div className="ribbon-group">
              <Button
                title={t("newDiagram")}
                onClick={() => {
                  setTemplate("blank");
                  setModal("new");
                }}
                className="large"
              >
                <Plus size={24} />
                <span>{t("newDiagram")}</span>
              </Button>
              <Button title={t("save")} onClick={saveModel} className="large">
                <Save size={23} />
                <span>{t("save")}</span>
              </Button>
              <span className="group-caption">{t("model")}</span>
            </div>
            <div className="ribbon-group">
              <Button
                title={t("undo") + " · Ctrl+Z"}
                onClick={() => m().get("commandStack").undo()}
                disabled={
                  !ready || simulation || !m()?.get("commandStack").canUndo()
                }
              >
                <Undo2 size={19} />
              </Button>
              <Button
                title={t("redo") + " · Ctrl+Y"}
                onClick={() => m().get("commandStack").redo()}
                disabled={
                  !ready || simulation || !m()?.get("commandStack").canRedo()
                }
              >
                <Redo2 size={19} />
              </Button>
              <span className="group-caption">{t("editing")}</span>
            </div>
            <div className="ribbon-group">
              <Button
                title={t("select")}
                active={!simulation}
                onClick={() => {
                  m().get("globalConnect").cancel();
                  m().get("selection").select(null);
                }}
              >
                <MousePointer2 size={19} />
                <span>{t("select")}</span>
              </Button>
              <Button
                title={t("connect")}
                onClick={() => startTool("globalConnect")}
                disabled={simulation}
              >
                <Link2 size={19} />
                <span>{t("connect")}</span>
              </Button>
              <Button
                title={t("lasso")}
                onClick={() => startTool("lassoTool")}
                disabled={simulation}
              >
                <Scan size={19} />
              </Button>
              <span className="group-caption">{t("tools")}</span>
            </div>
            <div className="ribbon-group">
              <Button title={t("validate")} onClick={check} className="large">
                <ShieldCheck size={24} />
                <span>{t("validate")}</span>
              </Button>
              <Button
                title={simulation ? t("stopSimulation") : t("simulate")}
                active={simulation}
                onClick={() => m().get("toggleMode").toggleMode()}
                disabled={engineKind !== "process"}
                className="large"
              >
                {simulation ? <Pause size={24} /> : <Play size={24} />}
                <span>{t("simulate")}</span>
              </Button>
              <span className="group-caption">BPMN 2.0</span>
            </div>
            <div className="ribbon-group">
              <Button title={t("fit")} onClick={fitCanvas} className="large">
                <Maximize2 size={23} />
                <span>{t("fit")}</span>
              </Button>
              <span className="group-caption">{t("view")}</span>
            </div>
          </>
        )}
        {tab === "format" && (
          <>
            <div className="ribbon-group">
              <Button
                title={t("horizontal")}
                onClick={() => align("middle")}
                disabled={simulation || selectedAll.length < 2}
              >
                <AlignHorizontalJustifyCenter size={23} />
                <span>{t("horizontal")}</span>
              </Button>
              <Button
                title={t("vertical")}
                onClick={() => align("center")}
                disabled={simulation || selectedAll.length < 2}
              >
                <AlignVerticalJustifyCenter size={23} />
                <span>{t("vertical")}</span>
              </Button>
              <Button
                title={t("distribute")}
                disabled={simulation || selectedAll.length < 3}
                onClick={() =>
                  m()
                    .get("distributeElements")
                    .trigger(selectedAll, "horizontal")
                }
              >
                <GripVertical size={21} />
                <span>{t("distribute")}</span>
              </Button>
              <span className="group-caption">{t("format")}</span>
            </div>
            <div className="ribbon-group">
              {[
                "#fff",
                "#e8f1e9",
                "#eaf0fc",
                "#fff1d6",
                "#fbe6e2",
                "#eee7f8",
              ].map((color) => (
                <button
                  className="swatch"
                  title={color}
                  key={color}
                  style={{ background: color }}
                  disabled={!selection || simulation}
                  onClick={() =>
                    m()
                      .get("modeling")
                      .setColor(selectedAll, { fill: color, stroke: "#344b45" })
                  }
                />
              ))}
              <Button
                title={t("reset")}
                disabled={!selection || simulation}
                onClick={() =>
                  m().get("modeling").setColor(selectedAll, {
                    fill: undefined,
                    stroke: undefined,
                  })
                }
              >
                <Undo2 size={17} />
              </Button>
              <span className="group-caption">{t("fill")}</span>
            </div>
          </>
        )}
        {tab === "view" && (
          <>
            <div className="ribbon-group">
              <Button onClick={fitCanvas} title={t("fit")} className="large">
                <Maximize2 size={24} />
                <span>{t("fit")}</span>
              </Button>
              <Button
                onClick={() => startTool("handTool")}
                title={t("hand")}
                className="large"
              >
                <Move size={24} />
                <span>{t("hand")}</span>
              </Button>
              <Button
                onClick={() => setRightOpen(!rightOpen)}
                title={t("properties")}
                className="large"
              >
                <Settings2 size={24} />
                <span>{t("properties")}</span>
              </Button>
              <Button
                onClick={() => setPresentation(true)}
                title={t("presentation")}
                className="large"
              >
                <Scan size={24} />
                <span>{t("presentation")}</span>
              </Button>
              <span className="group-caption">{t("view")}</span>
            </div>
          </>
        )}
        {tab === "exchange" && (
          <>
            <div className="ribbon-group">
              <Button
                onClick={() => fileRef.current?.click()}
                title={t("import")}
                className="large"
              >
                <Upload size={24} />
                <span>{t("import")}</span>
              </Button>
              <Button
                onClick={saveModel}
                title={t("downloadModel")}
                className="large"
              >
                <Save size={24} />
                <span>.elan</span>
              </Button>
              <span className="group-caption">{t("model")}</span>
            </div>
            <div className="ribbon-group">
              {["bpmn", "xpdl", "vdx"].map((f) => (
                <Button
                  key={f}
                  onClick={() => exportFile(f)}
                  title={
                    f === "bpmn"
                      ? "BPMN 2.0"
                      : f === "xpdl"
                        ? "XPDL 2.2 · " + t("experimental")
                        : "Visio VDX · " + t("experimental")
                  }
                  className="large"
                >
                  <FileCode2 size={24} />
                  <span>
                    {f === "vdx" ? "Visio VDX" : f.toUpperCase()}
                    {f !== "bpmn" && <sup>β</sup>}
                  </span>
                </Button>
              ))}
              <span className="group-caption">{t("export")}</span>
            </div>
            <div className="ribbon-group">
              {["svg", "png", "jpeg"].map((f) => (
                <Button
                  key={f}
                  title={f.toUpperCase()}
                  onClick={() => exportFile(f)}
                  className="large"
                >
                  <ImageIcon size={23} />
                  <span>{f === "jpeg" ? "JPG" : f.toUpperCase()}</span>
                </Button>
              ))}
              <span className="group-caption">{t("image")}</span>
            </div>
            <div className="ribbon-group">
              <Button
                title={t("exportAttributes")}
                onClick={exportAttributes}
                className="large"
              >
                <Download size={24} />
                <span>{t("attributes")} XML</span>
              </Button>
              <Button
                title={t("importAttributes")}
                onClick={() => attrFileRef.current?.click()}
              >
                <Upload size={22} />
              </Button>
              <span className="group-caption">Élan XML</span>
            </div>
          </>
        )}
        {tab === "publish" && (
          <>
            <div className="ribbon-group">
              {(["pdf", "word", "html", "xlsx", "print", "csv"] as const).map(
                (f, i) => (
                  <Button
                    title={t(
                      (
                        ["pdf", "word", "web", "excel", "print", "csv"] as Key[]
                      )[i],
                    )}
                    key={f}
                    onClick={() => exportFile(f)}
                    className="large"
                  >
                    {f === "html" ? (
                      <Globe size={24} />
                    ) : (
                      <FileText size={24} />
                    )}
                    <span>
                      {t(
                        (
                          [
                            "pdf",
                            "word",
                            "web",
                            "excel",
                            "print",
                            "csv",
                          ] as Key[]
                        )[i],
                      )}
                    </span>
                  </Button>
                ),
              )}
              <span className="group-caption">{t("report")}</span>
            </div>
          </>
        )}
        {tab === "tools" && (
          <>
            <div className="ribbon-group">
              <Button title={t("validate")} onClick={check} className="large">
                <ShieldCheck size={24} />
                <span>{t("validate")}</span>
              </Button>
              <Button
                title={t("snapshot")}
                onClick={takeSnapshot}
                className="large"
              >
                <Save size={24} />
                <span>{t("snapshot")}</span>
              </Button>
              <Button
                title={t("version")}
                onClick={() => setModal("history")}
                className="large"
              >
                <History size={24} />
                <span>{t("version")}</span>
              </Button>
              <Button
                title={lang === "en" ? "BPMN definitions" : "Definições BPMN"}
                onClick={() => setModal("definitions")}
                className="large"
              >
                <Layers size={24} />
                <span>{lang === "en" ? "Definitions" : "Definições"}</span>
              </Button>
              <Button
                title="BPMN XML"
                onClick={() =>
                  act(async () => {
                    setXmlSource(await getXML());
                    setModal("source");
                  })
                }
                className="large"
              >
                <FileCode2 size={24} />
                <span>BPMN XML</span>
              </Button>
              <Button
                title={
                  lang === "en"
                    ? "Reusable processes"
                    : "Processos reutilizáveis"
                }
                onClick={() => setModal("library")}
                className="large"
              >
                <Layers size={24} />
                <span>
                  {lang === "en" ? "Reusable processes" : "Reutilizáveis"}
                </span>
              </Button>
              <Button
                title={t("help")}
                onClick={() => setModal("help")}
                className="large"
              >
                <HelpCircle size={24} />
                <span>{t("help")}</span>
              </Button>
              <span className="group-caption">{t("tools")}</span>
            </div>
          </>
        )}
        <div className="ribbon-tag">
          <span className="live-dot" />
          BPMN 2.0<span className="ribbon-tag-separator">/</span>
          <span>{t("editing")}</span>
        </div>
      </div>
      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <span>{t("workspace")}</span>
            <button title={t("newDiagram")} onClick={() => setModal("new")}>
              <Plus size={17} />
            </button>
          </div>
          <div className="project-folder">
            <ChevronDown size={14} />
            <FolderOpen size={17} />
            <span>{project.name}</span>
          </div>
          <div className="diagram-list">
            {project.diagrams.map((d, i) => (
              <div
                key={d.id}
                className={`diagram-item ${d.id === project.activeId ? "selected" : ""}`}
              >
                <button
                  className="diagram-main"
                  onClick={() => act(() => switchDiagram(d.id))}
                >
                  <GitBranch size={17} />
                  <span>{d.name}</span>
                  {d.id === project.activeId && <span className="item-dot" />}
                </button>
                <button
                  className="diagram-options"
                  title={t("rename")}
                  onClick={() => renameDiagram(d.id)}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="add-diagram"
            onClick={() => {
              setNewName("");
              setTemplate("blank");
              setModal("new");
            }}
          >
            <Plus size={15} />
            {t("newDiagram")}
          </button>
          <div className="sidebar-section">
            <span>{t("elements")}</span>
            <span className="count">{visibleElements.length}</span>
          </div>
          <div className="outline">
            {shapes
              .filter(
                (e: any) =>
                  e.type !== "bpmn:Lane" && e.type !== "bpmn:Participant",
              )
              .map((e: any) => (
                <button
                  key={e.id}
                  title={e.businessObject.name || e.id}
                  className={selection === e ? "active" : ""}
                  onClick={() => focus(e)}
                >
                  {/Gateway/.test(e.type) ? (
                    <Diamond size={14} />
                  ) : e.type === "bpmn:SubProcess" ? (
                    <Layers size={14} />
                  ) : (
                    <Square size={13} />
                  )}
                  <span>
                    {e.businessObject.name || friendlyType(e.type, lang)}
                  </span>
                  {e.type === "bpmn:SubProcess" && <ChevronRight size={12} />}
                </button>
              ))}
          </div>
          <div className="sidebar-bottom">
            <div className="tip-icon">
              <Network size={22} />
            </div>
            <strong>{t("modelHint")}</strong>
            <p>{t("localNotice")}</p>
            <button
              onClick={() => {
                setTemplate("recruitment");
                setModal("new");
              }}
            >
              {t("templates")}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="history-link" onClick={() => setModal("history")}>
            <History size={15} />
            {t("version")}
          </button>
        </aside>
        <section className="editor">
          <div className="canvas-heading">
            <div className="breadcrumb">
              <span>{t("diagrams")}</span>
              <ChevronRight size={14} />
              <strong>{activeDoc.name}</strong>
              {root?.businessObject?.$type === "bpmn:SubProcess" && (
                <>
                  <ChevronRight size={14} />
                  <strong>{root.businessObject.name || t("subprocess")}</strong>
                </>
              )}
            </div>
            <div className="canvas-actions">
              <div className="search-box">
                <Search size={15} />
                <input
                  placeholder={t("search")}
                  aria-label={t("search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button title={t("clearSearch")} onClick={() => setQuery("")}>
                    <X size={12} />
                  </button>
                )}
                {query && (
                  <div className="search-results">
                    {results.length ? (
                      results.map((e: any) => (
                        <button key={e.id} onClick={() => focus(e)}>
                          <GitBranch size={14} />
                          <span>{e.businessObject.name || e.id}</span>
                        </button>
                      ))
                    ) : (
                      <p>{t("noResults")}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                className="header-icon"
                title={t("properties")}
                onClick={() => setRightOpen(!rightOpen)}
              >
                {rightOpen ? (
                  <PanelRightClose size={18} />
                ) : (
                  <PanelRightOpen size={18} />
                )}
              </button>
            </div>
          </div>
          {simulation && (
            <div className="simulation-banner">
              <Play size={15} />
              <span>{t("simulationHint")}</span>
              <button onClick={() => m().get("toggleMode").toggleMode(false)}>
                <X size={16} />
              </button>
            </div>
          )}
          {recoveryNeeded.current && (
            <div className="recovery-banner">
              <AlertCircle size={16} />
              {t("initialError")}
              <button
                onClick={() => {
                  const raw = localStorage.getItem(STORAGE_KEY);
                  if (raw) download(raw, "recovery.elan", "application/json");
                }}
              >
                {t("recover")}
              </button>
            </div>
          )}
          <div
            className={`canvas-area ${engineKind === "process" ? "custom-palette" : "choreography-canvas"}`}
          >
            <div className="bpmn-canvas" ref={canvasRef} />
            {ready && engineKind === "process" && (
              <BpmnPalette
                modeler={m()}
                lang={lang}
                simulation={simulation}
                selected={selection}
                onMessage={notify}
                onCatalog={() => setModal("catalog")}
              />
            )}
            {!ready && <div className="canvas-loading">{t("loading")}</div>}
            <div className="canvas-label">
              <span className="canvas-label-dot" />
              {activeDoc.name}
            </div>
            <div className="canvas-footer">
              <span className="canvas-help">
                <MousePointer2 size={13} />
                {t("subprocessHint")}
              </span>
              <div className="zoom-controls">
                <Button title={t("fit")} onClick={fitCanvas}>
                  <Maximize2 size={15} />
                </Button>
                <span className="zoom-divider" />
                <Button
                  title="−"
                  onClick={() =>
                    m()
                      .get("canvas")
                      .zoom(Math.max(0.2, zoom - 0.1))
                  }
                >
                  <Minus size={15} />
                </Button>
                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                <Button
                  title="+"
                  onClick={() =>
                    m()
                      .get("canvas")
                      .zoom(Math.min(4, zoom + 0.1))
                  }
                >
                  <Plus size={15} />
                </Button>
              </div>
            </div>
          </div>
          <div className="bottom-tabs">
            {roots.length > 1 ? (
              roots.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRoot(r)}
                  className={
                    root?.businessObject === r.businessObject ? "selected" : ""
                  }
                >
                  <GitBranch size={14} />
                  {r.businessObject.name ||
                    r.businessObject.participants?.[0]?.name ||
                    r.id}
                </button>
              ))
            ) : (
              <button
                className="selected"
                onDoubleClick={() => renameDiagram(activeDoc.id)}
              >
                <GitBranch size={14} />
                {activeDoc.name}
              </button>
            )}
            <button
              title={t("newDiagram")}
              className="new-tab"
              onClick={() => setModal("new")}
            >
              <Plus size={16} />
            </button>
            <span className="tab-filler" />
            <button
              title={t("remove")}
              className="remove-tab"
              disabled={project.diagrams.length === 1}
              onClick={() => removeDiagram(project.activeId)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </section>
        {rightOpen && (
          <aside className="properties">
            <div className="property-heading">
              <div>
                <Settings2 size={17} />
                <strong>{t("properties")}</strong>
              </div>
              <span>
                {business ? friendlyType(business.$type, lang) : t("diagram")}
              </span>
            </div>
            <div className="property-tabs">
              {(
                [
                  "properties",
                  "documentation",
                  "attributes",
                  "comments",
                ] as const
              ).map((p, i) => (
                <button
                  key={p}
                  title={t(p)}
                  aria-label={t(p)}
                  onClick={() => setPanel(p)}
                  className={panel === p ? "selected" : ""}
                >
                  {i === 0 ? (
                    <Settings2 size={17} />
                  ) : i === 1 ? (
                    <FileText size={17} />
                  ) : i === 2 ? (
                    <Layers size={17} />
                  ) : (
                    <MessageSquare size={17} />
                  )}
                </button>
              ))}
            </div>
            {!selection ? (
              <div className="property-empty">
                <div className="empty-icon">
                  <MousePointer2 size={28} />
                </div>
                <h3>{t("selectionHint")}</h3>
                <p>{t("helpText")}</p>
                <div className="model-stats">
                  <div>
                    <strong>
                      {
                        shapes.filter((e: any) =>
                          /Task|SubProcess|CallActivity/.test(e.type),
                        ).length
                      }
                    </strong>
                    <span>{t("tasks")}</span>
                  </div>
                  <div>
                    <strong>
                      {visibleElements.filter((e: any) => e.waypoints).length}
                    </strong>
                    <span>{t("flows")}</span>
                  </div>
                  <div>
                    <strong>
                      {shapes.filter((e: any) => e.type === "bpmn:Lane").length}
                    </strong>
                    <span>{t("lanes")}</span>
                  </div>
                </div>
                <button className="secondary full" onClick={check}>
                  <ShieldCheck size={16} />
                  {t("validate")}
                </button>
              </div>
            ) : (
              <div className="property-content" key={selection.id}>
                <div className="selected-element">
                  <span className="element-icon">
                    {isSub ? (
                      <Layers size={22} />
                    ) : business.$type.includes("Gateway") ? (
                      <Diamond size={22} />
                    ) : (
                      <Square size={22} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {business.name || friendlyType(business.$type, lang)}
                    </strong>
                    <small>{friendlyType(business.$type, lang)}</small>
                  </div>
                </div>
                {panel === "properties" && (
                  <>
                    <div className="field-section-title">
                      {t("general")}
                      <ChevronDown size={14} />
                    </div>
                    <label>
                      {t("name")}
                      <input
                        key={fieldsKey + "name"}
                        defaultValue={elementName}
                        disabled={simulation}
                        onBlur={(e) => {
                          if (e.target.value !== elementName)
                            prop("name", e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    </label>
                    <label>
                      {t("id")}
                      <input value={selection.id} readOnly className="mono" />
                    </label>
                    <label>
                      {t("type")}
                      <select
                        value={business.$type.replace("bpmn:", "")}
                        disabled={simulation}
                        onChange={(e) => {
                          const el = m()
                            .get("bpmnReplace")
                            .replaceElement(selection, {
                              type: "bpmn:" + e.target.value,
                            });
                          m().get("selection").select(el);
                        }}
                      >
                        {(taskTypes.includes(
                          business.$type.replace("bpmn:", ""),
                        )
                          ? taskTypes
                          : gatewayTypes.includes(
                                business.$type.replace("bpmn:", ""),
                              )
                            ? gatewayTypes
                            : [business.$type.replace("bpmn:", "")]
                        ).map((type) => (
                          <option key={type} value={type}>
                            {friendlyType(type, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {isSub && (
                      <button
                        className="secondary full subprocess-button"
                        onClick={openSub}
                      >
                        <Layers size={16} />
                        {t("openSubprocess")}
                        <ArrowUpRight size={14} />
                      </button>
                    )}
                    <SemanticEditor
                      modeler={m()}
                      element={selection}
                      lang={lang}
                      disabled={simulation}
                      notify={notify}
                      onSource={() =>
                        act(async () => {
                          setXmlSource(await getXML());
                          setModal("source");
                        })
                      }
                      onLibrary={() => setModal("library")}
                    />
                    <div className="field-section-title">
                      {t("details")}
                      <ChevronDown size={14} />
                    </div>
                    {[
                      ["owner", t("owner")],
                      ["duration", t("duration")],
                      ["cost", t("cost")],
                    ].map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          key={fieldsKey + key}
                          defaultValue={attrs[key] || ""}
                          disabled={simulation}
                          type={key === "owner" ? "text" : "number"}
                          min={0}
                          step="any"
                          onBlur={(e) => {
                            if (e.target.value !== (attrs[key] || ""))
                              setAttribute(key, e.target.value);
                          }}
                          placeholder="—"
                        />
                      </label>
                    ))}
                    <div className="field-section-title">
                      {t("color")}
                      <ChevronDown size={14} />
                    </div>
                    <div className="property-swatches">
                      {[
                        "#ffffff",
                        "#e8f1e9",
                        "#eaf0fc",
                        "#fff1d6",
                        "#fbe6e2",
                        "#eee7f8",
                      ].map((color) => (
                        <button
                          className="swatch"
                          title={color}
                          key={color}
                          style={{ background: color }}
                          disabled={simulation}
                          onClick={() =>
                            m().get("modeling").setColor([selection], {
                              fill: color,
                              stroke: "#344b45",
                            })
                          }
                        />
                      ))}
                    </div>
                    <button
                      className="danger-text"
                      disabled={simulation}
                      onClick={() =>
                        m().get("modeling").removeElements([selection])
                      }
                    >
                      <Trash2 size={14} />
                      {t("delete")}
                    </button>
                  </>
                )}
                {panel === "documentation" && (
                  <>
                    <div className="field-section-title">
                      {t("documentation")}
                    </div>
                    <label>
                      {t("description")}
                      <textarea
                        key={fieldsKey + "doc"}
                        rows={15}
                        defaultValue={
                          business.documentation
                            ?.map((d: any) => d.text)
                            .join("\n") || ""
                        }
                        disabled={simulation}
                        onBlur={(e) => {
                          const old =
                            business.documentation
                              ?.map((d: any) => d.text)
                              .join("\n") || "";
                          if (e.target.value !== old)
                            prop(
                              "documentation",
                              e.target.value
                                ? [
                                    m()
                                      .get("moddle")
                                      .create("bpmn:Documentation", {
                                        text: e.target.value,
                                      }),
                                  ]
                                : [],
                            );
                        }}
                      />
                    </label>
                    <p className="field-help">{t("localNotice")}</p>
                  </>
                )}
                {panel === "attributes" && (
                  <>
                    <div className="field-section-title">{t("attributes")}</div>
                    <p className="field-help">{t("attributesHint")}</p>
                    {Object.entries(attrs).map(([key, value]) => (
                      <label key={key}>
                        {key}
                        <div className="attribute-value">
                          <input
                            defaultValue={value}
                            key={fieldsKey + key}
                            disabled={simulation}
                            onBlur={(e) => setAttribute(key, e.target.value)}
                          />
                          <button
                            title={t("delete")}
                            disabled={simulation}
                            onClick={() => setAttribute(key, undefined)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </label>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customKey.trim()) {
                          setAttribute(customKey.trim(), customValue);
                          setCustomKey("");
                          setCustomValue("");
                        }
                      }}
                    >
                      <label>
                        {t("customKey")}
                        <input
                          required
                          value={customKey}
                          disabled={simulation}
                          onChange={(e) => setCustomKey(e.target.value)}
                        />
                      </label>
                      <label>
                        {t("customValue")}
                        <input
                          value={customValue}
                          disabled={simulation}
                          onChange={(e) => setCustomValue(e.target.value)}
                        />
                      </label>
                      <button className="secondary full" disabled={simulation}>
                        <Plus size={15} />
                        {t("add")}
                      </button>
                    </form>
                  </>
                )}
                {panel === "comments" && (
                  <>
                    <div className="field-section-title">{t("comments")}</div>
                    {project.comments
                      .filter(
                        (c) =>
                          c.diagramId === project.activeId &&
                          c.elementId === selection.id,
                      )
                      .map((c) => (
                        <div
                          className={`comment ${c.resolved ? "resolved" : ""}`}
                          key={c.id}
                        >
                          <strong>{c.author || t("local")}</strong>
                          <small>
                            {new Date(c.created).toLocaleString(lang)}
                          </small>
                          <p>{c.text}</p>
                          <button
                            onClick={() =>
                              persist({
                                ...projectRef.current,
                                comments: projectRef.current.comments.map(
                                  (x) =>
                                    x.id === c.id
                                      ? { ...x, resolved: !x.resolved }
                                      : x,
                                ),
                              })
                            }
                          >
                            <Check size={12} />
                            {c.resolved ? t("resolved") : t("resolve")}
                          </button>
                          <button
                            title={t("delete")}
                            onClick={() =>
                              persist({
                                ...projectRef.current,
                                comments: projectRef.current.comments.filter(
                                  (x) => x.id !== c.id,
                                ),
                              })
                            }
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (comment.trim()) {
                          persist({
                            ...projectRef.current,
                            comments: [
                              ...projectRef.current.comments,
                              {
                                id: uid("Comment"),
                                diagramId: project.activeId,
                                elementId: selection.id,
                                author,
                                text: comment.trim(),
                                created: new Date().toISOString(),
                                resolved: false,
                              },
                            ],
                          });
                          setComment("");
                        }
                      }}
                    >
                      <input
                        aria-label={t("author")}
                        placeholder={t("author")}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                      />
                      <textarea
                        required
                        placeholder={t("commentPlaceholder")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                      />
                      <button className="secondary full">
                        <Plus size={15} />
                        {t("add")}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
            <div className="property-bottom">
              <ShieldCheck size={13} />
              <span>BPMN 2.0 · Élan Modeler</span>
            </div>
          </aside>
        )}
      </main>
      <footer className="status-bar">
        <span>
          <span className="live-dot" />
          {busy ? t("working") : t("ready")}
        </span>
        <span>
          {visibleElements.length} {t("elements").toLowerCase()}
          <span className="status-dot">·</span>
          {shapes.filter((e: any) => e.type === "bpmn:Lane").length}{" "}
          {t("lanes").toLowerCase()}
        </span>
        <span className="status-right">
          <HardDrive size={12} />
          {t("local")}
          <span className="status-dot">·</span>Élan Modeler 0.1.0
        </span>
      </footer>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".elan,.json,.bpmn,.xml,.xpdl,.vdx,.vsdx,.vsd,.bpm,.bpmc"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={attrFileRef}
        hidden
        type="file"
        accept=".xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importAttributes(f);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <AlertCircle size={17} />
          <span>{toast}</span>
          <button title={t("close")} onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {presentation && (
        <button
          className="exit-presentation"
          onClick={() => setPresentation(false)}
        >
          <X size={18} />
          {t("close")} · Esc
        </button>
      )}
      {cloudOpen && (
        <CloudPanel
          lang={lang}
          current={cloudModel}
          capture={capture}
          onSaved={setCloudModel}
          onClose={() => setCloudOpen(false)}
          onOpen={async (model: CloudModel) => {
            const previous = await capture();
            const next = parseProject(JSON.stringify(model.project));
            for (const diagram of next.diagrams) xmlDocument(diagram.xml);
            try {
              await openXML(
                next.diagrams.find((d) => d.id === next.activeId)!.xml,
              );
              storeSnapshot(
                previous,
                lang === "en"
                  ? "Before opening cloud model"
                  : "Antes de abrir modelo da nuvem",
              );
              recoveryNeeded.current = false;
              persist(next);
              setCloudModel(model);
            } catch (error) {
              await openXML(
                previous.diagrams.find((d) => d.id === previous.activeId)!.xml,
              );
              throw error;
            }
          }}
        />
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className={`modal ${["help", "catalog", "source", "library", "definitions"].includes(modal) ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <h2 id="modal-title">
                {modal === "new"
                  ? t("newDiagram")
                  : modal === "validation"
                    ? t("issues")
                    : modal === "history"
                      ? t("version")
                      : modal === "help"
                        ? t("help")
                        : modal === "catalog"
                          ? lang === "en"
                            ? "BPMN catalog"
                            : "Catálogo BPMN"
                          : modal === "source"
                            ? "BPMN XML"
                            : modal === "library"
                              ? lang === "en"
                                ? "Reusable process library"
                                : "Biblioteca de processos reutilizáveis"
                              : modal === "definitions"
                                ? lang === "en"
                                  ? "BPMN definitions"
                                  : "Definições BPMN"
                                : t("experimental")}
              </h2>
              <button title={t("close")} onClick={() => setModal(null)}>
                <X size={20} />
              </button>
            </div>
            {modal === "new" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void addDiagram();
                }}
              >
                <label>
                  {t("newName")}
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t("diagram")}
                  />
                </label>
                <div className="template-options">
                  {[
                    "blank",
                    "recruitment",
                    "onboarding",
                    "choreography",
                    "conversation",
                  ].map((name, i) => (
                    <button
                      type="button"
                      className={template === name ? "selected" : ""}
                      key={name}
                      onClick={() => setTemplate(name)}
                    >
                      {i === 0 ? (
                        <Plus size={27} />
                      ) : i === 1 ? (
                        <GitBranch size={27} />
                      ) : (
                        <Layers size={27} />
                      )}
                      <strong>{t(name as Key)}</strong>
                      <span>
                        {i > 2
                          ? "BPMN 2.0"
                          : i === 0
                            ? "BPMN 2.0"
                            : i === 1
                              ? lang === "en"
                                ? "2 lanes · subprocess"
                                : "2 raias · subprocesso"
                              : lang === "en"
                                ? "Parallel activities"
                                : "Atividades paralelas"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setModal(null)}
                  >
                    {t("cancel")}
                  </button>
                  <button className="primary" disabled={busy}>
                    {t("create")}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            )}
            {modal === "validation" && (
              <>
                <p className="field-help">{t("validationScope")}</p>
                {issues.length ? (
                  <div className="issue-list">
                    {issues.map((i, n) => (
                      <button
                        key={i.id + i.code + n}
                        onClick={() => {
                          const e = m().get("elementRegistry").get(i.id);
                          if (e) focus(e);
                          setModal(null);
                        }}
                        className={"issue " + i.severity}
                      >
                        <AlertCircle size={18} />
                        <span>
                          <strong>{i.id}</strong>
                          <p>{lang === "en" ? i.en : i.pt}</p>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="validation-success">
                    <CheckCircle2 size={48} />
                    <h3>{t("noIssues")}</h3>
                  </div>
                )}
              </>
            )}
            {modal === "history" && (
              <>
                <p className="field-help">{t("localNotice")}</p>
                <button className="secondary" onClick={takeSnapshot}>
                  <Plus size={16} />
                  {t("snapshot")}
                </button>
                <div className="version-list">
                  {snapshots.length ? (
                    snapshots.map((s) => (
                      <div className="version" key={s.id}>
                        <History size={20} />
                        <div>
                          <strong>{s.name}</strong>
                          <small>
                            {new Date(s.created).toLocaleString(lang)}
                          </small>
                        </div>
                        <button
                          className="secondary"
                          onClick={() => restore(s)}
                        >
                          {t("restore")}
                        </button>
                        <button
                          title={t("delete")}
                          onClick={() => {
                            const next = snapshots.filter((x) => x.id !== s.id);
                            try {
                              localStorage.setItem(
                                "elan-versions",
                                JSON.stringify(next),
                              );
                              setSnapshots(next);
                            } catch (e) {
                              notify(String(e));
                            }
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>{t("emptyHistory")}</p>
                  )}
                </div>
              </>
            )}
            {modal === "warnings" && (
              <>
                <p>{t("uploadWarning")}</p>
                <ul className="warnings">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
                <button className="primary" onClick={() => setModal(null)}>
                  {t("close")}
                </button>
              </>
            )}
            {modal === "definitions" && (
              <DefinitionsEditor modeler={m()} lang={lang} notify={notify} />
            )}
            {modal === "catalog" && (
              <>
                <input
                  className="catalog-search"
                  autoFocus
                  placeholder={
                    lang === "en"
                      ? "Find a BPMN element…"
                      : "Buscar elemento BPMN…"
                  }
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
                <div className="full-catalog">
                  {Object.entries(catalog).map(([group, items]) => (
                    <section key={group}>
                      <h3>
                        {
                          (
                            {
                              start:
                                lang === "en"
                                  ? "Start events"
                                  : "Eventos iniciais",
                              task: lang === "en" ? "Tasks" : "Tarefas",
                              subprocess:
                                lang === "en" ? "Subprocesses" : "Subprocessos",
                              gateway: "Gateways",
                              intermediate:
                                lang === "en"
                                  ? "Intermediate events"
                                  : "Eventos intermediários",
                              end:
                                lang === "en" ? "End events" : "Eventos finais",
                              boundary:
                                lang === "en"
                                  ? "Boundary events"
                                  : "Eventos de borda",
                              data: lang === "en" ? "Data" : "Dados",
                              artifact:
                                lang === "en" ? "Artifacts" : "Artefatos",
                              conversation:
                                lang === "en"
                                  ? "Conversations"
                                  : "Conversações",
                              connections:
                                lang === "en" ? "Connections" : "Conexões",
                            } as Record<string, string>
                          )[group]
                        }
                      </h3>
                      {items
                        .filter((i) =>
                          (i.pt + " " + i.en)
                            .toLowerCase()
                            .includes(catalogSearch.toLowerCase()),
                        )
                        .map((item) => (
                          <button
                            key={item.id}
                            onMouseDown={(e) => {
                              if (simulation) return;
                              try {
                                if (item.connection) {
                                  m()
                                    .get("elanConnectionTool")
                                    .configure(lang, notify);
                                  m()
                                    .get("elanConnectionTool")
                                    .start(item.connection);
                                  setModal(null);
                                  return;
                                }
                                const shape = createCatalogShape(m(), item);
                                setModal(null);
                                m().get("create").start(e.nativeEvent, shape);
                              } catch (err) {
                                notify(String(err));
                              }
                            }}
                          >
                            <i className={item.icon} />
                            <span>{catalogLabel(item, lang)}</span>
                            <Plus size={13} />
                          </button>
                        ))}
                    </section>
                  ))}
                </div>
                <p className="field-help">
                  {lang === "en"
                    ? "Choose an element, then place it in the diagram. Boundary events attach to activities. Cancellation belongs inside a transaction. Configure triggers and loop behavior in Properties."
                    : "Escolha um elemento e coloque-o no diagrama. Eventos de borda se prendem às atividades. Cancelamento pertence a transações. Configure gatilhos e repetição em Propriedades."}
                </p>
              </>
            )}
            {modal === "source" && (
              <>
                <p className="field-help">
                  {lang === "en"
                    ? "Full BPMN XML, including semantic definitions and diagram coordinates. A local snapshot is saved before applying changes."
                    : "XML BPMN completo, incluindo definições semânticas e coordenadas. Uma versão local será salva antes de aplicar alterações."}
                </p>
                <textarea
                  className="xml-source"
                  spellCheck={false}
                  value={xmlSource}
                  onChange={(e) => setXmlSource(e.target.value)}
                />
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        xmlSource,
                        activeDoc.name + ".bpmn",
                        "application/xml",
                      )
                    }
                  >
                    <Download size={14} />
                    {t("export")}
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      act(async () => {
                        const p = await capture();
                        xmlDocument(xmlSource);
                        try {
                          await openXML(xmlSource);
                          storeSnapshot(
                            p,
                            lang === "en"
                              ? "Before XML changes"
                              : "Antes de editar XML",
                          );
                          persist({
                            ...p,
                            diagrams: p.diagrams.map((d) =>
                              d.id === p.activeId
                                ? { ...d, xml: xmlSource }
                                : d,
                            ),
                          });
                          setModal(null);
                        } catch (err) {
                          await openXML(
                            p.diagrams.find((d) => d.id === p.activeId)!.xml,
                          );
                          throw err;
                        }
                      })
                    }
                  >
                    {t("apply")}
                  </button>
                </div>
              </>
            )}
            {modal === "library" && (
              <>
                <p className="field-help">
                  {lang === "en"
                    ? "Reusable processes are stored as standard Process definitions in the same BPMN file and referenced through calledElement."
                    : "Processos reutilizáveis são definições Process no mesmo arquivo BPMN, referenciadas por calledElement."}
                </p>
                <div className="version-list">
                  {ready &&
                    (m().getDefinitions().rootElements || [])
                      .filter((r: any) => r.$instanceOf("bpmn:CallableElement"))
                      .map((r: any) => (
                        <div className="version" key={r.id}>
                          <Layers size={20} />
                          <div>
                            <strong>{r.name || r.id}</strong>
                            <small>{r.id}</small>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => {
                              if (
                                selection?.businessObject?.$type ===
                                "bpmn:CallActivity"
                              ) {
                                m()
                                  .get("modeling")
                                  .updateProperties(selection, {
                                    calledElement: r.id,
                                  });
                                setModal(null);
                              } else {
                                const root = m()
                                  .get("canvas")
                                  .getRootElements()
                                  .find(
                                    (x: any) =>
                                      x.businessObject === r ||
                                      x.businessObject.participants?.some(
                                        (p: any) => p.processRef === r,
                                      ),
                                  );
                                if (root)
                                  m().get("canvas").setRootElement(root);
                                setModal(null);
                              }
                            }}
                          >
                            {selection?.businessObject?.$type ===
                            "bpmn:CallActivity"
                              ? lang === "en"
                                ? "Use process"
                                : "Usar processo"
                              : lang === "en"
                                ? "Open"
                                : "Abrir"}
                          </button>
                        </div>
                      ))}
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    act(async () => {
                      const name = prompt(
                        lang === "en"
                          ? "Reusable process name"
                          : "Nome do processo reutilizável",
                      );
                      if (!name) return;
                      const current = await getXML(),
                        doc = xmlDocument(current),
                        g = blankGraph(name);
                      g.participant = undefined;
                      g.lanes = [];
                      g.nodes = [
                        {
                          id: uid("Start"),
                          type: "startEvent",
                          name: "",
                          x: 200,
                          y: 210,
                        },
                        {
                          id: uid("Task"),
                          type: "userTask",
                          name: lang === "en" ? "Activity" : "Atividade",
                          x: 320,
                          y: 188,
                        },
                        {
                          id: uid("End"),
                          type: "endEvent",
                          name: "",
                          x: 520,
                          y: 210,
                        },
                      ];
                      g.flows = [
                        {
                          id: uid("Flow"),
                          from: g.nodes[0].id,
                          to: g.nodes[1].id,
                        },
                        {
                          id: uid("Flow"),
                          from: g.nodes[1].id,
                          to: g.nodes[2].id,
                        },
                      ];
                      const extra = xmlDocument(graphXML([g]));
                      for (const el of Array.from(
                        extra.documentElement.children,
                      ))
                        doc.documentElement.appendChild(
                          doc.importNode(el, true),
                        );
                      const selected = selection?.id;
                      await openXML(new XMLSerializer().serializeToString(doc));
                      if (selected) {
                        const el = m().get("elementRegistry").get(selected);
                        if (el?.businessObject.$type === "bpmn:CallActivity") {
                          m()
                            .get("modeling")
                            .updateProperties(el, { calledElement: g.id });
                          m().get("selection").select(el);
                        }
                      }
                      await capture();
                      notify(t("success"));
                    })
                  }
                >
                  <Plus size={15} />
                  {lang === "en"
                    ? "Create reusable process"
                    : "Criar processo reutilizável"}
                </button>
              </>
            )}
            {modal === "help" && (
              <>
                <div className="about-brand">
                  <span className="brand-mark">
                    é<span>↗</span>
                  </span>
                  <div>
                    <h3>Élan Modeler</h3>
                    <p>{t("modelHint")}</p>
                  </div>
                  <span className="version-badge">0.1.0</span>
                </div>
                <p>{t("helpText")}</p>
                <h3>{t("compatibility")}</h3>
                <table className="compat-table">
                  <thead>
                    <tr>
                      <th>{lang === "en" ? "Format" : "Formato"}</th>
                      <th>{lang === "en" ? "Support" : "Suporte"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>BPMN 2.0 XML</td>
                      <td>
                        {lang === "en"
                          ? "Native editing, import / export"
                          : "Edição nativa, importação / exportação"}
                      </td>
                    </tr>
                    <tr>
                      <td>.elan</td>
                      <td>
                        {lang === "en"
                          ? "Multiple diagrams, local comments and attributes"
                          : "Vários diagramas, comentários locais e atributos"}
                      </td>
                    </tr>
                    <tr>
                      <td>XPDL 2.1 / 2.2</td>
                      <td>
                        {t("experimental")} ·{" "}
                        {lang === "en"
                          ? "import 2.1/2.2, export 2.2"
                          : "entrada 2.1/2.2, saída 2.2"}
                      </td>
                    </tr>
                    <tr>
                      <td>Visio VDX / VSDX</td>
                      <td>
                        {t("experimental")} ·{" "}
                        {lang === "en"
                          ? "import VDX/VSDX; generic VDX export"
                          : "entrada VDX/VSDX; saída VDX genérica"}
                      </td>
                    </tr>
                    <tr>
                      <td>Bizagi .bpm / .bpmc · VSD</td>
                      <td>{t("unavailable")}</td>
                    </tr>
                    <tr>
                      <td>PNG · JPG · SVG · HTML · DOCX · XLSX · CSV · PDF</td>
                      <td>{t("export")}</td>
                    </tr>
                    <tr>
                      <td>BPSim</td>
                      <td>
                        {lang === "en"
                          ? "Not implemented; interactive token simulation only"
                          : "Não implementado; simulação interativa de tokens"}
                      </td>
                    </tr>
                    <tr>
                      <td>Attributes XML</td>
                      <td>
                        {lang === "en"
                          ? "Élan schema only; not Bizagi XML"
                          : "Somente esquema Élan; não é XML Bizagi"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="help-links">
                  <a
                    href="https://github.com/kiltonfernandes/elan-modeler"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                    <ExternalLink size={13} />
                  </a>
                  <a
                    href="https://www.omg.org/spec/BPMN/2.0.2/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    BPMN 2.0.2
                    <ExternalLink size={13} />
                  </a>
                  <a href="https://bpmn.io" target="_blank" rel="noreferrer">
                    bpmn.io
                    <ExternalLink size={13} />
                  </a>
                </div>
                <p className="field-help">
                  {lang === "en"
                    ? "Independent implementation. Not affiliated with Bizagi. Cloud collaboration, SharePoint publishing and BPSim analysis are not implemented."
                    : "Implementação independente, sem vínculo com a Bizagi. Colaboração em nuvem, publicação no SharePoint e análise BPSim ainda não implementadas."}
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
