/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertComponentStyle, convertStyleAryToCss } from "./utils/style/converter";
import { indentation, firstCharToUpperCase, formatSlotContent, getUiComponentCode } from "./utils/templates/index";
import { genSlotRenderRef } from "./utils/templates/component";
import { RenderManager } from "./utils/templates/renderManager";
import handleSlot from "./handleSlot";
import { processComEvents } from "./processors/processComEvents";

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
  const { parentComId, slotKey, children, config } = args;
  const scene = config.getCurrentScene();
  const indent = indentation(2);
  const indent2 = indentation(4);
  const indent3 = indentation(6);

  const cons = scene?.cons || {};
  const coms = scene?.coms || {};

  const bodyLines: string[] = [];

  // 1) 直连：slot inputValues -> 子组件 inputs（最小可读版）
  children?.forEach((child: any) => {
    if (child?.type !== "com") return;

    const mapping = collectSlotInputMappingForCom({
      parentComId,
      slotKey,
      slotFrameId: slotKey,
      scene,
      targetComId: child.id,
    });

    Object.entries(mapping).forEach(([pinId, slotParamKey]) => {
      const safePin = String(pinId).replace(/[^a-zA-Z0-9_]/g, "_");
      const varName = `val_${child.id}_${safePin}`;
      bodyLines.push(`${indent3}const ${varName} = params?.inputValues?.['${slotParamKey}'];\n`);
      bodyLines.push(`${indent3}if (${varName} !== undefined) {\n`);
      bodyLines.push(`${indent3}${indent}comRefs.current['${child.id}']?.['${pinId}']?.(${varName});\n`);
      bodyLines.push(`${indent3}}\n`);
    });
  });

  // 2) js-autorun：执行并路由 outputs（保持短小：不注入 transformCode）
  // 注意：js 计算组件本身不一定出现在 childrenResults（因为它不渲染 UI），因此这里从 scene.coms 按 parentComId/frameId 扫描
  getSlotJsAutoruns(coms, parentComId, slotKey).forEach((jsCom) => {
    const jsId = jsCom.id;
    const jsInputs: string[] = (jsCom.model as any)?.inputs || jsCom.inputs || [];
    const jsOutputs: string[] = (jsCom.model as any)?.outputs || jsCom.outputs || [];
    if (!Array.isArray(jsInputs) || jsInputs.length === 0) return;

    // dead code elimination：outputs 没有任何下游连线就不生成
    if (!hasDownstream(cons, jsId, jsOutputs)) return;

    const jsInputMapping = collectSlotInputMappingForCom({
      parentComId,
      slotKey,
      slotFrameId: slotKey,
      scene,
      targetComId: jsId,
    });

    const jsArgVars: string[] = [];
    jsInputs.forEach((jsPin, idx) => {
      const slotParamKey = jsInputMapping[jsPin];
      const varName = `slot_${jsId}_arg_${idx}`;
      bodyLines.push(`${indent3}const ${varName} = ${getSlotParamExpr(slotParamKey, idx)};\n`);
      jsArgVars.push(varName);
    });

    const jsHandleVar = `jsModules_${jsId}`;
    const jsResVar = `jsModules_${jsId}_result`;
    bodyLines.push(
      `${indent3}const ${jsHandleVar} = jsModules["${jsId}"]({ inputs: ${JSON.stringify(jsInputs)}, outputs: ${JSON.stringify(jsOutputs)}, title: "${jsCom.title || "JS计算"}", data: ${JSON.stringify({})} }, appContext);\n`,
    );
    bodyLines.push(`${indent3}const ${jsResVar} = ${jsHandleVar}(${jsArgVars.join(", ")});\n`);

    getRoutes(cons, jsId, jsOutputs).forEach(({ outPin, targetId, targetPin }) => {
      bodyLines.push(`${indent3}comRefs.current['${targetId}']?.['${targetPin}']?.(${jsResVar}?.['${outPin}']);\n`);
    });
  });

  if (bodyLines.length === 0) return "";

  let code = `${indent}useEffect(() => {\n`;
  code += `${indent2}if (!params?.inputValues) return;\n`;
  code += bodyLines.join("");
  code += `${indent}}, [params?.inputValues]);\n`;
  return code;
};

function getSlotJsAutoruns(coms: any, parentComId: string, slotKey: string) {
  return Object.values(coms || {}).filter((com: any) => {
    return (
      com &&
      com?.def?.namespace === "mybricks.taro._muilt-inputJs" &&
      com?.def?.rtType === "js-autorun" &&
      com?.parentComId === parentComId &&
      com?.frameId === slotKey
    );
  }) as any[];
}

