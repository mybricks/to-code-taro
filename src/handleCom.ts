/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  convertComponentStyle,
  ImportManager,
  firstCharToUpperCase,
  indentation,
  convertStyleAryToCss,
} from "./utils";
import { getUiComponentCode } from "./utils/code";
import handleSlot from "./handleSlot";
import {
  genSlotRenderRef,
  formatSlotContent
} from "./utils/code/component";
import { RenderManager } from "./utils/code/renderManager";
import { handleProcess } from "./utils/handleProcess";

import type { UI, BaseConfig } from "./toCodeTaro";

export type Com = Extract<UI["children"][0], { type: "com" }>;

type HandleComResult = {
  ui: string;
  js: string;
  slots: string[];
  scopeSlots: string[];
  cssContent: string;
  renderCode?: string; // 收集的 render 函数定义代码
  outputsConfig?: Record<string, any>; // 组件的 outputs 配置数据
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
  const { meta, props, slots, events } = com;

  const isModule = meta.def.namespace.startsWith("mybricks.taro.module");
  const { importInfo, callName } = config.getComponentMeta(meta);
  
  // 检查是否是 JS 计算组件（_muilt-inputJs 或 js-ai）
  const isJsCalculationComponent = 
    meta.def.namespace === "mybricks.taro._muilt-inputJs" ||
    meta.def.namespace === "mybricks.core-comlib.js-ai";

  if (isJsCalculationComponent) {
    // 收集 JS 计算组件信息
    // 优先使用原始代码（code），而不是转译后的代码（transformCode），避免包含 Babel 辅助函数
    const transformCode = props.data?.fns?.code || props.data?.fns?.transformCode || props.data?.fns;
    if (transformCode && config.addJSModule) {
      config.addJSModule({
        id: meta.id,
        title: meta.title || "JS计算",
        transformCode: typeof transformCode === 'string' ? transformCode : '',
        inputs: (meta.model as any)?.inputs || [],
        outputs: (meta.model as any)?.outputs || [],
        data: props.data || {},
      });
    }
    // JS 计算组件：不引入组件，在调用时使用 jsModules
    return {
      slots: [],
      scopeSlots: [],
      ui: '',
      js: '',
      cssContent: '',
      outputsConfig: undefined,
    };
  }
  
  // 确保组件名是大驼峰
  const componentName = firstCharToUpperCase(callName || importInfo.name);
  const importName = firstCharToUpperCase(importInfo.name);

  config.addParentDependencyImport({
    packageName: importInfo.from,
    dependencyNames: [importName],
    importType: importInfo.type,
  });

  const currentProvider = config.getCurrentProvider();
  const providerName = currentProvider.name;
  const componentController =
    config.getComponentController?.({
      com: meta,
      scene: config.getCurrentScene(),
    }) || `controller_${meta.id}`;

  const providerPath = `controllers.current.${providerName}`;
  const controllerPath = `${providerPath}.${componentController}`;

  // 在 JS 块中生成 inputs 映射逻辑
  const indentJs = indentation(config.codeStyle!.indent * (config.depth + 1));
  let eventCode = "";

  const scene = config.getCurrentScene();
  const sceneCom = scene.coms?.[meta.id];
  
  // 恢复：使用实例级激活的 inputs（无论是否连线）
  const componentInputs = sceneCom?.inputs || []; 
  const componentOutputs = sceneCom?.outputs || meta.outputs || [];

  // 不再生成 data_${meta.id}，WithCom 内部会使用 useModel
  // 不再生成 inputs 映射逻辑，WithCom 内部会使用 useBindInputs

  let comEventCode = "";
  // 收集 outputs 配置数据（用于 Provider）
  const outputsConfig: Record<string, any> = {};
  const eventConfig: Record<string, any> = {};

  const resultStyle = convertComponentStyle(props.style);
  const cssContent = convertStyleAryToCss((props.style as any)?.styleAry, meta.id);

  const outputEvents = events || {};

  Object.entries(outputEvents).forEach(
    ([eventId, eventInfo]: any) => {
      const { type, isAbstract, diagramId, schema, active } = eventInfo;

      if (active === false) return; // 过滤未激活的事件

      if (isAbstract) {
        config.setAbstractEventTypeDefMap({
          comId: com.meta.id,
          eventId,
          typeDef: config.getTypeDef(),
          schema,
        });
        return;
      }
      if (type === "fx") {
        const fxsMap = config.getFxsMap();
        const currentProvider = config.getCurrentProvider();
        const scene = config.getCurrentScene();
        const pinProxy = scene.pinProxies[`${props.id}-${eventId}`];
        const fxProvider = fxsMap[pinProxy.frameId];
        const isGlobal = fxProvider.name === "global";

        if (fxProvider.name !== currentProvider.name) {
          if (isGlobal) {
            config.addParentDependencyImport({
              packageName: config.getComponentPackageName(),
              dependencyNames: ["globalFxs"],
              importType: "named",
            });
          } else {
            config.addConsumer(fxProvider);
          }
        }

        const indent = indentation(
          config.codeStyle!.indent * (config.depth + 2),
        );

        comEventCode += `${indent}${eventId}: ${isGlobal ? `globalFxs` : `comRefs.current.${fxProvider.name}_Fxs`}.${pinProxy.frameId},\n`;
        // 收集 fx 类型的 outputs 配置
        eventConfig[eventId] = { connected: true };
        return;
      }
      if (type !== "defined") {
        return;
      }
      if (!diagramId) {
        return;
      }

      const event = config.getEventByDiagramId(diagramId)!;

      if (!event) {
        return;
      }

      // 事件处理函数的参数名
      const paramName = "value";

      let process = handleProcess(event, {
        ...config,
        target: 'comRefs.current',
        depth: config.depth + 3,
        addParentDependencyImport: config.addParentDependencyImport,
        getParams: () => {
          // 返回参数名，这样在 process 中会使用这个变量名
          return {
            [eventId]: paramName,
          };
        },
      }).replace(/this\./g, 'comRefs.current.')
        .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, 'comRefs.current.$1.') 
        .replace(/comRefs\.current\.slot_Index\./g, 'comRefs.current.'); // 移除 slot_Index 作用域

      if (process.includes("pageParams")) {
        config.addParentDependencyImport({
          packageName: config.getComponentPackageName(),
          dependencyNames: ["page"],
          importType: "named",
        });
        process =
          indentation(config.codeStyle!.indent * (config.depth + 3)) +
          `const pageParams: any = page.getParams("${config.getCurrentScene().id}");\n` +
          process;
      }

      // 生成事件处理函数代码（参照鸿蒙的实现方式）
      // handlerCode 应该是函数体代码，不包含事件名
      const handlerCode = `(${paramName}: any) => {\n${process}\n${indentation(config.codeStyle!.indent * (config.depth + 2))}}`;
      if (!outputsConfig[meta.id]) {
        outputsConfig[meta.id] = {};
      }
      // 将事件名转换为 onXxx 格式（onClick, onScroll 等）
      // 如果 eventId 已经是 onXxx 格式，直接使用；否则转换为 onXxx
      const onEventName = eventId.startsWith('on') 
        ? eventId 
        : `on${eventId.charAt(0).toUpperCase()}${eventId.slice(1)}`;
      outputsConfig[meta.id][onEventName] = handlerCode;
      
      // 收集 defined 类型的 outputs 配置
      eventConfig[eventId] = { connected: true };
    },
  );
  
  currentProvider.coms.add(meta.id);
  currentProvider.controllers.add(meta.id);

  // 生成组件 JSX 代码
  // 使用 getUiComponentCode 函数生成组件代码（参照鸿蒙的实现方式）
  const indent = indentation(config.codeStyle!.indent * config.depth);
  const indent2 = indentation(config.codeStyle!.indent * (config.depth + 1));

  // 处理插槽代码
  let slotsCode = "";
  let accumulatedCssContent = cssContent;
  let renderCode = ""; // 收集的 render 函数定义代码
  const renderManager = config.renderManager || new RenderManager();
  
  if (slots) {
    // 处理插槽 - 在 Taro/React 中，插槽通过 slots prop 传递
    // 参照鸿蒙的思考方式：非作用域插槽直接处理，作用域插槽需要特殊处理
    let slotsObjectCode = "";
    const slotEntries: Array<[string, any]> = Object.entries(slots);
    
    slotEntries.forEach(([slotId, slot]: [string, any], index) => {
      // 尝试从 props.style.slots 中获取原始 layout 信息
      const rawSlotInfo = (props.style as any)?.slots?.[slotId];
      if (rawSlotInfo?.layout) {
        slot.layout = rawSlotInfo.layout;
      }

      // 参照鸿蒙：非作用域插槽 depth 从 1 开始
      // 因为插槽内容会在 render 函数内部，需要从第 1 层开始缩进
      const { js, ui, cssContent: slotCssContent } = handleSlot(slot, {
        ...config,
        checkIsRoot: () => false,
        depth: 1, // 参照鸿蒙：非作用域插槽 depth 从 1 开始
        renderManager, // 传递 renderManager
      });
      eventCode += js;
      if (slotCssContent) {
        accumulatedCssContent += (accumulatedCssContent ? "\n" : "") + slotCssContent;
      }
      
      // 生成 render 函数ID：组件ID_插槽ID
      const renderId = `${meta.id}_${slotId}`;
      
      // 格式化插槽内容为 render 函数体代码
      const baseIndentSize = config.codeStyle!.indent; // 通常是 2
      // render 函数定义在根组件内部，缩进是根组件的缩进（通常是 2 个空格）
      // render 函数体内部的缩进 = 根组件缩进（2个空格） + 函数体内部缩进（2个空格）= 4个空格
      const rootIndent = config.codeStyle!.indent; // 根组件缩进
      const renderBodyIndent = indentation(rootIndent + config.codeStyle!.indent);
      const formattedContent = formatSlotContent({
        uiContent: ui,
        baseIndentSize,
        renderBodyIndent
      });
      
      // 注册 render 函数到 renderManager
      renderManager.register(renderId, formattedContent);
      
      // 生成插槽渲染函数引用
      const slotIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
      slotsObjectCode += genSlotRenderRef({
        slotId,
        renderId,
        indent: slotIndent,
        isLast: index === slotEntries.length - 1
      });
    });

    slotsCode = slotsObjectCode;
    // render 函数定义代码会在根组件级别统一生成，这里不需要单独生成
  }

  // 使用 getUiComponentCode 函数生成组件代码
  const componentResultStyle = { ...resultStyle };
  const rootStyle = componentResultStyle.root || {};
  delete componentResultStyle.root;

  // 从 outputsConfig 中提取事件处理函数
  const eventHandlers = outputsConfig[meta.id] || {};

  const uiComponentCode = getUiComponentCode(
    {
      componentName,
      meta,
      props,
      resultStyle: { root: rootStyle }, // 传递 root style
      componentInputs: componentInputs.length > 0 ? componentInputs : undefined,
      componentOutputs: componentOutputs.length > 0 ? componentOutputs : undefined,
      comEventCode,
      slotsCode,
      eventHandlers, // 传递事件处理函数
    },
    {
      codeStyle: config.codeStyle!,
      depth: config.depth + 1,
      verbose: config.verbose,
    } as any,
  );

  // WithCom 内部已经包含了 View 包装，不需要外层再包一层 View
  const ui = uiComponentCode;

  return {
    slots: [],
    scopeSlots: [],
    ui,
    js: eventCode,
    cssContent: accumulatedCssContent,
    outputsConfig: Object.keys(outputsConfig).length > 0 ? outputsConfig : undefined,
  };
};

export default handleCom;



