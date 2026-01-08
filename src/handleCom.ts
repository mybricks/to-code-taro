/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  convertComponentStyle,
  ImportManager,
  firstCharToUpperCase,
  convertStyleAryToCss,
  indentation,
} from "./utils";
import { getUiComponentCode } from "./utils/templates";
import handleSlot from "./handleSlot";
import { RenderManager } from "./utils/templates/renderManager";
import { processComEvents } from "./processors/processComEvents";
import { genSlotRenderRef, formatSlotContent } from "./utils/templates/component";

import type { UI, BaseConfig } from "./toCodeTaro";

export type Com = Extract<UI["children"][0], { type: "com" }>;

type HandleComResult = {
  ui: string;
  js: string;
  slots: string[];
  scopeSlots: string[];
  cssContent: string;
  renderCode?: string;
  outputsConfig?: Record<string, any>;
};

export interface HandleComConfig extends BaseConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
  addConsumer: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  addComId: (comId: string) => void;
  renderManager?: RenderManager;
  /** 当前是否处于某个插槽内部（scope slot id，如 item / content 等） */
  currentSlotId?: string;
  addJSModule?: (module: {
    id: string;
    title: string;
    transformCode: string;
    inputs: string[];
    outputs: string[];
    data: any;
  }) => void;
}

/**
 * 组件特例识别与配置（后续可迁移至外部 JSON 或由 config 提供）
 * 架构意义：集中化组件特有行为，保持生成器主逻辑纯净
 */
const COMPONENT_REGISTRY = {
  jsCalculationNamespaces: new Set([
    "mybricks.taro._muilt-inputJs",
    "mybricks.core-comlib.js-ai",
  ]),
  inputDataMapping: {
    "mybricks.taro.text": { value: "text" },
    "mybricks.taro.image": { setSrc: "src" },
  } as Record<string, Record<string, string>>,
  
  isJsCalculation(namespace: string) {
    return this.jsCalculationNamespaces.has(namespace);
  },
  
  resolveDataKey(namespace: string, pinId: string, staticData: any): string {
    const mapped = this.inputDataMapping[namespace]?.[pinId];
    if (mapped) return mapped;

    // 通用推导：setXxx -> xxx
    if (pinId.startsWith("set") && pinId.length > 3) {
      const candidate = pinId[3].toLowerCase() + pinId.slice(4);
      if (staticData && Object.prototype.hasOwnProperty.call(staticData, candidate)) {
        return candidate;
      }
    }
    return pinId;
  }
};

const FRAME_INPUT_NS = "mybricks.core-comlib.frame-input";

