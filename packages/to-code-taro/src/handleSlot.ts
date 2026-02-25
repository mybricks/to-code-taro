import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle, getRootComponentClassName } from "./utils";
import {
  genRootDefineCode,
  genSlotDefineCode,
  genComponentTemplate,
  wrapInEffect
} from "./utils/templates/scene";
import { RenderManager } from "./utils/templates/renderManager";
import { processChildren, normalizeChildren } from "./utils/logic/processChildren";
import { processSceneLogic } from "./processors/processSceneLogic";

import type { UI, BaseConfig } from "./toCodeTaro";

interface HandleSlotConfig extends BaseConfig {
  addParentDependencyImport?: (typeof ImportManager)["prototype"]["addImport"];
  addComId?: (comId: string) => void;
  addConsumer?: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  checkIsRoot: () => boolean;
  renderManager?: RenderManager;
  addJSModule?: (module: any) => void;
  isPopup?: boolean;
  isModule?: boolean;
  hasPopups?: boolean;
  /** handleCom 处理 slots 时的 slot key（如 item/content），用于识别 scope 入参 */
  slotKey?: string;
  /** 父组件 id（用于给插槽根容器打标 className） */
  parentComId?: string;
}

const handleSlot = (ui: UI, config: HandleSlotConfig) => {
  const importManager = new ImportManager(config);
  const { props = {} as any } = ui;
  // 使用归一化处理器
  const children = normalizeChildren(ui);
  const isRoot = config.checkIsRoot();
  const slotId = (ui as any).meta?.id || (ui as any).id;

  // 1. 初始化依赖与基础定义
    const addDependencyImport = config.addParentDependencyImport || importManager.addImport.bind(importManager);
    setupImports(addDependencyImport, config, isRoot);

    // 鸿蒙规范：插槽组件内部需要使用 context 访问 comRefs/outputs
    if (!isRoot) {
      const utilsPkg = config.getUtilsPackageName({ isRoot, isPopup: config.isPopup });
      addDependencyImport({
        packageName: utilsPkg,
        dependencyNames: ["useAppContext"],
        importType: "named",
      });
      // 补全 useEffect 导入（用于插槽逻辑驱动）
      addDependencyImport({
        packageName: "react",
        dependencyNames: ["useEffect"],
        importType: "named",
      });
    }

  const indent2 = indentation(config.codeStyle!.indent);
  const envDefineCode = isRoot ? genRootDefineCode(indent2, config.getUtilsPackageName(), false, config.isModule) : genSlotDefineCode(indent2);

  // 2. 处理子节点
  const renderManager = isRoot ? new RenderManager() : (config.renderManager || new RenderManager());
  const childResults = processChildren(children, {
    ...config,
    depth: config.depth + 1,
    addParentDependencyImport: addDependencyImport,
    renderManager,
    // 让插槽内部的组件知道当前处于哪个 slot（用于接收父容器 inputValues）
    currentSlotId: isRoot ? undefined : (config.slotKey || slotId),
  });

  // 3. 处理场景逻辑 (变量/FX 初始化 + Start/Inputs 等)
  const { initCode, effectCode } = processSceneLogic(ui, config, addDependencyImport);

  // 4. 合并样式与代码
  let cssContent = (convertStyleAryToCss(props.style?.styleAry, slotId) || "") + 
                    (childResults.cssContent ? "\n" + childResults.cssContent : "");

  const combinedJsCode = `${envDefineCode}${childResults.js}${initCode}${wrapInEffect(indent2, effectCode)}`;

  // 5. 生成 UI 结构
  const uiResult = generateSlotUi(ui, props, childResults.ui, childResults.childrenResults, config);

  // 6. 如果是根场景，生成完整文件
  if (isRoot) {
    const renderDefinitions = renderManager ? renderManager.toCode("") : ""; // 顶层定义不需要缩进
    finalizeRootComponent(ui, config, importManager, combinedJsCode, renderDefinitions, uiResult, cssContent);
  }

  return {
    js: childResults.js,
    combinedJsCode,
    ui: uiResult,
    cssContent,
    slots: [],
    scopeSlots: [],
    directChildren: childResults.directChildren,
    childrenResults: childResults.childrenResults,
  };
};

/**
 * 设置基础导入
 */
