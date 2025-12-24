import { ImportManager, indentation, convertStyleAryToCss, convertRootStyle } from "./utils";
import handleCom from "./handleCom";
import { handleProcess } from "./utils/handleProcess";
import {
  genRootDefineCode,
  genSlotDefineCode,
  genControllerInitCode,
  genComponentTemplate,
  wrapInEffect
} from "./utils/code/scene";
import { RenderManager } from "./utils/code/renderManager";
import handleDom from "./handleDom";
import handleModule from "./handleModule";

import type { UI, BaseConfig } from "./toCodeTaro";

interface HandleSlotConfig extends BaseConfig {
  addParentDependencyImport?: (typeof ImportManager)["prototype"]["addImport"];
  addComId?: (comId: string) => void;
  addConsumer?: (
    provider: ReturnType<BaseConfig["getCurrentProvider"]>,
  ) => void;
  checkIsRoot: () => boolean;
  renderManager?: RenderManager;
}

const handleSlot = (ui: UI, config: HandleSlotConfig) => {
  const importManager = new ImportManager(config);
  const { props = {} as any, children = [] } = ui;

  let uiCode = "";
  let jsCode = "";
  let effectCode = ""; // 专门存放需要在 useEffect 中执行的代码
  const slotId = (ui as any).meta?.id || (ui as any).id;
  
  // 创建或使用传入的 renderManager
  // 如果是根组件，创建新的 renderManager；否则使用传入的（共享同一个实例）
  const renderManager = config.checkIsRoot() 
    ? new RenderManager() 
    : (config.renderManager || new RenderManager());
  
  const currentProvider = config.getCurrentProvider();

  const addDependencyImport =
    config.addParentDependencyImport ||
    importManager.addImport.bind(importManager);

  const indent2 = indentation(config.codeStyle!.indent);
  let envDefineCode = "";
  if (config.checkIsRoot()) {
    // 只有根节点需要注入 useRef 和基础定义
    addDependencyImport({
      packageName: "react",
      dependencyNames: ["useRef", "useEffect", "useState"],
      importType: "named",
    });
    // 添加 Taro View 组件的导入
    addDependencyImport({
      packageName: "@tarojs/components",
      dependencyNames: ["View"],
      importType: "named",
    });
    // 添加工具包的 import
    const utilsPackageName = config.getUtilsPackageName();
    addDependencyImport({
      packageName: utilsPackageName,
      dependencyNames: ["WithCom", "WithWrapper"],
      importType: "named",
    });
    addDependencyImport({
      packageName: "./index.less",
      dependencyNames: [],
      importType: "module",
    });
    envDefineCode = genRootDefineCode(indent2, utilsPackageName);
    // 添加 useAppContext 的导入（根节点）
    addDependencyImport({
      packageName: config.getComponentPackageName(),
      dependencyNames: ["useAppContext"],
      importType: "named",
    });
  } else {
    // 插槽内部也需要声明自己的 inputs/outputs 变量
    envDefineCode = genSlotDefineCode(indent2);
    // 非根节点也需要 useAppContext，需要添加导入
    addDependencyImport({
      packageName: config.getComponentPackageName(),
      dependencyNames: ["useAppContext"],
      importType: "named",
    });
  }

  // 不再需要初始化控制器对象，WithCom 内部会处理

  let cssContent = convertStyleAryToCss(props.style?.styleAry, slotId);

  const nextConfig = {
    ...config,
    depth: config.depth + 1,
    addParentDependencyImport: addDependencyImport,
    renderManager, // 传递 renderManager
  };

  children.forEach((child) => {
    if (child.type === "com") {
      const { ui, js, cssContent: childCssContent } = handleCom(child, nextConfig as any);

      uiCode += uiCode ? "\n" + ui : ui;
      jsCode += js;
      if (childCssContent) {
        cssContent += (cssContent ? "\n" : "") + childCssContent;
      }
    } else if (child.type === "module") {
      const { ui, cssContent: childCssContent } = handleModule(child, nextConfig as any);
      uiCode += uiCode ? "\n" + ui : ui;
      if (childCssContent) {
        cssContent += (cssContent ? "\n" : "") + childCssContent;
      }
    } else {
      const { ui, js, cssContent: childCssContent } = handleDom(child, nextConfig as any);
      uiCode += uiCode ? "\n" + ui : ui;
      jsCode += js;
      if (childCssContent) {
        cssContent += (cssContent ? "\n" : "") + childCssContent;
      }
    }
  });

  // 识别场景级逻辑（如 Start 节点）
  if (config.checkIsRoot()) {
    const scene = (ui.meta as any)?.scene || (ui.meta as any);
    // 深度识别：尝试从 scene.events 或 ui.events 中获取
    const sceneEvents = scene?.events || (ui as any).events || [];
    
    if (Array.isArray(sceneEvents)) {
      sceneEvents.forEach((eventInfo: any) => {
        const { type, diagramId, active } = eventInfo;
        // 识别"启动"或"自动执行"类事件
        if (active !== false && type === "defined" && diagramId) {
          const event = config.getEventByDiagramId(diagramId);
          if (event) {
            const process = handleProcess(event, {
              ...config,
              target: 'comRefs.current',
              depth: 2,
              addParentDependencyImport: addDependencyImport,
              getParams: () => ({}),
            } as any).replace(/this\./g, 'comRefs.current.')
              .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, 'comRefs.current.$1.')
              .replace(/comRefs\.current\.slot_Index\./g, 'comRefs.current.'); // 移除 slot_Index 作用域
            
            if (process.trim()) {
              effectCode += `\n${indent2}  ${process.trim()}`;
            }
          }
        }
      });
    }
  }

  // 如果是根组件，生成所有 render 函数定义代码（放在 inputs/outputs 映射之后）
  let renderCodeBlock = "";
  if (config.checkIsRoot() && renderManager) {
    const renderIndent = indentation(config.codeStyle!.indent);
    renderCodeBlock = renderManager.toCode(renderIndent);
  }
  // 识别并提取 jsCode 中可能存在的自执行代码（如果有的话）
  // render 函数定义放在 jsCode（inputs/outputs 映射）之后
  const combinedJsCode = `${envDefineCode}${jsCode}${renderCodeBlock ? `\n${renderCodeBlock}` : ""}${wrapInEffect(indent2, effectCode)}`;
  const indent = indentation(config.codeStyle!.indent * config.depth);
  
  // 识别初始化逻辑（如果 handleCom 或逻辑处理层能标记哪些是初始化逻辑更好，
  // 目前我们可以在这里做一层包装，或者在 handleCom 生成时就包装好）
  // 暂时在根场景中，如果有特定的初始化执行逻辑，统一放入 useEffect

  // 生成 Taro View 组件
  const mergedStyle = {
    width: '100%',
    height: '100%',
    ...(ui as any).style,
    ...(props.style || {}),
  };
  const styleCode = JSON.stringify(convertRootStyle({
    ...mergedStyle,
    layout: (ui as any).layout || mergedStyle.layout
  }));
  const uiResult = `${indent}<View style={${styleCode}}>\n${uiCode}\n${indent}</View>`;

  // 如果是根场景，需要将生成的代码添加到结果中
  if (config.checkIsRoot()) {
    const scene = config.getCurrentScene();
    const fileName = config.getFileName?.(ui.meta.slotId) || ui.meta.title || "index";
    const componentId = (ui as any).meta?.id || (ui as any).id || (ui as any).meta?.slotId || "Index";
    // 兼容首字符为数字的情况，添加 I 前缀
    const componentName = `I${String(componentId).replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // 生成完整的组件代码，使用函数组件模板
    const componentCode = genComponentTemplate({
      componentName,
      combinedJsCode,
      uiResult
    });
    
    config.add({
      importManager,
      content: componentCode,
      cssContent,
      name: fileName,
    });
  }

  return {
    js: jsCode,
    combinedJsCode: combinedJsCode,
    ui: uiResult,
    cssContent,
    slots: [],
    scopeSlots: [],
  };
};

export default handleSlot;

