import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle, getRootComponentClassName } from "./utils";
import {
  genRootDefineCode,
  genSlotDefineCode,
  genComponentTemplate,
  wrapInEffect
} from "./utils/templates/scene";
import { RenderManager } from "./utils/templates/renderManager";
import { processChildren } from "./utils/logic/processChildren";
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
  hasPopups?: boolean;
  /** handleCom 处理 slots 时的 slot key（如 item/content），用于识别 scope 入参 */
  slotKey?: string;
}

const handleSlot = (ui: UI, config: HandleSlotConfig) => {
  const importManager = new ImportManager(config);
  const { props = {} as any } = ui;
  // 支持 children 或 comAry (DSL 常用名)
  const children = ui.children || (ui as any).comAry || [];
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
        dependencyNames: ["useAppContext", "ScopedComContextProvider"],
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
  const envDefineCode = isRoot ? genRootDefineCode(indent2, config.getUtilsPackageName()) : genSlotDefineCode(indent2);

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

  // 3. 处理场景逻辑 (Start, Inputs 等)
  let effectCode = processSceneLogic(ui, config, addDependencyImport);

  // 4. 合并样式与代码
  let cssContent = (convertStyleAryToCss(props.style?.styleAry, slotId) || "") + 
                    (childResults.cssContent ? "\n" + childResults.cssContent : "");

  let renderCodeBlock = isRoot && renderManager ? renderManager.toCode(indentation(config.codeStyle!.indent)) : "";
  const combinedJsCode = `${envDefineCode}${childResults.js}${renderCodeBlock ? `\n${renderCodeBlock}` : ""}${wrapInEffect(indent2, effectCode)}`;

  // 5. 生成 UI 结构
  const uiResult = generateSlotUi(ui, props, childResults.ui, config);

  // 6. 如果是根场景，生成完整文件
  if (isRoot) {
    finalizeRootComponent(ui, config, importManager, combinedJsCode, uiResult, cssContent);
  }

  return {
    js: childResults.js,
    combinedJsCode,
    ui: uiResult,
    cssContent,
    slots: [],
    scopeSlots: [],
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

  addImport({ packageName: "react", dependencyNames: ["useRef", "useEffect", "useState"], importType: "named" });
  addImport({ packageName: "@tarojs/components", dependencyNames: ["View"], importType: "named" });
  
  const dependencyNames = ["WithCom", "WithWrapper", "SlotProvider"];
  if (isRoot && config.hasPopups) {
    dependencyNames.push("PopupRenderer");
  }
  addImport({ packageName: utilsPkg, dependencyNames, importType: "named" });
  addImport({ packageName: comPkg, dependencyNames: ["useAppContext"], importType: "named" });

  if (isRoot) {
    if (config.hasPopups) {
      addImport({ packageName: "../../common/popup", dependencyNames: ["POPUP_MAP", "POPUP_IDS"], importType: "named" });
    }
    addImport({ packageName: "./index.global.less", dependencyNames: [], importType: "module" });
  }
};

/**
 * 生成 Slot 的 UI 代码
 */
const generateSlotUi = (ui: any, props: any, childrenUi: string, config: any) => {
  const indent = indentation(config.codeStyle!.indent * config.depth);
  const mergedStyle = { width: "100%", height: "100%", ...(ui.style || {}), ...(props.style || {}) };
  const styleCode = JSON.stringify(convertRootStyle({ ...mergedStyle, layout: ui.layout || mergedStyle.layout }));
  
  const rootClassName = getRootComponentClassName(config.getCurrentScene(), config.checkIsRoot());
  const classNameAttr = rootClassName ? ` className='${rootClassName}'` : "";

  return `${indent}<View${classNameAttr} style={${styleCode}}>\n${childrenUi}\n${indent}</View>`;
};

/**
 * 完成根组件的注册
 */
const finalizeRootComponent = (ui: any, config: any, importManager: any, combinedJsCode: string, uiResult: string, cssContent: string) => {
  const fileName = config.getFileName?.(ui.meta.slotId) || ui.meta.title || "index";
  const componentId = ui.meta?.id || ui.id || ui.meta?.slotId || "Index";
  const componentName = `I${String(componentId).replace(/[^a-zA-Z0-9]/g, "_")}`;
  
  const componentCode = genComponentTemplate({ 
    componentName, 
    combinedJsCode, 
    uiResult,
    isPopup: config.isPopup,
    hasPopups: config.hasPopups
  });
  
  config.add({ importManager, content: componentCode, cssContent, name: fileName });
};

export default handleSlot;
