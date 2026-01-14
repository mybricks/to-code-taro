import { indentation, getSafeVarName, getInitValueBySchema } from "../utils";
import { handleProcess } from "../utils/logic/handleProcess";
import type { BaseConfig } from "../toCodeTaro";

function sanitizeBlockComment(text: any) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  // 避免 title 中出现 */ 破坏注释
  return s.replace(/\*\//g, "* /");
}

/**
 * 处理场景/插槽的逻辑（事件流、输入项等）
 */
export const processSceneLogic = (
  ui: any,
  config: any,
  addDependencyImport: any
) => {
  let initCode = "";
  let effectCode = "";
  const indent2 = indentation(config.codeStyle!.indent);

  const currentScene = config.getCurrentScene();
  const providerName = config.getCurrentProvider().name;

  // 1. 初始化变量和 FX：放在 render 阶段（useEffect 之前），避免用户在首帧触发事件时 $vars/$fxs 仍未初始化
  initCode += processLogicalInit(currentScene, config, addDependencyImport, indent2, providerName);
  
  // 如果不是 root，目前只处理初始化逻辑
  if (!config.checkIsRoot()) return { initCode, effectCode };

  // 2. 处理场景级事件（如 Start 节点）
  effectCode += processSceneEvents(ui, currentScene, config, addDependencyImport, indent2);

  // 3. 处理场景级输入（如 open）
  effectCode += processSceneInputs(currentScene, config, addDependencyImport, indent2);

  // 4. 处理变量监听事件（starter.type === 'var'，例如 changed）
  effectCode += processVarEvents(currentScene, config, addDependencyImport, indent2);

  return { initCode, effectCode };
};

/**
 * 处理变量监听事件（例如变量 changed -> 驱动一条 diagram）
 * 关键点：更新 UI 不是靠 React state，而是靠 runtime inputs（例如 Text.value）
 */
const processVarEvents = (
  currentScene: any,
  config: any,
  addDependencyImport: any,
  indent: string,
) => {
  let code = "";
  const varEvents = config.getVarEvents?.() || [];
  if (!Array.isArray(varEvents) || varEvents.length === 0) return code;

  // 用于订阅 variable.changed() 结果
  const importParams = { isPopup: config.isPopup };
  addDependencyImport({
    packageName: config.getUtilsPackageName(importParams),
    dependencyNames: ["SUBJECT_SUBSCRIBE", "SUBJECT_VALUE"],
    importType: "named",
  });
  varEvents.forEach((varEvent: any) => {
    if (varEvent?.type !== "var") return;
    // toCode-react 的 var event 自带 meta（变量组件）+ paramId（输出 pin，如 changed/return）
    const com = varEvent?.meta;
    if (!com?.id) return;
    const pinId = varEvent?.paramId || "changed";
    const varName = getSafeVarName(com);

    // params 映射：toCode-react 会用 paramSource: [{type:'params', id:'changed'}]
    // 这里用 Proxy 保证任何 params.xxx 都能落到 value 上（避免强依赖 paramPins）
    const paramsProxy = new Proxy(
      {},
      { get: () => "value" },
    ) as any;

    const process = handleProcess(varEvent, {
      ...config,
      target: "comRefs.current",
      depth: 3,
      addParentDependencyImport: addDependencyImport,
      getParams: () => paramsProxy,
    } as any)
      .replace(/this\.\$vars\./g, "$vars.current.")
      .replace(/this\.\$fxs\./g, "$fxs.current.")
      .replace(/this\./g, "comRefs.current.")
      .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
      .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

    if (!process.trim()) return;

    code += `\n${indent}  /** 变量 ${sanitizeBlockComment(com.title || varName)} 的 ${pinId} */`;
    // 统一逻辑函数：changed 触发 + 首次 get() 回放（解决“set 早于订阅”的丢事件）
    code += `\n${indent}  const run_${varName}_${pinId} = (value: any) => {\n${process}\n${indent}  };`;
    code += `\n${indent}  $vars.current.${varName}.${pinId}?.()[SUBJECT_SUBSCRIBE](run_${varName}_${pinId});`;
    code += `\n${indent}  const init_${varName}_${pinId} = $vars.current.${varName}.get?.();`;
    code += `\n${indent}  run_${varName}_${pinId}(init_${varName}_${pinId}?.[SUBJECT_VALUE]);`;
  });

  return code;
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
    const importParams = { isPopup: config.isPopup };
    addDependencyImport({
      packageName: config.getUtilsPackageName(importParams),
      dependencyNames: ["createVariable"],
      importType: "named",
    });
    // $vars 是页面级共享注册表（与 comRefs 同级）
    code += `\n${indent}const vars = ($vars.current ||= {});`;
    vars.forEach(([comId, com]: [string, any]) => {
      const varName = getSafeVarName(com);
      const varTitle = sanitizeBlockComment(com?.title || com?.model?.title || com?.model?.data?.title || varName);
      const initValue = JSON.stringify(getInitValueBySchema(com.schema, com.model?.data?.initValue));
      code += `\n${indent}/** 初始化 变量 ${varTitle} */`;
      code += `\n${indent}if (!vars.${varName}) vars.${varName} = createVariable(${initValue});`;
    });
  }

  // 2. 初始化 Fxs (使用 getFxEvents 获取 FX 列表)
  const fxEvents = config.getFxEvents();
  if (fxEvents.length > 0) {
    const importParams = { isPopup: config.isPopup };
    addDependencyImport({
      packageName: config.getUtilsPackageName(importParams),
      dependencyNames: ["createFx"],
      importType: "named",
    });
    // $fxs 是页面级共享注册表（与 comRefs 同级）
    code += `\n${indent}const fxs = ($fxs.current ||= {});`;
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
        .replace(/this\.\$vars\./g, "$vars.current.")
        .replace(/this\.\$fxs\./g, "$fxs.current.")
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

      code += `\n${indent}if (!fxs.${fxEvent.frameId}) fxs.${fxEvent.frameId} = createFx((${values}) => {\n${res}\n${indent}});`;
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
          .replace(/this\.\$vars\./g, "$vars.current.")
          .replace(/this\.\$fxs\./g, "$fxs.current.")
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

  // 约定：场景级 inputs 挂载到 $inputs，避免与组件 runtime 的 inputs 冲突
  code += `\n${indent}  const inputs = comRefs.current.$inputs;`;
  
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
      .replace(/this\.\$vars\./g, "$vars.current.")
      .replace(/this\.\$fxs\./g, "$fxs.current.")
      .replace(/this\./g, "comRefs.current.")
      .replace(/comRefs\.current\.([a-zA-Z0-9_]+)\.controller_/g, "comRefs.current.$1.")
      .replace(/comRefs\.current\.slot_Index\./g, "comRefs.current.");

    if (process.trim()) {
      code += `\n${indent}  inputs.${input.id} = (data: any) => {\n${process}\n${indent}  };`;

      if (input.id === "open") {
        const importParams = { isPopup: config.isPopup };
        const controllerName = config.isPopup ? "popupRouter" : "pageRouter";
        addDependencyImport({
          packageName: config.getComponentPackageName(importParams),
          dependencyNames: [controllerName, "SUBJECT_SUBSCRIBE"],
          importType: "named",
        });
        // 使用 SUBJECT_SUBSCRIBE 订阅，不修改 Subject.js
        code += `\n${indent}  ${controllerName}.getParams("${currentScene.id}")[SUBJECT_SUBSCRIBE]((val: any) => {\n${indent}    if (val) inputs.open(val);\n${indent}  });`;
      }
    }
  });
  return code;
};

