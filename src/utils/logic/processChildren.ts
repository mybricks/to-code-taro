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
  /** 所有层级的后代组件结果 */
  childrenResults?: any[];
  /** 仅当前层级的直接子组件结果 */
  directChildren?: any[];
};

/**
 * 统一处理子节点（com, dom, module）
 */
export const processChildren = (
  children: UI["children"] | any[],
  config: any
): ChildResult => {
  let uiCode = "";
  let jsCode = "";
  let cssContent = "";
  const slots: string[] = [];
  const scopeSlots: string[] = [];
  const allChildrenResults: any[] = [];
  const directChildren: any[] = [];

  // 归一化处理子节点：兼容 comAry, children, elements, layoutTemplate
  const normalizedChildren = normalizeChildren(children);

  normalizedChildren.forEach((child) => {
    let result: any;
    // 增加对 child.def 的判断，兼容 layoutTemplate 中的组件
    if (child.type === "com" || child.def) {
      result = handleCom(child, config);
    } else if (child.type === "module") {
      result = handleModule(child, config);
    } else {
      result = handleDom(child, config);
    }

    if (result) {
      // 收集组件元数据
      if (child.type === "com" || child.def) {
        const comId = (child as any).id || (child as any).meta?.id;
        const childInfo = {
          ...result,
          id: comId,
          // 优先使用 handleCom 解析出的稳定名称 (如 comName 别名)
          name: result.name || (child as any).name || (child as any).props?.data?.name || (child as any).meta?.title || comId,
          type: child.type || "com",
          meta: child.meta,
          props: child.props,
        };
        
        directChildren.push(childInfo);
        allChildrenResults.push(childInfo);
        
        // 递归收集所有后代
        if (result.childrenResults) {
          allChildrenResults.push(...result.childrenResults);
        }
      } else {
        // 如果是 DOM 或 Module，也要收集它们内部可能包含的组件
        if (result.childrenResults) {
          allChildrenResults.push(...result.childrenResults);
        }
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
    directChildren,
    childrenResults: allChildrenResults,
  };
};

/**
 * 归一化子节点提取逻辑
 * 兼容不同版本的 DSL 结构：
 * 1. 数组直接返回
 * 2. 包含 elements 的 DOM 包装层
 * 3. 包含 layoutTemplate 的插槽
 * 4. 包含 comAry 的传统插槽
 * 5. 包含 children 的 Slot/Dom/Com 对象
 */
export function normalizeChildren(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;

  // 优先级顺序：elements -> layoutTemplate -> comAry -> children
  const list = input.elements || input.layoutTemplate || input.comAry || input.children;
  if (Array.isArray(list)) return list;

  return [];
}
