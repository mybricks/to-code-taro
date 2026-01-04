import { indentation } from "../utils";
import { handleProcess } from "../utils/handleProcess";
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

    if (type !== "defined" || !diagramId) return;

    const event = config.getEventByDiagramId(diagramId);
    if (!event) return;

    const paramName = "value";
    let process = handleProcess(event, {
      ...config,
      target: "comRefs.current",
      depth: config.depth + 3,
      addParentDependencyImport: config.addParentDependencyImport,
      getParams: () => ({ [eventId]: paramName }),
    })
      .replace(/this\./g, "comRefs.current.")
      .replace(
        /comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g,
        "comRefs.current.$1.",
      )
      .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

    if (process.includes("pageParams")) {
      config.addParentDependencyImport({
        packageName: config.getComponentPackageName(),
        dependencyNames: ["page", "SUBJECT_VALUE"],
        importType: "named",
      });
      const indent = indentation(config.codeStyle!.indent * (config.depth + 3));
      // 使用 SUBJECT_VALUE 获取当前参数值，保持与 MyBricks 逻辑一致
      process = `${indent}const pageParams: any = page.getParams("${config.getCurrentScene().id}")[SUBJECT_VALUE];\n${process}`;
    }

    const handlerIndent = indentation(config.codeStyle!.indent * (config.depth + 2));
    const handlerCode = `(${paramName}: any) => {\n${process}\n${handlerIndent}}`;
    
    if (!outputsConfig[meta.id]) {
      outputsConfig[meta.id] = {};
    }
    
    const onEventName = eventId.startsWith("on")
      ? eventId
      : `on${eventId.charAt(0).toUpperCase()}${eventId.slice(1)}`;
    outputsConfig[meta.id][onEventName] = handlerCode;
    eventConfig[eventId] = { connected: true };
  });

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

