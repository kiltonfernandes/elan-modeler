declare module "bpmn-js/lib/Modeler" {
  const Modeler: any;
  export default Modeler;
}
declare module "bpmn-js-token-simulation" {
  const module: any;
  export default module;
}
declare module "bpmn-auto-layout" {
  export function layoutProcess(
    xml: string,
  ): Promise<string | { xml: string; warnings: unknown[] }>;
}
declare module "bpmn-moddle" {
  export const BpmnModdle: any;
}
declare module "diagram-js/lib/draw/BaseRenderer" {
  const BaseRenderer: any;
  export default BaseRenderer;
}
declare module "diagram-js/lib/features/rules/RuleProvider" {
  const RuleProvider: any;
  export default RuleProvider;
}
declare module "*?url" {
  const url: string;
  export default url;
}
declare module "*?inline" {
  const style: string;
  export default style;
}
