# Deploy manual: Vercel + Turso

O repositório está preparado para publicar o editor Vite e quatro Vercel Functions Node.js. O banco armazena o projeto Élan completo: documentos, BPMN XML, XML original de importação e comentários. Esta etapa não cria contas nem faz deploy automaticamente.

Por escolha do projeto, o workspace é **público, sem login ou chave no app**. Quem acessar o endereço pode listar, abrir, alterar e arquivar os modelos. `TURSO_AUTH_TOKEN` é uma credencial do banco, usada somente pelo servidor; não é uma chave exigida do usuário do editor.

## 1. Criar o banco no Turso

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

## 2. Inicializar o schema uma vez

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

O comando aplica `db/migrations/001_initial.sql`, registra o checksum e pode ser repetido. O build não acessa nem modifica o banco. Migrações novas devem ser arquivos novos; não edite uma migração já aplicada.

Tabelas criadas: `elan_models` e `elan_schema_migrations`. O banco guarda o projeto como JSON, com metadados e revisão para detectar conflitos.

## 3. Importar o repositório na Vercel

No painel da Vercel, escolha **Add New → Project**, importe `kiltonfernandes/elan-modeler` e use:

| Campo            | Valor                                |
| ---------------- | ------------------------------------ |
| Root Directory   | Raiz do repositório (`.`)            |
| Framework Preset | Vite                                 |
| Build Command    | `npm run build`                      |
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

Use os mesmos valores do banco inicializado. Se habilitar Preview, configure as variáveis nesse ambiente também; ele pode usar um banco separado. Não coloque credenciais em `vercel.json`, no código, em variáveis `VITE_*` ou no GitHub.

Clique em **Deploy**. Ao alterar variáveis depois, faça um novo deploy para aplicá-las. [Variáveis de ambiente](https://vercel.com/docs/environment-variables).

## 5. Conferir depois do deploy

1. Abra `https://SEU-DOMINIO/api/health`: deve retornar `status: "ok"`.
2. Abra `https://SEU-DOMINIO/api/status`: deve retornar `configured: true` e `ready: true`.
3. No editor, clique em **Nuvem → Salvar modelo atual**.
4. Feche e reabra o painel; confira a revisão e use **Abrir**.
5. Em outro navegador/dispositivo, abra o mesmo endereço e procure o modelo na lista.

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

A API atende em `127.0.0.1:3001`; o Vite em `127.0.0.1:5173` encaminha `/api` para ela. Esse banco local não é usado na Vercel: em produção o backend exige um banco remoto. `npm run preview` serve apenas os arquivos estáticos compilados.

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
