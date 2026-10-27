# Third-party notices

Élan Modeler uses open-source packages. Their licenses remain applicable independently of the licensing decision for project-specific source code.

| Package                                           | License / notice                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| bpmn-js                                           | bpmn.io license, derived from MIT with a visible watermark requirement.         |
| chor-js                                           | MIT; includes its own bpmn-js distribution and related licenses.                |
| diagram-js, bpmn-moddle and BPMN support packages | MIT / notices distributed with the packages.                                    |
| bpmn-js-token-simulation                          | MIT.                                                                            |
| bpmn-auto-layout                                  | MIT.                                                                            |
| React, React DOM                                  | MIT.                                                                            |
| Lucide                                            | ISC.                                                                            |
| JSZip                                             | MIT or GPLv3 dual license; use under MIT here.                                  |
| jsPDF                                             | MIT.                                                                            |
| Electron                                          | MIT and Chromium/other bundled third-party notices in the runtime distribution. |

Copies of the principal package notices are in `licenses/`. Dependency source and complete notices are also available in the packages installed by `npm ci`.

The MCP backend uses `@modelcontextprotocol/server` and `@modelcontextprotocol/node` (Apache-2.0, with additional MIT notices for pre-existing source, as included in the upstream license) and Zod (MIT). The official MCP client SDK is a development dependency used in integration tests. Copies of the server/Node SDK and Zod license texts are included in `licenses/`. See the [official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) and [Zod](https://github.com/colinhacks/zod).

The optional backend uses `@libsql/client` (MIT, libSQL authors) and `@tursodatabase/serverless` (MIT, Turso authors). These SDKs are used on the server; their database credentials are not part of the frontend bundle. See [libSQL client](https://github.com/tursodatabase/libsql-client-ts) and [Turso](https://github.com/tursodatabase/turso).

The bpmn.io attribution watermark is retained, visible and clickable. Do not remove, hide, cover or modify the code that displays it. The Élan interface and third-party notices do not replace that requirement.

Upstream projects: [bpmn-js](https://github.com/bpmn-io/bpmn-js), [chor-js](https://github.com/bptlab/chor-js), [token simulation](https://github.com/bpmn-io/bpmn-js-token-simulation), [bpmn-auto-layout](https://github.com/bpmn-io/bpmn-auto-layout), [React](https://github.com/facebook/react), [Lucide](https://github.com/lucide-icons/lucide), [JSZip](https://github.com/Stuk/jszip), [jsPDF](https://github.com/parallax/jsPDF), [Electron](https://github.com/electron/electron).
