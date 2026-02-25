import { indentation } from "../utils";
import { handleProcess } from "../utils/logic/handleProcess";
import type { HandleComConfig, Com } from "../handleCom";

/**
 * 处理组件事件
 */
export const processComEvents = (
  com: Com,
  config: HandleComConfig
): {
  comEventCode: string;
  outputsConfig: Record<string, any>;
  eventConfig: Record<string, any>;
} => {
  const { meta, events } = com;
  let comEventCode = "";
  const outputsConfig: Record<string, any> = {};
  const eventConfig: Record<string, any> = {};

  const outputEvents = events || {};

  Object.entries(outputEvents).forEach(([eventId, eventInfo]: any) => {
    const { type, isAbstract, diagramId, schema, active } = eventInfo;

    if (active === false) return;

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
      processFxEvent(eventId, com, config, (code) => {
        comEventCode += code;
      });
      eventConfig[eventId] = { connected: true };
      return;
    }

    if (type !== "defined") return;

    // 兼容：部分数据把 diagramId 放在 options.id（例如 test-data.json 的 outputEvents）
    const resolvedDiagramId =
      diagramId || eventInfo?.options?.diagramId || eventInfo?.options?.id;
    if (!resolvedDiagramId) return;

    const event = config.getEventByDiagramId(resolvedDiagramId);
    if (!event) return;

    const paramName = "value";
    let process = handleProcess(event, {
      ...config,
      target: "comRefs.current",
      depth: config.depth + 3,
      addParentDependencyImport: config.addParentDependencyImport,
      getParams: () => ({ [eventId]: paramName }),
    })
      .replace(/this\.\$vars\./g, "$vars.current.")
      .replace(/this\.\$fxs\./g, "$fxs.current.")
      .replace(/this\./g, "comRefs.current.")
      .replace(
        /comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g,
        "comRefs.current.$1.",
      )
      .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

    if (process.includes("pageParams")) {
      const importParams = { isPopup: (config as any).isPopup };
      const controllerName = (config as any).isPopup ? "popupRouter" : "pageRouter";
      config.addParentDependencyImport({
        packageName: config.getComponentPackageName(importParams),
        dependencyNames: [controllerName, "SUBJECT_VALUE"],
        importType: "named",
      });
      const indent = indentation(config.codeStyle!.indent * (config.depth + 3));
      // 使用 SUBJECT_VALUE 获取当前参数值，保持与 MyBricks 逻辑一致
      process = `${indent}const pageParams: any = ${controllerName}.getParams("${config.getCurrentScene().id}")[SUBJECT_VALUE];\n${process}`;
    }

    const handlerIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
    const handlerCode = `(${paramName}: any) => {\n${process}\n${handlerIndent}}`;
    
    if (!outputsConfig[meta.id]) {
      outputsConfig[meta.id] = {};
    }
    
    // 事件名必须与组件 runtime 的 outputs pin id 保持一致：
    // - 例如 tabs2 的输出是 `changeTab`（不是 `onChangeTab`）
    // - searchBar 的输出是 `onSearch`（本身就以 on 开头）
    outputsConfig[meta.id][eventId] = handlerCode;
    eventConfig[eventId] = { connected: true };
  });

  // 针对 mybricks.taro.popup 的特殊处理
  if (meta.def?.namespace === 'mybricks.taro.popup') {
    if (!outputsConfig[meta.id]) {
      outputsConfig[meta.id] = {};
    }
    
    const importParams = { isPopup: (config as any).isPopup };
    const sceneCom = config.getCurrentScene().coms?.[meta.id];
    const popupData = (sceneCom?.model as any)?.data || {};
    const isTrue = (v: any) => v === true || v === "true";

    // 如果 onClose 没被连接，且 visibleClose=true（会渲染关闭按钮），才添加默认 close
    // visibleClose=false 时，运行时不会触发 onClose（模板里只在 close 按钮点击时触发）
    if (!eventConfig['onClose'] && isTrue(popupData.visibleClose)) {
      config.addParentDependencyImport({
        packageName: config.getComponentPackageName(importParams),
        dependencyNames: ["popupRouter"],
        importType: "named",
      });
      const handlerIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
      const processIndent = indentation(config.codeStyle!.indent * (config.depth + 3));
      outputsConfig[meta.id]['onClose'] = `() => {\n${processIndent}popupRouter.close("${config.getCurrentScene().id}");\n${handlerIndent}}`;
      eventConfig['onClose'] = { connected: true };
    }

    // 如果 onClickOverlay 没被连接，且组件配置了点击遮罩关闭
    if (!eventConfig['onClickOverlay'] && isTrue(popupData.maskClose)) {
      config.addParentDependencyImport({
        packageName: config.getComponentPackageName(importParams),
        dependencyNames: ["popupRouter"],
        importType: "named",
      });
      const handlerIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
      const processIndent = indentation(config.codeStyle!.indent * (config.depth + 3));
      outputsConfig[meta.id]['onClickOverlay'] = `() => {\n${processIndent}popupRouter.close("${config.getCurrentScene().id}");\n${handlerIndent}}`;
      eventConfig['onClickOverlay'] = { connected: true };
    }
  }

  return { comEventCode, outputsConfig, eventConfig };
};

/**
 * 处理 FX 事件
 */
const processFxEvent = (
  eventId: string,
  com: Com,
  config: HandleComConfig,
  addCode: (code: string) => void
) => {
  const fxsMap = config.getFxsMap();
  const currentProvider = config.getCurrentProvider();
  const scene = config.getCurrentScene();
  const pinProxy = scene.pinProxies[`${com.props.id}-${eventId}`];
  if (!pinProxy) return;

  const fxProvider = fxsMap[pinProxy.frameId];
  if (!fxProvider) return;

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

  const indent = indentation(config.codeStyle!.indent * (config.depth + 2));
  const code = `${indent}${eventId}: ${
    isGlobal ? "globalFxs" : `comRefs.current.${fxProvider.name}_Fxs`
  }.${pinProxy.frameId},\n`;
  addCode(code);
};