const setupImports = (addImport: any, config: any, isRoot: boolean) => {
  const importParams = { isPopup: config.isPopup };
  const utilsPkg = config.getUtilsPackageName(importParams);
  const comPkg = config.getComponentPackageName(importParams);

  addImport({
    packageName: "react",
    dependencyNames: ["useRef", "useEffect", "useState", "createContext", "useContext"],
    importType: "named",
  });
  addImport({ packageName: "@tarojs/components", dependencyNames: ["View"], importType: "named" });
  
  // 页面/插槽产物通常不直接使用，避免生成未使用的 import。
  const dependencyNames = ["WithCom", "WithWrapper"];
  if (isRoot && config.hasPopups) {
    dependencyNames.push("PopupRenderer");
  }
  addImport({ packageName: utilsPkg, dependencyNames, importType: "named" });
  addImport({ packageName: comPkg, dependencyNames: ["useAppContext"], importType: "named" });

  if (isRoot) {
    if (!config.isModule) {
      addImport({ packageName: "@/common/pageLife", dependencyNames: ["usePageLife"], importType: "named" });
    }
    if (config.hasPopups) {
      addImport({ packageName: "@/common/popup", dependencyNames: ["POPUP_MAP", "POPUP_IDS"], importType: "named" });
    }
    addImport({ packageName: "./index.global.less", dependencyNames: [], importType: "module" });
  }
};

/**
 * 生成 Slot 的 UI 代码
 */
const generateSlotUi = (ui: any, props: any, childrenUi: string, childrenResults: any, config: any) => {
  const indent = indentation(config.codeStyle!.indent * config.depth);
  const slotStyle = ui.style || {};
  const propsStyle = props.style || {};
  const mergedStyle = { width: "100%", height: "100%", ...slotStyle, ...propsStyle };
  
  const layout = ui.layout || mergedStyle.layout;
  const smart = isSmartLayout(layout);
  const layoutAdjustment = smart
    ? { position: "relative" }
    : hasFixedChildren(childrenResults) ? { transform: "translateX(0)" } : {};

  const styleCode = JSON.stringify(convertRootStyle({ ...mergedStyle, layout, ...layoutAdjustment }));

  const rootClassName = getRootComponentClassName(config.getCurrentScene(), config.checkIsRoot());
  // 插槽根容器增强：加上可读的标识，便于用户定位/调试
  // - className: slot-<parentComId>
  const parentComId = (config as any)?.parentComId;
  const slotMarkClass = parentComId ? `mybricks_slot slot-${parentComId}` : "";
  const classNameStr = [rootClassName, slotMarkClass].filter(Boolean).join(" ");
  const classNameAttr = classNameStr ? ` className='${classNameStr}'` : "";

  // 支持通过 params.style 传递额外样式
  const styleAttr = slotMarkClass ? `style={{...params.style || {}, ...${styleCode}}}` : `style={${styleCode}}`;

  return `${indent}<View${classNameAttr} ${styleAttr}>\n${childrenUi}\n${indent}</View>`;
};

/**
 * 完成根组件的注册
 */
const finalizeRootComponent = (ui: any, config: any, importManager: any, combinedJsCode: string, renderDefinitions: string, uiResult: string, cssContent: string) => {
  const fileName = config.getFileName?.(ui.meta.slotId) || ui.meta.title || "index";
  const componentId = ui.meta?.id || ui.id || ui.meta?.slotId || "Index";
  const prefix = config.isModule ? "C" : "P";
  const componentName = `${prefix}${String(componentId).replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
  
  const componentCode = genComponentTemplate({ 
    componentId,
    componentName, 
    combinedJsCode, 
    renderDefinitions,
    uiResult,
    isPopup: config.isPopup,
    hasPopups: config.hasPopups
  });
  
  config.add({ importManager, content: componentCode, cssContent, name: fileName });
};

/**
 * 检查子元素是否有固定定位的元素
 */
const hasFixedChildren = (childrenResults: any[]) => {
  return childrenResults.some((item) => item?.rootStyle?.position === "fixed");
}

/**
 * 检查是否是智能布局
 */
const isSmartLayout = (layout: any) => {
  return layout === "smart" || layout?.position === "smart";
}

export default handleSlot;
