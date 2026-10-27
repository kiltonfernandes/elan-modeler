export const MCP_NAME = "Élan Modeler";
export const MCP_VERSION = "0.1.0";
export const MCP_TOOLS = [
  {
    name: "elan_status",
    pt: "Conferir conexão e banco",
    en: "Check connection and database",
    readOnly: true,
  },
  {
    name: "search",
    pt: "Pesquisar modelos salvos",
    en: "Search saved models",
    readOnly: true,
  },
  {
    name: "fetch",
    pt: "Ler conteúdo para pesquisa",
    en: "Read model content for research",
    readOnly: true,
  },
  {
    name: "elan_list_models",
    pt: "Listar modelos e arquivados",
    en: "List models and archives",
    readOnly: true,
  },
  {
    name: "elan_get_model",
    pt: "Consultar diagramas e revisão",
    en: "Read diagrams and revision",
    readOnly: true,
  },
  {
    name: "elan_get_diagram",
    pt: "Ler XML e comentários de um diagrama",
    en: "Read diagram XML and comments",
    readOnly: true,
  },
  {
    name: "elan_create_model",
    pt: "Criar modelo BPMN",
    en: "Create a BPMN model",
    readOnly: false,
  },
  {
    name: "elan_add_diagram",
    pt: "Adicionar diagrama ao modelo",
    en: "Add a diagram to a model",
    readOnly: false,
  },
  {
    name: "elan_update_diagram",
    pt: "Atualizar XML ou nome de diagrama",
    en: "Update diagram XML or name",
    readOnly: false,
  },
  {
    name: "elan_add_comment",
    pt: "Comentar um elemento",
    en: "Comment on an element",
    readOnly: false,
  },
  {
    name: "elan_set_archived",
    pt: "Arquivar ou restaurar modelo",
    en: "Archive or restore a model",
    readOnly: false,
  },
  {
    name: "elan_validate_bpmn",
    pt: "Conferir leitura do XML BPMN",
    en: "Check BPMN XML parsing",
    readOnly: true,
  },
] as const;
export type McpInfo = {
  name: string;
  version: string;
  transport: "streamable-http";
  endpointPath: "/mcp";
  authentication: "none";
  notionEndpointPath: "/mcp/notion";
  notionTokenConfigured: boolean;
  tools: typeof MCP_TOOLS;
};
