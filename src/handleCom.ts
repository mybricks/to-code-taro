/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  convertComponentStyle,
  ImportManager,
  firstCharToUpperCase,
  convertStyleAryToCss,
  indentation,
} from "./utils";
import { getUiComponentCode } from "./utils/code";
import handleSlot from "./handleSlot";
import { RenderManager } from "./utils/code/renderManager";
import { processComEvents } from "./processors/processComEvents";
import { genSlotRenderRef, formatSlotContent } from "./utils/code/component";

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
  addJSModule?: (module: {
    id: string;
    title: string;
    transformCode: string;
    inputs: string[];
    outputs: string[];
    data: any;
  }) => void;
}

const handleCom = (com: Com, config: HandleComConfig): HandleComResult => {
  const { meta, props } = com;

  // 1. 处理 JS 计算组件
  if (isJsCalculation(meta)) {
    return handleJsCalculation(com, config);
  }

  // 2. 注册到 Provider 并获取元信息
  const { componentName, eventHandlers, comEventCode } = prepareComponent(com, config);

  // 3. 处理样式
  const { cssContent, rootStyle } = prepareStyles(com);

  // 4. 处理插槽
  const { slotsCode, accumulatedCssContent, eventCode } = processComSlots(com, config, cssContent);

  // 5. 生成组件 UI 代码
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
 * 准备组件信息
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
 * 准备样式
 */
const prepareStyles = (com: Com) => {
  const { meta, props } = com;
  const resultStyle = convertComponentStyle(props.style);
  const cssContent = convertStyleAryToCss((props.style as any)?.styleAry, meta.id);
  return { cssContent, rootStyle: resultStyle.root || {} };
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
  eventHandlers: any
) => {
  const { meta, props } = com;
  const scene = config.getCurrentScene();
  const sceneCom = scene.coms?.[meta.id];
  const componentInputs = sceneCom?.inputs || []; 
  const componentOutputs = sceneCom?.outputs || meta.outputs || [];

  return getUiComponentCode(
    {
      componentName,
      meta,
      props,
      resultStyle: { root: rootStyle },
      componentInputs: componentInputs.length > 0 ? componentInputs : undefined,
      componentOutputs: componentOutputs.length > 0 ? componentOutputs : undefined,
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

const isJsCalculation = (meta: any) =>
  meta.def.namespace === "mybricks.taro._muilt-inputJs" ||
  meta.def.namespace === "mybricks.core-comlib.js-ai";

/**
 * 处理 JS 计算组件
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
 * 处理组件插槽
 */
const processComSlots = (com: Com, config: HandleComConfig, initialCss: string) => {
  const { meta, props, slots } = com;
  let slotsCode = "";
  let accumulatedCssContent = initialCss;
  let eventCode = "";

  if (slots) {
    const renderManager = config.renderManager || new RenderManager();
    const slotEntries = Object.entries(slots);
    
    slotEntries.forEach(([slotId, slot]: [string, any], index) => {
      const rawSlotInfo = (props.style as any)?.slots?.[slotId];
      if (rawSlotInfo?.layout) {
        slot.layout = rawSlotInfo.layout;
      }

      const result = handleSlot(slot, {
        ...config,
        checkIsRoot: () => false,
        depth: 1,
        renderManager,
      });

      eventCode += result.js;
      if (result.cssContent) {
        accumulatedCssContent += (accumulatedCssContent ? "\n" : "") + result.cssContent;
      }

      const renderId = `${meta.id}_${slotId}`;
      const baseIndentSize = config.codeStyle!.indent;
      const rootIndent = config.codeStyle!.indent;
      const renderBodyIndent = indentation(rootIndent + config.codeStyle!.indent);

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
  }

  return { slotsCode, accumulatedCssContent, eventCode };
};

export default handleCom;
