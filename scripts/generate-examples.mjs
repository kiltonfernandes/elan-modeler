import fs from "node:fs/promises";
import { graphXML, recruitment } from "../src/model.ts";
import { choreographyXML, conversationXML } from "../src/special-models.ts";
import { catalog } from "../src/catalog.ts";
await fs.mkdir(new URL("../examples/", import.meta.url), { recursive: true });
const files = {
  "recrutamento.bpmn": graphXML([recruitment()]),
  "recruitment.bpmn": graphXML([recruitment(true)]),
  "coreografia.bpmn": choreographyXML("Coreografia de solicitação"),
  "conversacao.bpmn": conversationXML("Conversação de solicitação"),
};
for (const [name, xml] of Object.entries(files))
  await fs.writeFile(new URL("../examples/" + name, import.meta.url), xml);
await fs.writeFile(
  new URL("../docs/catalogo.json", import.meta.url),
  JSON.stringify(catalog, null, 2),
);
console.log(
  `Generated ${Object.keys(files).length} BPMN examples and the catalog manifest.`,
);
