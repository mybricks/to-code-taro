import type { UI, BaseConfig } from "./toCodeTaro";
import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle } from "./utils";
import { processChildren } from "./utils/processChildren";

type Dom = Extract<UI["children"][0], { type: "dom" }>;

interface HandleDomConfig extends BaseConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
  addConsumer: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  addComId: (comId: string) => void;
}

type HandleDomResult = {
  ui: string;
  js: string;
  slots: string[];
  scopeSlots: string[];
  cssContent: string;
};

const handleDom = (dom: Dom, config: HandleDomConfig): HandleDomResult => {
  const { props, children } = dom;
  const domProps = props as any;
  
  const childResults = processChildren(children, {
    ...config,
    depth: config.depth + 1,
  });

  const cssContent = (convertStyleAryToCss(domProps.style?.styleAry, domProps.id) || "") + 
                    (childResults.cssContent ? "\n" + childResults.cssContent : "");

  const indent = indentation(config.codeStyle!.indent * config.depth);
  const styleCode = JSON.stringify(convertRootStyle(domProps.style));

  const ui = `${indent}<View${domProps.id ? ` id="${domProps.id}" className="${domProps.id}"` : ""} style={${styleCode}}>\n${childResults.ui}\n${indent}</View>`;

  return {
    ui,
    js: childResults.js,
    slots: childResults.slots,
    scopeSlots: childResults.scopeSlots,
    cssContent,
  };
};

export default handleDom;