function hasDownstream(cons: any, jsId: string, jsOutputs: any) {
  if (!Array.isArray(jsOutputs) || jsOutputs.length === 0) return false;
  return jsOutputs.some((outPin) => {
    const targets = cons?.[`${jsId}-${outPin}`];
    return Array.isArray(targets) && targets.length > 0;
  });
}

function parseTarget(t: any) {
  if (typeof t === "string") {
    const [targetId, targetPin] = t.split("-");
    return { targetId, targetPin };
  }
  return { targetId: t?.comId, targetPin: t?.pinId };
}

function getRoutes(cons: any, jsId: string, jsOutputs: string[]) {
  const routes: Array<{ outPin: string; targetId: string; targetPin: string }> = [];
  (jsOutputs || []).forEach((outPin) => {
    const targets = cons?.[`${jsId}-${outPin}`];
    if (!Array.isArray(targets) || targets.length === 0) return;
    targets.forEach((t: any) => {
      const { targetId, targetPin } = parseTarget(t);
      if (targetId && targetPin) routes.push({ outPin, targetId, targetPin });
    });
  });
  return routes;
}

function getSlotParamExpr(slotParamKey: any, idx: number) {
  if (slotParamKey) {
    return `params?.inputValues?.['${slotParamKey}']`;
  }
  // 兜底：列表 item 场景最常见 inputValue0 -> itemData, inputValue1 -> index
  const fallbackKey = idx === 0 ? "itemData" : idx === 1 ? "index" : undefined;
  return fallbackKey ? `params?.inputValues?.['${fallbackKey}']` : "undefined";
}

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

/**
 * 鸿蒙化解析逻辑：通过连线关系（cons）和 作用域代理（pinValueProxies）推导数据源映射
 */
function collectSlotInputMappingForCom(params: {
  parentComId?: string;
  slotKey?: string;
  slotFrameId: string;
  scene: any;
  targetComId: string;
}): Record<string, string> {
  const { parentComId, slotKey, slotFrameId, scene, targetComId } = params;
  const mapping: Record<string, string> = {};

  const cons = scene?.cons || {};
  const pinValueProxies = scene?.pinValueProxies || {};
  const coms = scene?.coms || {};

  // 1. 识别属于当前插槽的 frame-input
  const frameInputComIdToKey: Record<string, string> = {};
  Object.entries(pinValueProxies).forEach(([key, proxy]: any) => {
    if (proxy?.type === "frame" && proxy.frameId === slotFrameId && proxy.pinId) {
      const [comId] = String(key).split("-");
      if (comId && coms[comId]?.def?.namespace === "mybricks.core-comlib.frame-input") {
        frameInputComIdToKey[comId] = proxy.pinId;
      }
    }
  });

  // 1.1 pinValueProxies 不存在时（部分 DSL 导出没有该字段），fallback 到 cons 的 slot-key 约定：
  // `${parentComId}-${slotKey}-${slotParamKey}` -> `${targetComId}-${pinId}`
  if (Object.keys(frameInputComIdToKey).length === 0 && parentComId && slotKey) {
    const prefix = `${parentComId}-${slotKey}-`;
    Object.entries(cons).forEach(([sourceKey, targets]) => {
      if (!String(sourceKey).startsWith(prefix)) return;
      if (!Array.isArray(targets)) return;
      const slotParamKey = String(sourceKey).slice(prefix.length);
      targets.forEach((t: any) => {
        const targetId = typeof t === "string" ? t.split("-")[0] : t.comId;
        const targetPin = typeof t === "string" ? t.split("-")[1] : t.pinId;
        if (targetId === targetComId && targetPin) {
          mapping[targetPin] = slotParamKey;
        }
      });
    });
    return mapping;
  }

  if (Object.keys(frameInputComIdToKey).length === 0) return mapping;

  // 2. 推导连线：frame-input -> targetCom
  Object.entries(cons).forEach(([sourceKey, targets]) => {
    if (!Array.isArray(targets)) return;
    const [sourceComId] = String(sourceKey).split("-");
    const slotInputKey = frameInputComIdToKey[sourceComId];
    
    if (slotInputKey) {
      targets.forEach(t => {
        const targetId = typeof t === 'string' ? t.split('-')[0] : t.comId;
        const targetPin = typeof t === 'string' ? t.split('-')[1] : t.pinId;
        if (targetId === targetComId && targetPin) {
          mapping[targetPin] = slotInputKey;
        }
      });
    }
  });

  return mapping;
}

export default handleCom;
