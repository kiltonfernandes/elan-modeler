import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Plug,
  RefreshCw,
  X,
} from "lucide-react";
import { MCP_TOOLS, type McpInfo } from "../shared/mcp";
import type { Lang } from "./i18n";
import { probeMcp } from "./mcp-client";

export default function McpPanel({
  lang,
  onClose,
  onCloud,
}: {
  lang: Lang;
  onClose: () => void;
  onCloud: () => void;
}) {
  const pt = lang !== "en";
  const [client, setClient] = useState("chatgpt");
  const [info, setInfo] = useState<McpInfo>();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<Awaited<ReturnType<typeof probeMcp>>>();
  const [failed, setFailed] = useState(false);
  const endpoint =
    location.origin + (client === "notion" ? "/mcp/notion" : "/mcp");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/mcp-info", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : undefined))
      .then(setInfo)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setCopied(false);
  }, [client]);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  async function test() {
    setTesting(true);
    setFailed(false);
    setReport(undefined);
    try {
      setReport(await probeMcp(location.origin + "/mcp"));
    } catch {
      setFailed(true);
    } finally {
      setTesting(false);
    }
  }
  const config = JSON.stringify(
    { mcpServers: { elan: { url: location.origin + "/mcp" } } },
    null,
    2,
  );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal wide mcp-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-title"
      >
        <div className="modal-header">
          <h2 id="mcp-title">
            <Bot size={21} /> {pt ? "Conectar IA" : "Connect AI"}
          </h2>
          <button title={pt ? "Fechar" : "Close"} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="mcp-body">
          <p className="mcp-intro">
            {pt
              ? "Seus processos, disponíveis para a IA. Copie o endereço e adicione o Élan como servidor MCP."
              : "Your processes, available to AI. Copy the address and add Élan as an MCP server."}
          </p>
          <div
            className="mcp-tabs"
            role="tablist"
            aria-label={pt ? "Aplicativo" : "Application"}
          >
            {["chatgpt", "notion", "other"].map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={key === client}
                className={key === client ? "active" : ""}
                onClick={() => setClient(key)}
              >
                {key === "chatgpt"
                  ? "ChatGPT"
                  : key === "notion"
                    ? "Notion"
                    : pt
                      ? "Outros clientes"
                      : "Other clients"}
              </button>
            ))}
          </div>
          <label className="mcp-url-label" htmlFor="mcp-url">
            {pt ? "Endereço do servidor" : "Server address"}{" "}
            <span>Streamable HTTP</span>
          </label>
          <div className="mcp-url">
            <input
              id="mcp-url"
              value={endpoint}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button className="primary" onClick={() => void copy(endpoint)}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? (pt ? "Copiado" : "Copied") : pt ? "Copiar" : "Copy"}
            </button>
          </div>
          {local && (
            <p className="mcp-note">
              {pt
                ? "Você está na versão local. Depois do deploy, abra o Élan na Vercel para copiar o endereço HTTPS público. ChatGPT e Notion não alcançam o localhost do seu computador."
                : "You are running locally. After deployment, open Élan on Vercel to copy its public HTTPS address. ChatGPT and Notion cannot reach your computer's localhost."}
            </p>
          )}
          {client === "chatgpt" && (
            <div className="mcp-instructions">
              <ol>
                <li>
                  {pt
                    ? "Abra Plugins no ChatGPT e escolha + → Add custom MCP server."
                    : "Open Plugins in ChatGPT and choose + → Add custom MCP server."}
                </li>
                <li>
                  {pt
                    ? "Nome: Élan Modeler. Cole o endereço acima. Em Authentication, selecione No authentication."
                    : "Name: Élan Modeler. Paste the address above. Under Authentication, select No authentication."}
                </li>
                <li>
                  {pt
                    ? "Crie e instale o plugin. Em uma conversa, selecione o Élan e peça para listar seus modelos."
                    : "Create and install the plugin. In a conversation, select Élan and ask it to list your models."}
                </li>
              </ol>
              <a
                href="https://chatgpt.com/plugins"
                target="_blank"
                rel="noreferrer"
              >
                {pt ? "Abrir Plugins do ChatGPT" : "Open ChatGPT Plugins"}{" "}
                <ExternalLink size={13} />
              </a>
              <small>
                {pt
                  ? "A disponibilidade de MCP personalizado depende da sua conta e das permissões do workspace."
                  : "Custom MCP availability depends on your account and workspace permissions."}
              </small>
            </div>
          )}
          {client === "notion" && (
            <div className="mcp-instructions">
              <p>
                {pt
                  ? "O Notion exige autenticação no MCP personalizado. Esta conexão usa um cabeçalho opcional; a conexão pública do ChatGPT continua sem chave."
                  : "Notion requires authentication for custom MCP. This connection uses an optional header; the public ChatGPT connection remains keyless."}
              </p>
              <ol>
                <li>
                  {pt
                    ? "Na Vercel, configure ELAN_MCP_NOTION_TOKEN com um valor aleatório de pelo menos 32 caracteres e faça um novo deploy."
                    : "In Vercel, set ELAN_MCP_NOTION_TOKEN to a random value of at least 32 characters and redeploy."}
                </li>
                <li>
                  {pt
                    ? "No Notion, adicione um servidor MCP personalizado em Conexões ou nas ferramentas do seu Agent. Cole este endereço."
                    : "In Notion, add a custom MCP server in Connections or your Agent's tools. Paste this address."}
                </li>
                <li>
                  {pt
                    ? "Escolha autenticação por cabeçalho. Nome: Authorization. Valor: Bearer seguido de um espaço e do token configurado na Vercel."
                    : "Choose header authentication. Name: Authorization. Value: Bearer followed by a space and the token configured in Vercel."}
                </li>
              </ol>
              <p className="mcp-note">
                {info?.notionTokenConfigured
                  ? pt
                    ? "Cabeçalho Notion habilitado no servidor."
                    : "Notion header authentication is enabled on the server."
                  : pt
                    ? "O token opcional do Notion ainda não está configurado no servidor."
                    : "The optional Notion token has not been configured on the server."}
              </p>
              <a
                href="https://www.notion.com/help/mcp-connections-for-custom-agents"
                target="_blank"
                rel="noreferrer"
              >
                {pt ? "Guia oficial do Notion" : "Official Notion guide"}{" "}
                <ExternalLink size={13} />
              </a>
              <small>
                {pt
                  ? "Requer plano Business ou Enterprise e permissão do administrador para MCP personalizado."
                  : "Requires Business or Enterprise and administrator permission for custom MCP."}
              </small>
            </div>
          )}
          {client === "other" && (
            <div className="mcp-instructions">
              <p>
                {pt
                  ? "Em clientes com MCP remoto, escolha HTTP / Streamable HTTP, cole o endereço e deixe a autenticação desativada. Exemplo de configuração para Cursor:"
                  : "In clients supporting remote MCP, choose HTTP / Streamable HTTP, paste the address and disable authentication. Example Cursor configuration:"}
              </p>
              <pre>{config}</pre>
              <button onClick={() => void copy(config)}>
                <Copy size={14} />{" "}
                {pt ? "Copiar configuração" : "Copy configuration"}
              </button>
            </div>
          )}
          <div className="mcp-check">
            <button onClick={() => void test()} disabled={testing}>
              <RefreshCw size={15} className={testing ? "spin" : ""} />
              {testing
                ? pt
                  ? "Testando…"
                  : "Testing…"
                : pt
                  ? "Testar servidor MCP"
                  : "Test MCP server"}
            </button>
            <span role="status">
              {report
                ? `${report.toolCount} ${pt ? "ferramentas disponíveis" : "tools available"} · ${report.databaseReady ? (pt ? "Turso conectado" : "Turso connected") : pt ? "configure o Turso e execute a migração" : "configure Turso and run migrations"}`
                : failed
                  ? pt
                    ? "Não foi possível conectar. Confira o deploy e a API."
                    : "Unable to connect. Check deployment and API."
                  : pt
                    ? "Verifica o protocolo e o banco; não conecta a sua conta de IA."
                    : "Checks the protocol and database; does not connect your AI account."}
            </span>
          </div>
          <div className="mcp-storage">
            <Plug size={18} />
            <p>
              {pt
                ? "A IA acessa os modelos salvos na nuvem. Salve pela opção Nuvem antes de usar o MCP e reabra o modelo da nuvem para ver alterações feitas pela IA."
                : "AI accesses cloud-saved models. Save through Cloud before using MCP and reopen the cloud model to see AI changes."}
            </p>
            <button onClick={onCloud}>
              {pt ? "Abrir Nuvem" : "Open Cloud"}
            </button>
          </div>
          <details className="mcp-tools">
            <summary>
              {pt ? "O que a IA pode fazer" : "What AI can do"} ·{" "}
              {MCP_TOOLS.length}
            </summary>
            <div>
              {MCP_TOOLS.map((tool) => (
                <p key={tool.name}>
                  <span>{pt ? tool.pt : tool.en}</span>
                  <small>
                    {tool.readOnly
                      ? pt
                        ? "Leitura"
                        : "Read"
                      : pt
                        ? "Escrita"
                        : "Write"}
                  </small>
                </p>
              ))}
            </div>
          </details>
          <p className="mcp-public">
            {pt
              ? "Workspace público, conforme sua configuração: quem tiver o endereço pode ler e alterar modelos. O cabeçalho opcional do Notion não restringe o endpoint público /mcp nem a API."
              : "Public workspace, as configured: anyone with the address can read and change models. The optional Notion header does not restrict the public /mcp endpoint or API."}
          </p>
        </div>
      </section>
    </div>
  );
}
