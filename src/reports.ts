import JSZip from "jszip";
import { readBPMN, download, rasterize } from "./interchange";
import { esc, type Graph } from "./model";
import { strings, type Lang, friendlyType } from "./i18n";
const flat = (g: Graph): Graph["nodes"] =>
  g.nodes.flatMap((n) => [n, ...(n.children ? flat(n.children) : [])]);
export function reportHTML(
  xml: string,
  svg: string,
  title: string,
  lang: Lang,
) {
  const t = strings[lang];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px system-ui;color:#223b35;margin:48px;line-height:1.6}h1{font-size:36px}h2{margin-top:40px}small{color:#657570}svg{width:100%;height:auto;max-height:800px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;border-bottom:1px solid #ddd;padding:12px;vertical-align:top}th{background:#eff3ee}.description{white-space:pre-wrap}@media print{body{margin:15mm}tr{break-inside:avoid}h2{break-before:page}svg{max-height:160mm}}</style></head><body><small>ÉLAN MODELER · BPMN 2.0</small><h1>${esc(title)}</h1><p>${new Date().toLocaleDateString(lang)}</p>${svg}${readBPMN(
    xml,
  )
    .map(
      (g) =>
        `<h2>${esc(g.name)}</h2><table><thead><tr><th>${esc(t.name)}</th><th>${esc(t.type)}</th><th>${esc(t.documentation)}</th></tr></thead><tbody>${flat(
          g,
        )
          .map(
            (n) =>
              `<tr><td><strong>${esc(n.name || n.id)}</strong><br><small>${esc(n.id)}</small></td><td>${esc(friendlyType(n.type[0].toUpperCase() + n.type.slice(1), lang))}</td><td><div class="description">${esc(n.doc || "—")}</div>${Object.entries(
                n.attrs || {},
              )
                .map(([k, v]) => `<p><strong>${esc(k)}:</strong> ${esc(v)}</p>`)
                .join("")}</td></tr>`,
          )
          .join("")}</tbody></table>`,
    )
    .join(
      "",
    )}<p><small>Élan Modeler · ${esc(t.localNotice)}</small></p></body></html>`;
}
export async function exportWord(
  xml: string,
  svg: string,
  title: string,
  lang: Lang,
  save = download,
) {
  const zip = new JSZip();
  const paragraphs: string[] = [];
  const p = (s: string, style = "") =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${esc(s)}</w:t></w:r></w:p>`;
  paragraphs.push(
    p(title, "Title"),
    p("Élan Modeler · " + new Date().toLocaleDateString(lang)),
  );
  const svgRoot = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  const iw = parseFloat(svgRoot.getAttribute("width") || "1000"),
    ih = parseFloat(svgRoot.getAttribute("height") || "500");
  const diagramHeight = Math.round(Math.min(4000000, (5943600 * ih) / iw)),
    diagramWidth = Math.round((diagramHeight * iw) / ih);
  const png = await rasterize(svg);
  zip.file("word/media/diagram.png", await png.arrayBuffer());
  paragraphs.push(
    '<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="5943600" cy="2743200"/><wp:docPr id="1" name="Process diagram"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="diagram.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="5943600" cy="2743200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'.replaceAll(
      'cx="5943600" cy="2743200"',
      `cx="${diagramWidth}" cy="${diagramHeight}"`,
    ),
  );
  for (const g of readBPMN(xml)) {
    paragraphs.push(p(g.name, "Heading1"));
    for (const n of flat(g)) {
      paragraphs.push(
        p(n.name || n.id, "Heading2"),
        p(
          friendlyType(n.type[0].toUpperCase() + n.type.slice(1), lang) +
            " · " +
            n.id,
        ),
        ...String(n.doc || "")
          .split("\n")
          .map((line) => p(line)),
      );
      for (const [k, v] of Object.entries(n.attrs || {}))
        paragraphs.push(p(k + ": " + v));
    }
  }
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  );
  zip.file(
    "word/styles.xml",
    '<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>',
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${paragraphs.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr></w:body></w:document>`,
  );
  save(
    await zip.generateAsync({ type: "blob" }),
    title + ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}
export function exportCSV(xml: string, title: string, lang: Lang) {
  const t = strings[lang];
  const row = (a: string[]) =>
    a
      .map(
        (s) =>
          '"' +
          (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
          s.replaceAll('"', '""') +
          '"',
      )
      .join(",");
  const rows = [
    [t.diagram, t.id, t.name, t.type, t.description],
    ...readBPMN(xml).flatMap((g) =>
      flat(g).map((n) => [g.name, n.id, n.name, n.type, n.doc || ""]),
    ),
  ];
  download(
    "\uFEFF" + rows.map(row).join("\r\n"),
    title + ".csv",
    "text/csv;charset=utf-8",
  );
}
export async function exportExcel(
  xml: string,
  title: string,
  lang: Lang,
  save = download,
) {
  const zip = new JSZip(),
    t = strings[lang],
    rows = [
      [t.diagram, t.id, t.name, t.type, t.description],
      ...readBPMN(xml).flatMap((g) =>
        flat(g).map((n) => [g.name, n.id, n.name, n.type, n.doc || ""]),
      ),
    ];
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${lang === "en" ? "Process documentation" : "Documentação"}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="2" width="25" customWidth="1"/><col min="3" max="3" width="35" customWidth="1"/><col min="4" max="4" width="24" customWidth="1"/><col min="5" max="5" width="90" customWidth="1"/></cols><sheetData>${rows.map((row, i) => `<row r="${i + 1}">${row.map((v, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:E${rows.length}"/></worksheet>`,
  );
  save(
    await zip.generateAsync({ type: "blob" }),
    title + ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
export async function exportPDF(
  xml: string,
  svg: string,
  title: string,
  lang: Lang,
  save = download,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const margin = 18,
    width = 174;
  let y = 22;
  pdf.setTextColor(35, 73, 51);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(23);
  const titleLines = pdf.splitTextToSize(title, width);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 140, 110);
  pdf.text("Élan Modeler · " + new Date().toLocaleDateString(lang), margin, y);
  y += 9;
  const png = new Uint8Array(await (await rasterize(svg)).arrayBuffer());
  const img = pdf.getImageProperties(png),
    h = Math.min(125, (width * img.height) / img.width),
    w = (h * img.width) / img.height;
  pdf.addImage(png, "PNG", margin + (width - w) / 2, y, w, h);
  y += h + 12;
  const text = (value: string, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(bold ? 11 : 9);
    pdf.setTextColor(bold ? 55 : 100, bold ? 85 : 120, bold ? 40 : 90);
    const lines = pdf.splitTextToSize(value, width);
    if (bold && y + lines.length * 6 + 12 > 275) {
      pdf.addPage();
      y = 22;
    }
    for (const line of lines) {
      if (y > 275) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, margin, y);
      y += bold ? 6 : 4.7;
    }
    y += 3;
  };
  for (const g of readBPMN(xml)) {
    text(g.name, true);
    for (const n of flat(g)) {
      text(n.name || n.id, true);
      text(
        friendlyType(n.type[0].toUpperCase() + n.type.slice(1), lang) +
          " · " +
          n.id,
      );
      if (n.doc) text(n.doc);
      for (const [k, v] of Object.entries(n.attrs || {})) text(k + ": " + v);
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(140, 155, 130);
    pdf.text(`Élan Modeler · ${p} / ${pages}`, margin, 287);
  }
  save(
    new Uint8Array(pdf.output("arraybuffer")),
    title + ".pdf",
    "application/pdf",
  );
}
