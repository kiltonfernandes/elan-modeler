# Deploy manual: Vercel + Turso

O repositório está preparado para publicar o editor Vite e seis Vercel Functions Node.js, incluindo o servidor MCP. O banco armazena o projeto Élan completo: documentos, BPMN XML, XML original de importação e comentários. Esta etapa não cria contas nem faz deploy automaticamente.

Por escolha do projeto, o workspace é **público, sem login ou chave no app**. Quem acessar o endereço pode listar, abrir, alterar e arquivar os modelos. `TURSO_AUTH_TOKEN` é uma credencial do banco, usada somente pelo servidor; não é uma chave exigida do usuário do editor.

## Como a integração automática funciona

Ao conectar o recurso Turso ao projeto, o Marketplace fornece as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. A Vercel as disponibiliza no ambiente selecionado, por exemplo Production, e o backend do Élan lê esses valores em `process.env`. O token não precisa ser colocado no código ou no GitHub. Variáveis novas passam a valer em novos deployments. [Turso no Marketplace](https://vercel.com/marketplace/tursocloud/database), [variáveis de integrações](https://vercel.com/docs/environment-variables#integration-environment-variables).

Neste aplicativo, o caminho é **editor ou cliente MCP → Function do Élan na Vercel → Turso por HTTP → resposta ao cliente**. O SDK remoto usa a URL e o token no servidor. O banco continua sendo um recurso Turso; este código usa SQL por HTTP. [Modelos de acesso Turso/Vercel](https://docs.turso.tech/integrations/vercel).

O schema do Élan é definido pelo próprio projeto em `db/migrations/`, separadamente da conexão do Marketplace. O passo de produção `scripts/prepare-deploy.ts` aplica/verifica essas migrações; a integração fornece as credenciais usadas por esse passo. No uso normal, o editor e o MCP compartilham os mesmos modelos salvos, enquanto o autosave local do navegador continua separado do envio manual à nuvem.

## 1. Criar o banco no Turso

**Pelo Marketplace da Vercel:** crie o banco Turso e conecte ao projeto `elan-modeler`, ambiente **Production**, sem prefixo personalizado. A integração adiciona `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Mantenha os valores como Sensitive. Para esta configuração inicial, deixe a criação de branches de banco por deploy desmarcada. Confira os nomes das variáveis, sem expor seus valores. [Integração oficial](https://vercel.com/marketplace/tursocloud/database).

Com a integração conectada, o deploy de produção executa `npm run build:vercel`: primeiro compila o aplicativo e depois inicializa/verifica o schema do banco. Não é necessário executar a migração manual abaixo para esse fluxo. Se as credenciais estiverem ausentes, o banco estiver inacessível ou o histórico de migrações não conferir, o novo deploy falha com uma mensagem sem segredos. O deploy anterior permanece disponível.

Crie um banco no painel do Turso e obtenha sua URL e um token de banco com permissão de leitura/escrita. Use um banco dedicado ao Élan.

O backend aceita os dois motores do Turso Cloud:

| URL / motor                   | SDK usado pelo backend               | Configuração                                      |
| ----------------------------- | ------------------------------------ | ------------------------------------------------- |
| `turso://...` — motor Turso   | `@tursodatabase/serverless/compat`   | Driver detectado automaticamente.                 |
| `libsql://...` — motor libSQL | `@libsql/client/web`                 | Driver detectado automaticamente.                 |
| `https://...`                 | Depende do motor escolhido no painel | Defina `TURSO_DATABASE_DRIVER=turso` ou `libsql`. |

Também é possível usar o CLI oficial:

```bash
# Motor libSQL
turso db create elan-modeler
# Ou, para o motor Turso:
# turso db create elan-modeler --tursodb

turso db show --url elan-modeler
turso db tokens create elan-modeler
```

Confira o motor do banco criado e copie a URL retornada pelo painel/CLI. [SDKs oficiais](https://docs.turso.tech/sdk/ts/reference), [quickstart](https://docs.turso.tech/sdk/ts/quickstart), [criação de bancos](https://docs.turso.tech/cli/db/create).

## 2. Migração manual — alternativa e desenvolvimento local

Na raiz do repositório, use Node.js **22.18 ou superior**:

```bash
npm ci
```

Copie `.env.example` para `.env.local` e preencha os valores reais nesse arquivo local:

```dotenv
TURSO_DATABASE_URL=URL_DO_SEU_BANCO
TURSO_AUTH_TOKEN=TOKEN_DO_SEU_BANCO
# Apenas se necessário para URL HTTPS:
# TURSO_DATABASE_DRIVER=turso
```

Não use prefixo `VITE_` nessas variáveis. `.env.local`, bancos locais e a pasta `.vercel` são ignorados pelo Git.

Execute:

```bash
npm run db:migrate
```

O comando aplica `db/migrations/001_initial.sql`, registra o checksum e pode ser repetido. `npm run build` continua sem acesso ao banco. `npm run build:vercel` inicializa/verifica o banco somente quando `VERCEL_ENV=production`; builds locais, CI e previews não executam migrações. Migrações novas devem ser arquivos novos; não edite uma migração já aplicada. As migrações atuais apenas criam tabelas e índices e não apagam modelos. Mudanças futuras destrutivas precisam de revisão e planejamento próprios.

Tabelas criadas: `elan_models` e `elan_schema_migrations`. O banco guarda o projeto como JSON, com metadados e revisão para detectar conflitos.

## 3. Importar o repositório na Vercel

No painel da Vercel, escolha **Add New → Project**, importe `kiltonfernandes/elan-modeler` e use:

| Campo            | Valor                                |
| ---------------- | ------------------------------------ |
| Root Directory   | Raiz do repositório (`.`)            |
| Framework Preset | Vite                                 |
| Build Command    | `npm run build:vercel`               |
| Output Directory | `dist`                               |
| Install Command  | `npm ci --ignore-scripts`            |
| Node.js          | 22.x, ou versão posterior compatível |

Essas opções de build já estão em `vercel.json`. A instalação da Vercel ignora scripts para não baixar o runtime desktop do Electron. O frontend e as Functions ficam no mesmo domínio; não é necessário configurar uma URL de API no navegador. [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite), [runtime Node.js](https://vercel.com/docs/functions/runtimes/node-js).

## 4. Variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, adicione:

| Variável                | Obrigatória                                | Onde é utilizada                       |
| ----------------------- | ------------------------------------------ | -------------------------------------- |
| `TURSO_DATABASE_URL`    | Sim                                        | Functions e comando de migração local. |
| `TURSO_AUTH_TOKEN`      | Sim para banco remoto                      | Functions e comando de migração local. |
| `TURSO_DATABASE_DRIVER` | Apenas para URL HTTPS ou escolha explícita | `turso` ou `libsql`.                   |

Use os valores adicionados pela integração ou configure os do banco escolhido. Se habilitar Preview, ele pode usar um banco separado; inicialize-o manualmente, pois previews não fazem migrações automáticas. Não coloque credenciais em `vercel.json`, no código, em variáveis `VITE_*` ou no GitHub. O workflow `.github/workflows/verify.yml` verifica testes, build e Functions sem acessar o Turso remoto e sem exigir secrets do banco no GitHub.

Clique em **Deploy**. Ao alterar variáveis depois, faça um novo deploy para aplicá-las. [Variáveis de ambiente](https://vercel.com/docs/environment-variables).

## 5. Conferir depois do deploy

1. Abra `https://SEU-DOMINIO/api/health`: deve retornar `status: "ok"`.
2. Abra `https://SEU-DOMINIO/api/status`: deve retornar `configured: true` e `ready: true`.
3. No editor, clique em **Nuvem → Salvar modelo atual**.
4. Feche e reabra o painel; confira a revisão e use **Abrir**.
5. Em outro navegador/dispositivo, abra o mesmo endereço e procure o modelo na lista.
6. Clique em **Conectar IA → Testar servidor MCP**. Confira as 12 ferramentas e o estado do Turso. Copie a URL HTTPS `/mcp` para cadastrar no cliente de IA conforme o [guia MCP](mcp.md). Para o ChatGPT, não é necessária outra variável. A rota opcional do Notion usa `ELAN_MCP_NOTION_TOKEN` e exige redeploy após configurar o valor.

Não basta o frontend abrir: o teste de `/api/status` e o salvamento confirmam a configuração do banco. Não é necessário inserir nenhuma chave no editor.

## Desenvolvimento local

Para testar sem um banco remoto, configure `.env.local` assim:

```dotenv
TURSO_DATABASE_URL=file:./elan-dev.db
# Sem token para este banco local.
```

Execute a migração e abra dois terminais:

```bash
npm run db:migrate
npm run dev:api
```

```bash
npm run dev
```

A API atende em `127.0.0.1:3001`; o Vite em `127.0.0.1:5173` encaminha `/api` e `/mcp` para ela. Esse banco local não é usado na Vercel: em produção o backend exige um banco remoto. `npm run preview` serve apenas os arquivos estáticos compilados.

## Comportamento desta etapa

- O salvamento local continua automático. O envio à nuvem é **manual**, pelo botão Nuvem.
- Um modelo na nuvem contém todos os diagramas do projeto, inclusive subprocessos representados em seu XML.
- A vinculação ao modelo/revisão permanece na sessão da aba. Importar outro arquivo `.elan` desvincula o modelo anterior.
- Atualizações usam revisão otimista. Uma aba desatualizada recebe conflito; não sobrescreve a versão mais recente. Você pode abrir a versão atual ou salvar uma cópia separada.
- Antes de abrir outro modelo, o editor tenta guardar o trabalho atual no histórico local. Se essa etapa falhar, a troca é interrompida.
- Arquivar não apaga o conteúdo. Marque **Mostrar modelos arquivados** para restaurar.
- O limite por projeto na nuvem é **3 MiB em UTF-8**, incluindo JSON, XML original e comentários. Projetos maiores continuam disponíveis localmente e por exportação `.elan`. A Vercel documenta um limite de 4,5 MB por payload de Function; foi deixada margem para o envelope. [Limites de Functions](https://vercel.com/docs/functions/limitations).
- A lista é paginada em 50 modelos. O workspace comporta até 500 modelos, contando os arquivados.
- Não há edição colaborativa em tempo real, usuários, permissões por modelo, anexos de vídeo ou execução de processos nesta etapa.

## Diagnóstico

| Sintoma                                | Ação                                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `configured: false`                    | Adicione as variáveis de ambiente do banco e refaça o deploy.                                                                          |
| `schema_not_ready`                     | Execute `npm run db:migrate` com as credenciais desse mesmo banco.                                                                     |
| `database_unavailable`                 | Confira URL, token válido com escrita, motor selecionado e disponibilidade do Turso. Os detalhes do SDK não são enviados ao navegador. |
| API retorna HTML/404                   | Confira Root Directory, os arquivos `api/` e a configuração Vite. O rewrite da SPA exclui `/api`.                                      |
| Funciona localmente, mas não na Vercel | Não use `file:` ou URL localhost no ambiente remoto. Configure as variáveis no ambiente do deploy correto.                             |
| Conflito de revisão                    | Abra o modelo da nuvem ou salve uma cópia separada. A cópia local permanece.                                                           |
| Projeto grande demais                  | Exporte `.elan`; armazenamento de arquivos maiores pode ser adicionado em outra etapa.                                                 |

## Validação feita antes da entrega

Os testes executam SQL real em SQLite/libSQL local e chamadas HTTP reais: criação, leitura, atualização concorrente, arquivamento/restauração, paginação, validação e rollback/idempotência de migrações. O fluxo do editor é conferido contra uma API local. O build inclui a checagem TypeScript do backend.

O deploy na Vercel e a conexão com seu Turso remoto ficam para sua configuração manual. Sem suas credenciais, esses dois ambientes externos não foram exercitados nesta entrega.

Para repetir a checagem dos entrypoints compilados em Node ESM, use `npm run check:server-build`. Ela testa quatro rotas locais sem usar suas credenciais. Resultados e limites estão em [backend-validation.json](backend-validation.json).
