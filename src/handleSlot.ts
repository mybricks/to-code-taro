import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle, getRootComponentClassName } from "./utils";
import {
  genRootDefineCode,
  genSlotDefineCode,
  genComponentTemplate,
  wrapInEffect
} from "./utils/code/scene";
import { RenderManager } from "./utils/code/renderManager";
import { processChildren } from "./utils/processChildren";
import { processSceneLogic } from "./processors/processSceneLogic";

import type { UI, BaseConfig } from "./toCodeTaro";

interface HandleSlotConfig extends BaseConfig {
  addParentDependencyImport?: (typeof ImportManager)["prototype"]["addImport"];
  addComId?: (comId: string) => void;
  addConsumer?: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  checkIsRoot: () => boolean;
  renderManager?: RenderManager;
  addJSModule?: (module: any) => void;
}

const handleSlot = (ui: UI, config: HandleSlotConfig) => {
  const importManager = new ImportManager(config);
  const { props = {} as any, children = [] } = ui;
  const isRoot = config.checkIsRoot();
  const slotId = (ui as any).meta?.id || (ui as any).id;

  // 1. 初始化依赖与基础定义
  const addDependencyImport = config.addParentDependencyImport || importManager.addImport.bind(importManager);
  setupImports(addDependencyImport, config, isRoot);
  
  const indent2 = indentation(config.codeStyle!.indent);
  const envDefineCode = isRoot ? genRootDefineCode(indent2, config.getUtilsPackageName()) : genSlotDefineCode(indent2);

  // 2. 处理子节点
  const renderManager = isRoot ? new RenderManager() : (config.renderManager || new RenderManager());
  const childResults = processChildren(children, {
    ...config,
    depth: config.depth + 1,
    addParentDependencyImport: addDependencyImport,
    renderManager,
  });

  // 3. 处理场景逻辑 (Start, Inputs 等)
  const effectCode = processSceneLogic(ui, config, addDependencyImport);

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
  };
};

/**
 * 设置基础导入
 */
const setupImports = (addImport: any, config: any, isRoot: boolean) => {
  const utilsPkg = config.getUtilsPackageName();
  const comPkg = config.getComponentPackageName();

  addImport({ packageName: "react", dependencyNames: ["useRef", "useEffect", "useState"], importType: "named" });
  addImport({ packageName: "@tarojs/components", dependencyNames: ["View"], importType: "named" });
  addImport({ packageName: utilsPkg, dependencyNames: ["WithCom", "WithWrapper"], importType: "named" });
  addImport({ packageName: comPkg, dependencyNames: ["useAppContext"], importType: "named" });

  if (isRoot) {
    addImport({ packageName: "./index.less", dependencyNames: [], importType: "module" });
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
  
  const componentCode = genComponentTemplate({ componentName, combinedJsCode, uiResult });
  
  config.add({ importManager, content: componentCode, cssContent, name: fileName });
};

export default handleSlot;
