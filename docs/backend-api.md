# Backend HTTP — etapa Vercel + Turso

Mesmo domínio do editor, prefixo `/api`, respostas JSON e `Cache-Control: no-store`. O workspace é público e não exige login, conforme a configuração solicitada. A validação de origem em escritas pelo navegador não é autenticação nem limita clientes HTTP externos.

| Método | Endpoint                              | Corpo / retorno                                                                |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/health`                         | Saúde do processo, sem acessar o banco.                                        |
| GET    | `/api/status`                         | Configuração e schema do banco; `ready: true` quando disponível.               |
| GET    | `/api/models?archived=false&offset=0` | `{models, hasMore}`; metadados de até 50 modelos.                              |
| POST   | `/api/models`                         | `{project}` → modelo completo com UUID e revisão 1.                            |
| GET    | `/api/models/:id`                     | Modelo completo, inclusive se arquivado.                                       |
| PUT    | `/api/models/:id`                     | `{project, revision}` → nova revisão; exige modelo ativo.                      |
| PATCH  | `/api/models/:id`                     | `{archived: boolean, revision}` → metadados atualizados.                       |
| DELETE | `/api/models/:id`                     | `{revision}` → arquivamento reversível. Não existe exclusão permanente na API. |

`project` usa o formato `.elan` versão 1, definido em `shared/project.ts`. Conteúdo original de importação e comentários são preservados. XML não é executado pelo servidor. DTD/entities são recusados, mas o backend não faz validação normativa completa de BPMN; a abertura usa o parser/editor do cliente.

Metadados: `id`, `name`, `revision`, `diagramCount`, `createdAt`, `updatedAt`, `archivedAt`. O item completo acrescenta `project`. Timestamps do banco são gerados no servidor; `project.updated` preserva o valor do documento.

Erros têm formato `{error: {code, message}}`. Códigos principais: 400 `invalid_project`/`invalid_revision`, 404 `model_not_found`, 409 `revision_conflict`/`model_limit`, 413 `project_too_large`, 415 `json_required` e 503 `cloud_not_configured`/`schema_not_ready`/`database_unavailable`.

Uma revisão incorreta nunca força atualização. O servidor altera o documento e incrementa a revisão em um único `UPDATE ... WHERE revision = ? ... RETURNING`, eliminando a janela de leitura seguida de sobrescrita. SQL usa parâmetros para todos os valores externos.

O payload de projeto é limitado a 3 MiB; o envelope HTTP tem uma pequena margem adicional. Segredos, mensagens internas do SDK e SQL não entram nas respostas. As credenciais existem somente no ambiente do servidor. Os drivers remotos usam transporte HTTP/fetch; o cliente nativo libSQL é reservado ao banco local de desenvolvimento/teste.

Veja [deploy-vercel-turso.md](deploy-vercel-turso.md) para setup manual, migrações e limitações.
