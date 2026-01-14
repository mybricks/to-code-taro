/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertComponentStyle, convertStyleAryToCss } from "./utils/style/converter";
import { indentation, firstCharToUpperCase, formatSlotContent, getUiComponentCode } from "./utils/templates/index";
import { genSlotRenderRef } from "./utils/templates/component";
import { RenderManager } from "./utils/templates/renderManager";
import handleSlot from "./handleSlot";
import { processComEvents } from "./processors/processComEvents";
import { handleProcess } from "./utils/logic/handleProcess";

export type Com = any;
export type HandleComConfig = any;
export type HandleComResult = any;

/**
 * 组件协议配置（参考鸿蒙规范）
 * - useWrap: 是否支持容器协议（如 Form 容器需要 metadata 包装）
 */
const COM_PROTOCOL: Record<string, { useWrap?: boolean }> = {
  "mybricks.taro.formContainer": { useWrap: true },
  "mybricks.taro.formAdditionContainer": { useWrap: true },
};

/**
 * 处理组件
 */
export const handleCom = (com: Com, config: HandleComConfig): HandleComResult => {
  const { meta, props } = com;
  const namespace = meta.def.namespace;

  // 鸿蒙规范：确保组件具有稳定的 DSL 名称（用于容器识别）
  if (!meta.name && config.getDslComNameById) {
    (meta as any).name = config.getDslComNameById(meta.id);
  }

  // 1. 如果是 JS 计算组件
  if (namespace === "mybricks.core-comlib.js-calculation") {
    return handleJsCalculation(com, config);
  }

  // 2. 准备组件元数据
  const { componentName, eventHandlers, comEventCode } = prepareComponent(com, config);

  // 3. 准备样式
  const { cssContent, rootStyle } = prepareStyles(com);
  let accumulatedCssContent = cssContent;

  // 4. 处理插槽
  const { slotsCode, accumulatedCssContent: slotCss, eventCode, childrenResults } = processComSlots(com, config, accumulatedCssContent);
  accumulatedCssContent = slotCss;

  // 5. 生成 UI 代码
  const ui = generateUiCode(com, config, componentName, rootStyle, comEventCode, slotsCode, eventHandlers);

  return {
    slots: [],
    scopeSlots: [],
    ui,
    js: eventCode,
    cssContent: accumulatedCssContent,
    outputsConfig: Object.keys(eventHandlers).length > 0 ? { [meta.id]: eventHandlers } : undefined,
    childrenResults,
    name: (meta as any).name, // 返回解析后的稳定名称
    rootStyle, // 返回转换后的根样式
  };
};

/**
 * 准备组件注册与事件
 */
const prepareComponent = (com: Com, config: HandleComConfig) => {
  const { meta } = com;
  const { importInfo, callName } = config.getComponentMeta(meta);
  
  const componentName = firstCharToUpperCase(callName || importInfo.name);
  const importName = firstCharToUpperCase(importInfo.name);

  config.addParentDependencyImport({
    packageName: importInfo.from,
    dependencyNames: [importName],
    importType: importInfo.type,
  });

  const currentProvider = config.getCurrentProvider();
  currentProvider.coms.add(meta.id);
  currentProvider.controllers.add(meta.id);

  const { comEventCode, outputsConfig } = processComEvents(com, config);

  return {
    componentName,
    eventHandlers: outputsConfig[meta.id] || {},
    comEventCode,
  };
};

/**
 * 准备样式转换
 */
const prepareStyles = (com: Com) => {
  const { meta, props } = com;
  // 鸿蒙化：合并 data.layout 到样式中，确保容器布局生效
  const styleWithLayout = {
    ...(props.style || {}),
    layout: props.data?.layout || props.style?.layout
  };
  const resultStyle = convertComponentStyle(styleWithLayout);
  const cssContent = convertStyleAryToCss((props.style as any)?.styleAry, meta.id);
  return { cssContent, rootStyle: resultStyle.root || {} };
};

/**
 * 处理组件内的所有插槽
 */