const handleCom = (com: Com, config: HandleComConfig): HandleComResult => {
  const { meta, props } = com;
  const namespace = meta.def.namespace;

  // 1. 处理 JS 计算组件（逻辑节点）
  if (COMPONENT_REGISTRY.isJsCalculation(namespace)) {
    return handleJsCalculation(com, config);
  }

  // 2. 准备基础信息与事件处理
  const { componentName, eventHandlers, comEventCode } = prepareComponent(com, config);

  // 3. 处理样式
  const { cssContent, rootStyle } = prepareStyles(com);

  // 4. 处理插槽（递归处理子树）
  const { slotsCode, accumulatedCssContent, eventCode } = processComSlots(com, config, cssContent);

  // 5. 生成最终 UI 代码（整合动态注入数据）
  const ui = generateUiCode(com, config, componentName, rootStyle, comEventCode, slotsCode, eventHandlers);

  return {
    slots: [],
    scopeSlots: [],
    ui,
    js: eventCode,
    cssContent: accumulatedCssContent,
    outputsConfig: Object.keys(eventHandlers).length > 0 ? { [meta.id]: eventHandlers } : undefined,
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
  const resultStyle = convertComponentStyle(props.style);
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

  if (!slots) return { slotsCode, accumulatedCssContent, eventCode };

  const renderManager = config.renderManager || new RenderManager();
  const slotEntries = Object.entries(slots);
  
  slotEntries.forEach(([slotId, slot]: [string, any], index) => {
    // 注入布局配置
    const rawSlotInfo = (props.style as any)?.slots?.[slotId];
    if (rawSlotInfo?.layout) {
      slot.layout = rawSlotInfo.layout;
    }

    const result = handleSlot(slot, {
      ...config,
      checkIsRoot: () => false,
      depth: 1,
      renderManager,
      slotKey: slotId,
    });

    eventCode += result.js;
    if (result.cssContent) {
      accumulatedCssContent += (accumulatedCssContent ? "\n" : "") + result.cssContent;
    }

    const renderId = `${meta.id}_${slotId}`;
    const baseIndentSize = config.codeStyle!.indent;
    const renderBodyIndent = indentation(config.codeStyle!.indent * 2);

    const formattedContent = formatSlotContent({
      uiContent: result.ui,
      baseIndentSize,
      renderBodyIndent,
    });
    
    renderManager.register(renderId, formattedContent);
    
    const slotIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
    slotsCode += genSlotRenderRef({
      slotId,
      renderId,
      indent: slotIndent,
      isLast: index === slotEntries.length - 1,
    });
  });

  return { slotsCode, accumulatedCssContent, eventCode };
};

/**
 * 生成 UI 组件代码，包含动态数据注入
 */
const generateUiCode = (
  com: Com,
  config: HandleComConfig,
  componentName: string,
  rootStyle: any,
  comEventCode: string,
  slotsCode: string,
  eventHandlers: any
) => {
  const { meta, props } = com;
  const scene = config.getCurrentScene();
  const sceneCom = scene.coms?.[meta.id];
  
  // 处理插槽场景下的动态数据绑定
  const dataCode = config.currentSlotId
    ? buildSlotInjectedDataCode({
        slotFrameId: config.currentSlotId,
        scene,
        comMeta: meta,
        propsData: props.data,
        paramsVar: "params",
      })
    : undefined;

  return getUiComponentCode(
    {
      componentName,
      meta,
      props,
      resultStyle: { root: rootStyle },
      dataCode,
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
 * 解析并生成动态注入的 data 表达式
 */
function buildSlotInjectedDataCode(params: {
  slotFrameId: string;
  scene: any;
  comMeta: any;
  propsData: any;
  paramsVar: string;
}): string | undefined {
  const { slotFrameId, scene, comMeta, propsData, paramsVar } = params;
  if (!scene || !slotFrameId || !comMeta?.id) return undefined;

  const mapping = collectSlotInputMappingForCom({
    slotFrameId,
    scene,
    targetComId: comMeta.id
  });

  if (!mapping || Object.keys(mapping).length === 0) return undefined;

  const namespace = comMeta.def.namespace;
  const staticData = propsData || {};
  const overrides: Record<string, string> = {};

  Object.entries(mapping).forEach(([targetPinId, slotInputKey]) => {
    const dataKey = COMPONENT_REGISTRY.resolveDataKey(namespace, targetPinId, staticData);
    const baseExpr = `${paramsVar}?.inputValues?.${slotInputKey}`;
    
    // 合并逻辑：若原始数据有值，用 ?? 兜底
    overrides[dataKey] = Object.prototype.hasOwnProperty.call(staticData, dataKey)
      ? `(${baseExpr} ?? ${JSON.stringify(staticData[dataKey])})`
      : baseExpr;
  });

  const allKeys = new Set([...Object.keys(staticData), ...Object.keys(overrides)]);
  const entries = Array.from(allKeys).map(key => 
    `${JSON.stringify(key)}: ${overrides[key] ?? JSON.stringify(staticData[key])}`
  );

  return `{ ${entries.join(", ")} }`;
}

/**
 * 鸿蒙化解析逻辑：通过连线关系（cons）和 作用域代理（pinValueProxies）推导数据源
 */
function collectSlotInputMappingForCom(params: {
  slotFrameId: string;
  scene: any;
  targetComId: string;
}): Record<string, string> {
  const { slotFrameId, scene, targetComId } = params;
  const mapping: Record<string, string> = {};

  const cons = scene?.cons || {};
  const pinValueProxies = scene?.pinValueProxies || {};
  const coms = scene?.coms || {};

  // 1. 找出当前插槽下所有的 frame-input -> 作用域 key 映射
  const frameInputComIdToKey: Record<string, string> = {};
  Object.entries(pinValueProxies).forEach(([key, proxy]: any) => {
    if (proxy?.type === "frame" && proxy.frameId === slotFrameId && proxy.pinId) {
      const [comId] = String(key).split("-");
      if (comId && coms[comId]?.def?.namespace === FRAME_INPUT_NS) {
        frameInputComIdToKey[comId] = proxy.pinId;
      }
    }
  });

  if (Object.keys(frameInputComIdToKey).length === 0) return mapping;

  // 2. 根据连线推导：frame-input 的输出连向了哪些组件 pin
  Object.entries(cons).forEach(([sourceKey, targets]) => {
    if (!Array.isArray(targets)) return;
    const [sourceComId] = String(sourceKey).split("-");
    const slotInputKey = frameInputComIdToKey[sourceComId];
    
    if (slotInputKey) {
      targets.forEach(t => {
        if (t?.comId === targetComId && t.pinId) {
          mapping[t.pinId] = slotInputKey;
        }
      });
    }
  });

  return mapping;
}

export default handleCom;
