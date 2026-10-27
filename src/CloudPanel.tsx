import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Cloud,
  CloudUpload,
  Copy,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { cloudApi, CloudError } from "./cloud-api";
import type { CloudModel, CloudSummary } from "../shared/cloud";
import type { Project } from "./storage";
import type { Lang } from "./i18n";

export function cloudErrorText(error: unknown, lang: Lang) {
  const pt = lang !== "en";
  const code = error instanceof CloudError ? error.code : "api_unavailable";
  const messages: Record<string, [string, string]> = {
    cloud_not_configured: [
      "O armazenamento na nuvem ainda não está configurado.",
      "Cloud storage has not been configured yet.",
    ],
    schema_not_ready: [
      "O banco precisa ser inicializado. Execute a migração indicada no guia de deploy.",
      "The database needs initialization. Run the migration described in the deployment guide.",
    ],
    revision_conflict: [
      "Este modelo mudou em outra aba ou foi arquivado. Abra a versão da nuvem ou salve uma cópia separada. Suas alterações locais estão preservadas.",
      "This model changed in another tab or was archived. Open the cloud version or save a separate copy. Your local changes are preserved.",
    ],
    project_too_large: [
      "O limite por modelo na nuvem é 3 MiB. Para modelos maiores, exporte o arquivo .elan.",
      "Cloud models are limited to 3 MiB. Export larger models as .elan files.",
    ],
    invalid_project: [
      "O modelo tem dados incompatíveis com o armazenamento na nuvem. Confira nomes, diagramas e comentários.",
      "The model contains data incompatible with cloud storage. Check names, diagrams and comments.",
    ],
    model_not_found: [
      "O modelo não foi encontrado. Atualize a lista.",
      "Model not found. Refresh the list.",
    ],
    model_limit: [
      "Este workspace atingiu o limite de 500 modelos, incluindo os arquivados.",
      "This workspace reached its limit of 500 models, including archived models.",
    ],
    database_unavailable: [
      "Não foi possível acessar o banco. Confira a configuração do servidor. Sua cópia local está preservada.",
      "Unable to reach the database. Check server configuration. Your local copy is preserved.",
    ],
    api_unavailable: [
      "A nuvem está indisponível neste endereço. Sua cópia local está preservada.",
      "Cloud storage is unavailable at this address. Your local copy is preserved.",
    ],
  };
  return (messages[code] || messages.api_unavailable)[pt ? 0 : 1];
}
export default function CloudPanel({
  lang,
  current,
  capture,
  onSaved,
  onOpen,
  onClose,
}: {
  lang: Lang;
  current: CloudSummary | null;
  capture: () => Promise<Project>;
  onSaved: (model: CloudSummary | null) => void;
  onOpen: (model: CloudModel) => Promise<void>;
  onClose: () => void;
}) {
  const en = lang === "en";
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [models, setModels] = useState<CloudSummary[]>([]),
    [archived, setArchived] = useState(false),
    [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    running = useRef(false);
  async function load(archivedView = archived, append = false) {
    const result = await cloudApi.list(
      archivedView,
      append ? models.length : 0,
    );
    if (alive.current) {
      setModels((previous) =>
        append ? [...previous, ...result.models] : result.models,
      );
      setHasMore(result.hasMore);
    }
  }
  async function run(fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      if (alive.current) setError(cloudErrorText(e, lang));
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function connect() {
    const status = await cloudApi.status();
    if (!status.ready)
      throw new CloudError(
        "cloud_not_configured",
        "Cloud storage is not configured.",
      );
    if (alive.current) setReady(true);
    await load();
  }
  useEffect(() => {
    alive.current = true;
    void run(connect);
    return () => {
      alive.current = false;
    };
  }, []);
  async function save(copy = false) {
    await run(async () => {
      const model = await cloudApi.save(await capture(), copy ? null : current);
      onSaved(model);
      if (alive.current)
        setMessage(
          en
            ? `Revision ${model.revision} saved in the cloud.`
            : `Revisão ${model.revision} salva na nuvem.`,
        );
      await load();
    });
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !running.current) onClose();
      }}
    >
      <section
        className="modal wide cloud-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-title"
      >
        <div className="modal-header">
          <h2 id="cloud-title">
            <Cloud size={22} />
            {en ? "Cloud models" : "Modelos na nuvem"}
          </h2>
          <button
            title={en ? "Close" : "Fechar"}
            onClick={onClose}
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>
        <p>
          {en
            ? "Save and open models on other devices. This workspace has public access, without login. Local autosave continues; use the buttons below to send changes to the cloud."
            : "Salve e abra modelos em outros dispositivos. Este workspace tem acesso público, sem login. O salvamento local continua; use os botões abaixo para enviar alterações à nuvem."}
        </p>
        {current && (
          <div className="cloud-current">
            <Cloud size={16} />
            <span>
              {en ? "Linked model" : "Modelo vinculado"}:{" "}
              <strong>{current.name}</strong> · r{current.revision}
            </span>
          </div>
        )}
        <div className="cloud-actions">
          <button
            className="primary"
            disabled={!ready || busy || archived}
            onClick={() => void save()}
          >
            <CloudUpload size={16} />
            {current
              ? en
                ? "Update cloud model"
                : "Atualizar na nuvem"
              : en
                ? "Save current model"
                : "Salvar modelo atual"}
          </button>
          {current && (
            <button
              className="secondary"
              disabled={!ready || busy || archived}
              onClick={() => void save(true)}
            >
              <Copy size={15} />
              {en ? "Save separate copy" : "Salvar cópia separada"}
            </button>
          )}
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void run(ready ? () => load() : connect)}
          >
            <RefreshCw size={15} />
            {en ? "Refresh" : "Atualizar lista"}
          </button>
        </div>
        {error && (
          <p role="alert" className="cloud-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="cloud-success">
            {message}
          </p>
        )}
        <label className="cloud-archive-toggle">
          <input
            type="checkbox"
            checked={archived}
            disabled={!ready || busy}
            onChange={(e) => {
              const value = e.target.checked;
              setArchived(value);
              void run(() => load(value));
            }}
          />
          {en ? "Show archived models" : "Mostrar modelos arquivados"}
        </label>
        <div className="cloud-models" aria-busy={busy}>
          {models.map((model) => (
            <div className="cloud-model" key={model.id}>
              <div>
                <strong>{model.name}</strong>
                <small>
                  {model.diagramCount} {en ? "diagrams" : "diagramas"} · r
                  {model.revision} ·{" "}
                  {new Date(model.updatedAt).toLocaleString(lang)}
                </small>
              </div>
              {archived ? (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await cloudApi.archive(model, false);
                      await load();
                    })
                  }
                >
                  <RotateCcw size={15} />
                  {en ? "Restore" : "Restaurar"}
                </button>
              ) : (
                <>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await onOpen(await cloudApi.get(model.id));
                        onClose();
                      })
                    }
                  >
                    <FolderOpen size={15} />
                    {en ? "Open" : "Abrir"}
                  </button>
                  <button
                    className="cloud-archive"
                    title={en ? "Archive" : "Arquivar"}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await cloudApi.archive(model, true);
                        if (current?.id === model.id) onSaved(null);
                        await load();
                      })
                    }
                  >
                    <Archive size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
          {!models.length && ready && !busy && (
            <p>
              {en
                ? "No models in this list yet."
                : "Ainda não há modelos nesta lista."}
            </p>
          )}
          {busy && <p role="status">{en ? "Connecting…" : "Conectando…"}</p>}
        </div>
        {hasMore && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void run(() => load(archived, true))}
          >
            {en ? "Load more" : "Carregar mais"}
          </button>
        )}
        <p className="field-help">
          {en
            ? "Opening a cloud model creates a local history snapshot first. Archiving is reversible. Cloud saving is manual in this version."
            : "Ao abrir um modelo da nuvem, uma versão do trabalho atual é guardada no histórico local. O arquivamento é reversível. Nesta versão, o salvamento na nuvem é manual."}
        </p>
      </section>
    </div>
  );
}
