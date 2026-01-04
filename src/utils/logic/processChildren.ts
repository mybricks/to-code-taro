import type { UI } from "../../toCodeTaro";
import handleCom from "../../handleCom";
import handleDom from "../../handleDom";
import handleModule from "../../handleModule";

export type ChildResult = {
  ui: string;
  js: string;
  cssContent: string;
  slots: string[];
  scopeSlots: string[];
};

/**
 * 统一处理子节点（com, dom, module）
 */
export const processChildren = (
  children: UI["children"],
  config: any
): ChildResult => {
  let uiCode = "";
  let jsCode = "";
  let cssContent = "";
  const slots: string[] = [];
  const scopeSlots: string[] = [];

  children.forEach((child) => {
    let result: any;
    if (child.type === "com") {
      result = handleCom(child, config);
    } else if (child.type === "module") {
      result = handleModule(child, config);
    } else {
      result = handleDom(child, config);
    }

    if (result) {
      if (result.ui) {
        uiCode += (uiCode ? "\n" : "") + result.ui;
      }
      if (result.js) {
        jsCode += result.js;
      }
      if (result.cssContent) {
        cssContent += (cssContent ? "\n" : "") + result.cssContent;
      }
      if (result.slots) {
        slots.push(...result.slots);
      }
      if (result.scopeSlots) {
        scopeSlots.push(...result.scopeSlots);
      }
    }
  });

  return {
    ui: uiCode,
    js: jsCode,
    cssContent,
    slots,
    scopeSlots,
  };
};