const processComSlots = (com: Com, config: HandleComConfig, initialCss: string) => {
  const { meta, props, slots } = com;
  let slotsCode = "";
  let accumulatedCssContent = initialCss;
  let eventCode = "";
  let allChildrenResults: any[] = [];

  if (!slots) return { slotsCode, accumulatedCssContent, eventCode, childrenResults: [] };

  const renderManager = config.renderManager || new RenderManager();
  const slotEntries = Object.entries(slots);
  
  slotEntries.forEach(([slotId, slot]: [string, any], index) => {
    // 鸿蒙规范：如果插槽内没有组件，跳过渲染
    const children = slot.comAry || slot.children || [];
    if (children.length === 0) {
      return;
    }

    const slotLayout = com.props.data?.layout;
    const result = (handleSlot as any)(slot, {
      ...config,
      checkIsRoot: () => false,
      depth: 1,
      renderManager,
      slotKey: slotId,
      // 鸿蒙化：传递父容器的布局配置给插槽
      layout: slotLayout,
    });

    eventCode += result.js;
    if (result.cssContent) {
      accumulatedCssContent += (accumulatedCssContent ? "\n" : "") + result.cssContent;
    }

    const renderId = `${meta.id}_${slotId}`;
    const baseIndentSize = config.codeStyle!.indent;
    const renderBodyIndent = indentation(config.codeStyle!.indent * 2);

    const formattedContent = formatSlotContent(result.ui, baseIndentSize, renderBodyIndent);
    
    // 鸿蒙化处理：针对表单容器进行别名对齐
    if (meta.def.namespace === "mybricks.taro.formContainer" && Array.isArray((props.data as any)?.items) && result.childrenResults) {
      const items = (props.data as any)?.items;
      result.childrenResults.forEach((childRes: any) => {
        const itemConfig = items.find((it: any) => it.id === childRes.id);
        if (itemConfig?.comName) {
          childRes.name = itemConfig.comName;
        }
      });
    }

    // 插槽驱动逻辑（用户侧可读的最小版）：
    // - 直连：params.inputValues -> 子组件 inputs
    // - js-autorun：执行一次 jsModules，并把 outputs 路由到下游 inputs
    const logicCode = buildSlotLogicCode({
      parentComId: meta.id,
      slotKey: slotId,
      children: result.childrenResults,
      config,
    });

    // 生成插槽描述注释内容
    const description = `${meta.title || meta.id}的${slot.title || slotId}插槽`;

    renderManager.register(
      renderId, 
      formattedContent, 
      result.childrenResults, 
      logicCode,
      slot.type,
      slot.wrap || slot.itemWrap || COM_PROTOCOL[meta.def.namespace]?.useWrap,
      description
    );
    
    if (result.childrenResults) {
      allChildrenResults = allChildrenResults.concat(result.childrenResults);
    }

    const slotIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
    slotsCode += genSlotRenderRef({
      slotId,
      renderId,
      indent: slotIndent,
      isLast: index === slotEntries.length - 1,
    });
  });

  return { slotsCode, accumulatedCssContent, eventCode, childrenResults: allChildrenResults };
};

/**
 * 生成插槽内部的驱动逻辑 (useEffect 监听 inputValues 并调用子组件 inputs)
 */
const buildSlotLogicCode = (args: {
  parentComId: string;
  slotKey: string;
  children: any[];
  config: HandleComConfig;
}): string => {
  const { parentComId, slotKey, config } = args;
  const indent = indentation(2);
  const indent2 = indentation(4);

  // 更直接：用 to-code-react 已经解析好的“effect event”（底层来自 diagrams[].conAry）
  // buildSlotLogicCode 只负责包一层 useEffect，不再自己扫描/猜测 cons/pinValueProxies
  const effectEvent = config.getEffectEvent?.({ comId: parentComId, slotId: slotKey });
  if (!effectEvent) return "";

  // 任意 slot 入参都映射到 params.inputValues[pinId]
  const paramsProxy = new Proxy(
    {},
    {
      get: (_t, key: string) => `params?.inputValues?.['${String(key)}']`,
    },
  ) as any;

  let process = handleProcess(effectEvent, {
    ...config,
    target: "comRefs.current",
    depth: 3,
    addParentDependencyImport: config.addParentDependencyImport,
    addConsumer: config.addConsumer,
    getParams: () => paramsProxy,
  } as any)
    .replace(/this\./g, "comRefs.current.")
    .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
    .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

  if (!process.trim()) return "";

  let code = `${indent}useEffect(() => {\n`;
  code += `${indent2}if (!params?.inputValues) return;\n`;
  code += `${process}\n`;
  code += `${indent}}, [params?.inputValues]);\n`;
  return code;
};

/**
 * 生成 UI 代码
 */
const generateUiCode = (
  com: Com,
  config: HandleComConfig,
  componentName: string,
  rootStyle: any,
  comEventCode: string,
  slotsCode: string,
  eventHandlers: any,
) => {
  const { meta, props } = com;
  const scene = config.getCurrentScene();
  const sceneCom = scene.coms?.[meta.id];

  return getUiComponentCode(
    {
      componentName,
      meta,
      props,
      resultStyle: { root: rootStyle },
      componentInputs: (sceneCom?.inputs?.length || 0) > 0 ? sceneCom.inputs : undefined,
      componentOutputs: (sceneCom?.outputs?.length || 0) > 0 ? sceneCom.outputs : (meta.outputs?.length || 0) > 0 ? meta.outputs : undefined,
      comEventCode,
      slotsCode,
      eventHandlers,
    },
    {
      codeStyle: config.codeStyle!,
      depth: config.depth + 1,
      verbose: config.verbose,
      checkIsRoot: config.checkIsRoot,
    } as any,
  );
};

/**
 * JS 计算组件专用处理
 */
const handleJsCalculation = (com: Com, config: HandleComConfig): HandleComResult => {
  const { meta, props } = com;
  const transformCode = props.data?.fns?.code || props.data?.fns?.transformCode || props.data?.fns;
  if (transformCode && config.addJSModule) {
    config.addJSModule({
      id: meta.id,
      title: meta.title || "JS计算",
      transformCode: typeof transformCode === "string" ? transformCode : "",
      inputs: (meta.model as any)?.inputs || [],
      outputs: (meta.model as any)?.outputs || [],
      data: props.data || {},
    });
  }
  return { slots: [], scopeSlots: [], ui: "", js: "", cssContent: "", outputsConfig: undefined };
};

export default handleCom;
