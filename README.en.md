# Élan Modeler

The web app is prepared for manual deployment to Vercel with Turso storage. See the [deployment guide](docs/deploy-vercel-turso.md) and [HTTP API](docs/backend-api.md). Cloud storage is an intentionally public workspace without sign-in; database credentials remain on the server. The Cloud panel saves/opens projects manually and uses optimistic revisions to prevent lost updates. Local autosave continues. Set the server environment variables and run `npm run db:migrate` before deploying.

An independent BPMN modeling application with Brazilian Portuguese and English interfaces. **Élan** is a French word for forward momentum. Not affiliated with Bizagi.

Requires Node.js 22.18+.

```bash
npm ci
npm run dev
```

Use `npm run desktop` for the Electron application, or `npm run desktop:package` to build an unsigned Windows portable executable in `release/`.

The application includes process/collaboration modeling, typed tasks, nested/event/transaction/ad-hoc subprocesses, reusable process calls, event variants, gateways, explicit connectors, data, choreography and conversation editors, BPMN definitions, documentation and local model history. Change the language in the header.

Use the arrows beside palette families to select variants. Configure event triggers, timers, conditions, loops and multi-instance behavior in Properties. Tools provides reusable processes, global BPMN definitions and complete XML source editing.

**Modeling does not execute business work.** Send tasks can represent email, but real delivery requires an execution engine and configured integrations.

Native interchange is BPMN 2.0 XML. `.elan` contains multiple BPMN documents and local comments. XPDL and Visio adapters are experimental and cover explicitly documented subsets. Bizagi `.bpm`/`.bpmc` and binary Visio `.vsd` are not supported. Export documentation as PDF, DOCX, XLSX, HTML or CSV and diagrams as SVG, PNG or JPG.

This release is **not certified for complete BPMN conformance**, nor does it implement every Bizagi cloud/enterprise feature. Choreography and conversation coverage, semantics and interchange need dedicated review. Cloud collaboration, BPSim quantitative analysis, production execution and SharePoint/MediaWiki publication are not implemented. Milestones are an Élan extension over BPMN groups.

Local copies are autosaved. The optional web Cloud panel sends projects to the configured Turso database through the Vercel API. Cloud saves are manual, limited to 3 MiB per project, and preserve diagrams and comments. Export `.elan` backups; local storage can be limited by the environment. Local version history is not included in `.elan` files or synchronized to the cloud.

Run `npm test` and `npm run build`. The `/qa.html` development page exercises real rendering, model changes and XML round trips in disposable diagrams. See [BPMN coverage](docs/cobertura-bpmn.md), [format research](docs/compatibilidade-bizagi.md), and [validation evidence](docs/validacao.md).

Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The original tutorial video and private source attachments are not published in this repository.
