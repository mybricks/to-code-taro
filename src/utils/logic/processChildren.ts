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
  childrenResults?: any[];
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
  const allChildrenResults: any[] = [];

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
      // 收集组件元数据（用于 RenderManager 的 wrap/itemWrap）
      if (child.type === "com") {
        const comId = (child as any).id || (child as any).meta?.id;
        allChildrenResults.push({
          ...result,
          id: comId,
          // 优先使用 handleCom 解析出的稳定名称 (如 comName 别名)
          name: result.name || (child as any).name || (child as any).props?.data?.name || (child as any).meta?.title || comId,
          type: child.type,
          meta: child.meta,
          props: child.props,
        });
      }

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
    childrenResults: allChildrenResults,
  };
};
