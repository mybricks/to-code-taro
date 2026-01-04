import { indentation } from "../utils";
import { handleProcess } from "../utils/handleProcess";
import type { BaseConfig } from "../toCodeTaro";

/**
 * 处理场景/插槽的逻辑（事件流、输入项等）
 */
export const processSceneLogic = (
  ui: any,
  config: any,
  addDependencyImport: any
) => {
  let effectCode = "";
  const indent2 = indentation(config.codeStyle!.indent);

  const currentScene = config.getCurrentScene();
  const providerName = config.getCurrentProvider().name;

  // 1. 初始化变量和 FX (非 root 也要初始化，因为子场景也有自己的变量)
  effectCode += processLogicalInit(currentScene, config, addDependencyImport, indent2, providerName);
  
  // 如果不是 root，目前只处理初始化逻辑
  if (!config.checkIsRoot()) return effectCode;

  // 2. 处理场景级事件（如 Start 节点）
  effectCode += processSceneEvents(ui, currentScene, config, addDependencyImport, indent2);

  // 3. 处理场景级输入（如 open）
  effectCode += processSceneInputs(currentScene, config, addDependencyImport, indent2);

  return effectCode;
};

/**
 * 初始化变量和 FX
 */
const processLogicalInit = (
  scene: any,
  config: any,
  addDependencyImport: any,
  indent: string,
  providerName: string
) => {
  let code = "";

  // 1. 初始化 Vars
  const vars = Object.entries(scene.coms || {}).filter(([, com]: any) => {
    return com.def.namespace === "mybricks.core-comlib.var";
  });
  
  if (vars.length > 0) {
    addDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["createVariable"],
      importType: "named",
    });
    code += `\n${indent}const vars = comRefs.current.${providerName}_Vars;`;
    vars.forEach(([comId, com]: [string, any]) => {
      const initValue = JSON.stringify(com.model?.data?.initValue || {});
      code += `\n${indent}if (!vars.${com.title}.get) vars.${com.title} = createVariable(${initValue});`;
    });
  }

  // 2. 初始化 Fxs (使用 getFxEvents 获取 FX 列表)
  const fxEvents = config.getFxEvents();
  if (fxEvents.length > 0) {
    addDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["createFx"],
      importType: "named",
    });
    code += `\n${indent}const fxs = comRefs.current.${providerName}_Fxs;`;
    fxEvents.forEach((fxEvent: any) => {
      const res = handleProcess(fxEvent, {
        ...config,
        depth: 3,
        getCurrentScene: () => ({ id: fxEvent.frameId, ...fxEvent }),
        addParentDependencyImport: addDependencyImport,
        getParams: () => {
          return (fxEvent.paramPins || []).reduce(
            (pre: any, cur: any, index: number) => {
              pre[cur.id] = `value${index}`;
              return pre;
            },
            {} as Record<string, string>,
          );
        },
      } as any)
        .replace(/this\./g, "comRefs.current.")
        .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
        .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

      const values = (fxEvent.paramPins || [])
        .map((paramPin: any, index: number) => {
          if (paramPin.type === "config") {
            return `value${index}: any = ${JSON.stringify(fxEvent.initValues?.[paramPin.id] || {})}`;
          }
          return `value${index}: any`;
        })
        .join(", ");

      code += `\n${indent}if (!fxs.${fxEvent.frameId}.call) fxs.${fxEvent.frameId} = createFx((${values}) => {\n${res}\n${indent}});`;
    });
  }

  return code;
};

/**
 * 处理场景级事件
 */
const processSceneEvents = (ui: any, currentScene: any, config: any, addDependencyImport: any, indent: string) => {
  let code = "";
  const sceneEvents = currentScene?.events || ui?.events || [];
  if (!Array.isArray(sceneEvents)) return code;

  sceneEvents.forEach((eventInfo: any) => {
    const { type, diagramId, active } = eventInfo;
    if (active !== false && type === "defined" && diagramId) {
      const event = config.getEventByDiagramId(diagramId);
      if (event) {
        const process = handleProcess(event, {
          ...config,
          target: "comRefs.current",
          depth: 2,
          addParentDependencyImport: addDependencyImport,
          getParams: () => ({}),
        })
          .replace(/this\./g, "comRefs.current.")
          .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
          .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

        if (process.trim()) {
          code += `\n${indent}  ${process.trim()}`;
        }
      }
    }
  });
  return code;
};

/**
 * 处理场景级输入
 */
const processSceneInputs = (currentScene: any, config: any, addDependencyImport: any, indent: string) => {
  let code = "";
  const sceneInputs = currentScene?.inputs || [];
  if (!Array.isArray(sceneInputs) || sceneInputs.length === 0) return code;

  code += `\n${indent}  const inputs = comRefs.current.inputs;`;
  
  sceneInputs.forEach((input: any) => {
    const event = config.getFrameInputEvent(input.id, currentScene.id);
    if (!event) return;

    const process = handleProcess(event, {
      ...config,
      target: "comRefs.current",
      depth: 3,
      addParentDependencyImport: addDependencyImport,
      getParams: () => ({ [input.id]: "data" }),
    })
      .replace(/this\./g, "comRefs.current.")
      .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
      .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

    if (process.trim()) {
      code += `\n${indent}  inputs.${input.id} = (data: any) => {\n${process}\n${indent}  };`;

      if (input.id === "open") {
        addDependencyImport({
          packageName: config.getComponentPackageName(),
          dependencyNames: ["page", "SUBJECT_SUBSCRIBE"],
          importType: "named",
        });
        // 使用 SUBJECT_SUBSCRIBE 订阅，不修改 Subject.js
        code += `\n${indent}  page.getParams()[SUBJECT_SUBSCRIBE]((val: any) => {\n${indent}    if (val) inputs.open(val);\n${indent}  });`;
      }
    }
  });
  return code;
};

