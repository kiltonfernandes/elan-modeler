# Conectar o Élan à IA por MCP

O Élan oferece um servidor MCP remoto no mesmo deploy do editor. Não precisa hospedar outro serviço, instalar um servidor no computador ou configurar uma chave da OpenAI. A IA usa as ferramentas do Élan para trabalhar com os modelos salvos no Turso.

## Configuração rápida no ChatGPT

1. Faça o deploy ou redeploy do repositório na Vercel seguindo [Vercel + Turso](deploy-vercel-turso.md). Com a integração conectada, `npm run build:vercel` inicializa/verifica o banco automaticamente em produção. A alternativa manual é `npm run db:migrate`.
2. Abra o **endereço público HTTPS** do Élan e clique em **Conectar IA**.
3. Clique em **Testar servidor MCP**. O resultado esperado é **12 ferramentas disponíveis · Turso conectado**. Esse botão testa o servidor, não conecta uma conta externa.
4. Na aba ChatGPT, copie o endereço. Ele será `https://SEU-DOMINIO/mcp`.
5. No [ChatGPT → Plugins](https://chatgpt.com/plugins), escolha **+ → Add custom MCP server**. Informe **Élan Modeler**, cole a URL e escolha **No authentication**.
6. Revise as ferramentas, crie e instale o plugin. Em uma conversa, selecione o Élan e peça: **“Liste os modelos salvos no Élan.”**

A disponibilidade de servidores personalizados depende da conta e das permissões do workspace. A nomenclatura da interface pode variar. O fluxo acima segue o [guia oficial de MCP personalizado da OpenAI](https://developers.openai.com/api/docs/guides/custom-mcp-server).

O endereço é calculado pelo próprio aplicativo: use o domínio de produção em vez do preview se quiser uma conexão permanente. Nenhuma variável extra é obrigatória para o MCP público. A conexão usa **Streamable HTTP**. Não use `/sse`, `/api/status`, o endereço raiz do editor ou o localhost para cadastrar o servidor remoto.

## Como usar

No editor, abra **Nuvem → Salvar modelo atual** antes de pedir à IA para trabalhar nele. O MCP acessa o projeto salvo; não enxerga o canvas ainda não enviado à nuvem. Depois de uma edição feita pela IA, use **Nuvem → Abrir** para carregar a versão atual. Abrir um link de resultado do MCP, `/?model=ID`, também abre o modelo correspondente e tenta preservar o trabalho anterior no histórico local.

Exemplos de pedidos:

- “Liste meus processos e mostre os diagramas do modelo de compras.”
- “Leia o processo de aprovação e explique os caminhos de decisão.”
- “Crie um modelo de solicitação com tarefa de usuário, decisão e tarefa de envio de mensagem, usando BPMN 2.0 com coordenadas do diagrama.”
- “Adicione um diagrama de subprocesso a este modelo, preservando os diagramas existentes.”
- “Comente a tarefa de revisão dizendo que precisamos confirmar o responsável.”

As ferramentas de escrita são identificadas como tal para o cliente MCP. O cliente pode pedir confirmação antes de executá-las. Atualizações exigem a revisão atual do modelo: se alguém ou outra aba já alterou o projeto, a operação falha sem sobrescrever. A IA deve reler o modelo e reconciliar o pedido. Arquivar é reversível; não há ferramenta de exclusão permanente.

Representar serviço, e-mail ou script no BPMN não executa a atividade. Este servidor disponibiliza modelagem e documentação, sem um motor de execução.

## Notion

O MCP do Élan é um serviço que o Notion Agent pode consumir. Ele não substitui o MCP do próprio Notion nem concede ao Élan acesso a páginas do Notion.

A documentação atual do Notion pede **Business ou Enterprise**, autorização do administrador para MCP personalizado e autenticação por **OAuth ou cabeçalho**. O Élan oferece uma rota opcional por cabeçalho para atender esse requisito:

1. Gere um valor aleatório para a conexão, por exemplo, executando localmente:

   ```bash
   node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

2. Cadastre esse valor na Vercel como **`ELAN_MCP_NOTION_TOKEN`**, sem prefixo `VITE_`. Faça um redeploy. O valor precisa ter pelo menos 32 caracteres. Não use o token do Turso.
3. No Élan publicado, abra **Conectar IA → Notion** e copie `https://SEU-DOMINIO/mcp/notion`.
4. No Notion, adicione um servidor MCP personalizado em **Configurações → Conexões** ou, para Custom Agents, em **Settings → Tools & Access → Add connection → Custom MCP server**. O administrador pode precisar habilitar conexões personalizadas primeiro.
5. Nome: **Élan Modeler**. URL: a copiada. Autenticação: **Header**. Nome do cabeçalho: **`Authorization`**. Valor: **`Bearer SEU_TOKEN`**, com um espaço depois de `Bearer`.
6. Habilite as ferramentas para o Agent e peça para listar os modelos. Mantenha o token no gerenciador de credenciais do cliente; o editor não o recebe nem o exibe.

Sem o token configurado, somente `/mcp/notion` responde 503. Token ausente ou incorreto nessa rota retorna 401. A conexão principal `/mcp` e a API continuam **públicas, sem autenticação**, conforme a escolha deste projeto. O cabeçalho opcional serve à conexão do Notion e não torna o workspace privado.

Referências: [MCP em Custom Agents](https://www.notion.com/help/mcp-connections-for-custom-agents), [servidores no Notion Agent](https://www.notion.com/en-gb/help/connect-mcp-servers-to-your-notion-agent).

## Outros clientes

Escolha um cliente com suporte a **MCP remoto por Streamable HTTP**, informe a URL `/mcp` e desative a autenticação. Clientes exclusivamente `stdio` precisam de um adaptador separado; o Élan não fornece esse adaptador nesta etapa.

Por exemplo, no Cursor, adicione a configuração a `.cursor/mcp.json` do projeto ou ao arquivo global correspondente:

```json
{
  "mcpServers": {
    "elan": {
      "url": "https://SEU-DOMINIO/mcp"
    }
  }
}
```

A tela **Conectar IA → Outros clientes** fornece esse JSON com o domínio correto. [Documentação do Cursor](https://cursor.com/docs/mcp).

## Ferramentas disponíveis

| Ferramenta            | Ação                                                       | Altera o banco? |
| --------------------- | ---------------------------------------------------------- | --------------- |
| `elan_status`         | Estado do servidor e do banco.                             | Não             |
| `search`              | Pesquisa literal no nome e no conteúdo dos modelos ativos. | Não             |
| `fetch`               | Texto legível do modelo para pesquisa, com URL de origem.  | Não             |
| `elan_list_models`    | Lista modelos ativos ou arquivados, 50 por página.         | Não             |
| `elan_get_model`      | IDs de diagramas, revisão e metadados do projeto.          | Não             |
| `elan_get_diagram`    | XML exato em trechos e comentários paginados.              | Não             |
| `elan_create_model`   | Novo modelo, com BPMN fornecido ou processo vazio.         | Sim             |
| `elan_add_diagram`    | Acrescenta documento BPMN sem substituir os demais.        | Sim             |
| `elan_update_diagram` | Altera XML ou nome de um documento específico.             | Sim             |
| `elan_add_comment`    | Adiciona comentário a um elemento existente.               | Sim             |
| `elan_set_archived`   | Arquiva ou restaura, sem apagar o projeto.                 | Sim             |
| `elan_validate_bpmn`  | Confere leitura do XML pelo metamodelo BPMN.               | Não             |

O recurso MCP `elan://guide` e as instruções do servidor explicam o fluxo de edição. Conteúdo dos modelos é tratado como dado não confiável, não como instrução para a IA. As ferramentas não executam SQL, comandos, scripts BPMN nem requisições a URLs arbitrárias.

`elan_get_diagram` retorna até 32.000 caracteres por trecho por padrão, com máximo de 64.000. Use `nextOffset` até ser `null` para ler o documento completo. Os offsets são índices de string UTF-16, não bytes. A revisão deve continuar a mesma entre trechos; se mudou, reinicie a leitura. Comentários vêm em grupos de dez com `nextCommentOffset`. `fetch` limita o texto a 100.000 caracteres e informa quando houve truncamento; use os trechos XML para edições completas. Pesquisa usa correspondência literal de texto com a regra de maiúsculas/minúsculas do SQLite, sem índice semântico ou busca por relevância.

XML com DTD ou declaração de entidades é rejeitado. A conferência pelo metamodelo **não certifica conformidade semântica integral com BPMN**. O XML original fornecido é armazenado sem reserialização pelo servidor. Os limites da nuvem permanecem: projeto de até 3 MiB, até 500 modelos e revisão obrigatória para atualizar/arquivar/restaurar. Criar modelo ou acrescentar diagrama não é idempotente: antes de repetir uma chamada cujo resultado se perdeu, confira a lista.

## Operação e diagnóstico

- `/api/mcp-info`: metadados públicos, transporte, nomes das ferramentas e um booleano indicando se a rota do Notion está habilitada. Não retorna tokens.
- `/mcp`: endpoint MCP público. Um GET simples no navegador pode retornar **405**, comportamento esperado em um servidor sem sessões. Use o botão de teste ou um cliente MCP para verificar o protocolo.
- `/mcp/notion`: mesmas ferramentas, exigindo o cabeçalho opcional. Não há OAuth nesta implementação.
- `/api/mcp`: destino interno das reescritas da Vercel; prefira a URL `/mcp` nos clientes.
- `ELAN_PUBLIC_URL`: opcional, para estabelecer uma origem canônica em hospedagem própria. Na Vercel, o Host fornece o endereço automaticamente.
- `ELAN_MCP_ALLOWED_ORIGINS`: opcional, lista de origens exatas separadas por vírgulas. Use somente se um cliente com Origin diferente receber 403. Não configure curingas.

O servidor usa o SDK oficial TypeScript MCP v2, com um servidor por requisição, respostas HTTP e compatibilidade sem sessão para clientes do protocolo de 2025. Não depende de Redis nem de conexões persistentes entre invocações da Vercel. A aplicação não anuncia assinaturas ou notificações em tempo real. Confira também os controles de **Deployment Protection** da Vercel: um preview que exige login da Vercel não pode ser alcançado pelo cliente MCP sem acesso correspondente. Use um domínio de produção acessível ao cliente.

No desenvolvimento, `npm run dev:api` serve o MCP na porta 3001 e `npm run dev` encaminha `/api` e `/mcp` pela porta 5173. Clientes locais podem usar esse endereço; serviços remotos não alcançam `127.0.0.1`. O build estático isolado (`npm run preview`) não executa a API.

Para conferir alterações no código:

```bash
npm test
npm run build
npm run check:server-build
```

Os testes de integração usam HTTP real, cliente oficial MCP e SQLite local. Eles não atestam uma conexão com uma conta externa do ChatGPT ou Notion; essas conexões precisam ser feitas após o deploy com o domínio real.

Referências de implementação: [SDK oficial MCP](https://ts.sdk.modelcontextprotocol.io/v2/serving/http.html), [transporte Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [search/fetch para pesquisa no ChatGPT](https://developers.openai.com/api/docs/mcp).
