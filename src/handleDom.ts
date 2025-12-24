import type { UI, BaseConfig } from "./toCodeTaro";
import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle } from "./utils";
import handleCom from "./handleCom";

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
  let uiCode = "";
  let jsCode = "";
  let cssContent = convertStyleAryToCss(props.style?.styleAry, props.id);
  const level0Slots: string[] = [];
  const level1Slots: string[] = [];
  const nextConfig = {
    ...config,
    depth: config.depth + 1,
  };

  children.forEach((child) => {
    if (child.type === "com") {
      const { ui, js, slots, scopeSlots, cssContent: childCssContent } = handleCom(child, nextConfig);
      uiCode += uiCode ? "\n" + ui : ui;
      jsCode += js;
      if (childCssContent) {
        cssContent += (cssContent ? "\n" : "") + childCssContent;
      }
      level0Slots.push(...slots);
      level1Slots.push(...scopeSlots);
    } else if (child.type === "module") {
      // 模块处理
      uiCode += uiCode ? "\n" + "模块" : "模块";
    } else {
      const { ui, js, slots, scopeSlots, cssContent: childCssContent } = handleDom(child, nextConfig);
      uiCode += uiCode ? "\n" + ui : ui;
      jsCode += js;
      if (childCssContent) {
        cssContent += (cssContent ? "\n" : "") + childCssContent;
      }
      level0Slots.push(...slots);
      level1Slots.push(...scopeSlots);
    }
  });

  const indent = indentation(config.codeStyle!.indent * config.depth);
  const styleCode = JSON.stringify(convertRootStyle(props.style));

  const ui = `${indent}<View${props.id ? ` id="${props.id}" className="${props.id}"` : ""} style={${styleCode}}>\n${uiCode}\n${indent}</View>`;

  return {
    ui,
    js: jsCode,
    slots: level0Slots,
    scopeSlots: level1Slots,
    cssContent,
  };
};

export default handleDom;

