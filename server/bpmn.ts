import { BpmnModdle } from "bpmn-moddle";
import { elanDescriptor } from "../src/model.ts";
import { MAX_CLOUD_BYTES } from "../shared/cloud.ts";
import { ApiError } from "./errors.ts";

export async function parseBpmn(xml: string) {
  if (Buffer.byteLength(xml, "utf8") > MAX_CLOUD_BYTES)
    throw new ApiError(
      413,
      "project_too_large",
      "BPMN XML exceeds the cloud limit.",
    );
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new ApiError(
      400,
      "invalid_bpmn",
      "DTD and XML entities are not supported.",
    );
  try {
    const parsed = await new BpmnModdle({ elan: elanDescriptor }).fromXML(xml);
    if (
      parsed.rootElement?.$type !== "bpmn:Definitions" ||
      !parsed.rootElement.rootElements?.length
    )
      throw new Error(
        "Expected BPMN definitions with a process, collaboration or choreography.",
      );
    return parsed as {
      rootElement: any;
      elementsById: Record<string, any>;
      warnings: { message: string }[];
    };
  } catch {
    throw new ApiError(
      400,
      "invalid_bpmn",
      "Unable to parse BPMN definitions. Provide complete BPMN XML; no model was changed.",
    );
  }
}
export function describeBpmn(parsed: Awaited<ReturnType<typeof parseBpmn>>) {
  const elements = Object.values(parsed.elementsById).filter((e: any) =>
    e.$type?.startsWith("bpmn:"),
  );
  const lines = elements.map((e: any) => {
    const doc = (e.documentation || [])
      .map((d: any) => d.text || "")
      .join("\n");
    const refs = [
      e.sourceRef?.id && `from=${e.sourceRef.id}`,
      e.targetRef?.id && `to=${e.targetRef.id}`,
    ]
      .filter(Boolean)
      .join(" ");
    return [e.id, e.$type, e.name, refs, doc].filter(Boolean).join(" · ");
  });
  return {
    elementCount: elements.length,
    diagramCount: parsed.rootElement.diagrams?.length || 0,
    rootTypes: parsed.rootElement.rootElements.map(
      (e: any) => e.$type,
    ) as string[],
    warnings: parsed.warnings
      .map((w) => String(w.message).slice(0, 500))
      .slice(0, 50),
    text: lines.join("\n"),
    scope:
      "XML/metamodel parsing only; not complete BPMN semantic validation or process execution.",
  };
}
