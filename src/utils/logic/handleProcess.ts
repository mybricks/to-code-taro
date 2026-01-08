/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImportManager } from "../common/ImportManager";
import { indentation } from "../common/helper";
import { genObjectCode } from "../common/object";
import type { BaseConfig } from "../../toCodeTaro";

export interface HandleProcessConfig extends BaseConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
  getParams: () => Record<string, string>;
  addConsumer: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  target?: string;
}

/**
 * 判断是否是 JS 计算组件
 */
const isJsCalculationComponent = (namespace: string): boolean => {
  return (
    namespace === "mybricks.taro._muilt-inputJs" ||
    namespace === "mybricks.core-comlib.js-ai"
  );
};

/**
 * 判断是否是 JS API 组件
 */
const isJsApiComponent = (namespace: string, rtType?: string): boolean => {
  return (
    namespace.startsWith("mybricks.taro._") &&
    rtType?.match(/^js/gi) !== null
  );
};

export const handleProcess = (
  event: Exclude<ReturnType<BaseConfig["getEventByDiagramId"]>, undefined>,
  config: HandleProcessConfig,
) => {
  let code = "";
  const { process } = event;

  const indent = indentation(config.codeStyle!.indent * config.depth);
  const indent2 = indentation(config.codeStyle!.indent * (config.depth + 1));

  // 检查是否有 JS 计算组件
  const hasJsCalculationComponent = process.nodesDeclaration.some(
    ({ meta }: any) => isJsCalculationComponent(meta.def.namespace)
  );

  // 如果有 JS 计算组件，导入已初始化的 jsModules
  if (hasJsCalculationComponent) {
    config.addParentDependencyImport({
      packageName: "../../common/index",
      dependencyNames: ["jsModules"],
      importType: "named",
    });
  }

  // 处理节点声明
  process.nodesDeclaration.forEach(({ meta, props }: any) => {
    if (meta.def.namespace.startsWith("mybricks.taro.module")) {
      return;
    }

    // 检查组件类型
    const isJsCalc = isJsCalculationComponent(meta.def.namespace);
    const isJsApi = isJsApiComponent(meta.def.namespace, meta.def.rtType);

    const { importInfo, name, callName } = config.getComponentMeta(meta);
    const componentName = name;

    if (isJsCalc) {
      code += generateJsCalculationComponentCode({
        meta,
        props,
        componentName,
        config,
        event,
        indent,
        indent2,
      });
      return;
    }

    if (isJsApi) {
      code += generateJsApiComponentCode({
        meta,
        props,
        componentName,
        callName,
        importInfo,
        config,
        event,
        indent,
        indent2,
      });
      return;
    }

    config.addParentDependencyImport({
      packageName: importInfo.from,
      dependencyNames: [importInfo.name],
      importType: importInfo.type,
    });

    const componentNameWithId =
      config.getEventNodeName?.({
        com: meta,
        scene: config.getCurrentScene(),
        type: "declaration",
        event,
      }) || `${componentName}_${meta.id}`;

    config.addParentDependencyImport({
      packageName: config.getComponentPackageName(),
      dependencyNames: ["useAppContext"],
      importType: "named",
    });

    code +=
      `${indent}/** ${meta.title} */` +
      `\n${indent}const ${componentNameWithId} = ${callName || componentName}({` +
      (config.verbose ? `\n${indent2}title: "${meta.title}",` : "") +
      (props.data
        ? `\n${indent2}data: ${genObjectCode(props.data, {
            initialIndent: config.codeStyle!.indent * (config.depth + 1),
            indentSize: config.codeStyle!.indent,
          })},`
        : "") +
      (props.inputs
        ? `\n${indent2}inputs: [${props.inputs.map((input: string) => `"${input}"`).join(", ")}],`
        : "") +
      (props.outputs
        ? `\n${indent2}outputs: [${props.outputs.map((output: string) => `"${output}"`).join(", ")}],`
        : "") +
      `\n${indent}}, appContext)\n`;
  });

  // 处理节点调用
  process.nodesInvocation.forEach((props: any) => {
    const { componentType, category, runType } = props;
    let nextValue = getNextValue(props, config, event);
    const isSameScope = checkIsSameScope(event, props);
    const nextCode = getNextCode(props, config, isSameScope, event);

    if (code) {
      code += "\n";
    }

    if (componentType === "js") {
      if (category === "scene") {
        const _sceneId = props.meta.model.data._sceneId;
        const targetScene = config.getSceneById(_sceneId);
        const isPopup = targetScene?.type === 'popup' || targetScene?.deps?.some((dep: any) => dep.namespace === 'mybricks.taro.popup');
        const controllerName = isPopup ? "popupRouter" : "pageRouter";

        config.addParentDependencyImport({
          packageName: config.getComponentPackageName(),
          dependencyNames: [controllerName],
          importType: "named",
        });

        const operateName =
          props.meta.model.data.openType === "redirect" ? "replace" : "open";

        code +=
          `${indent}/** 打开 ${props.meta.title} */` +
          `\n${indent}${nextCode}${controllerName}.${operateName}("${config.getPageId?.(_sceneId) || _sceneId}", ${nextValue})`;
      } else if (category === "frameOutput") {
        // 场景/弹窗输出（commit/cancel/apply/close）
        const currentScene = config.getCurrentScene();
        // pinProxies 的结构在不同数据/版本里不完全一致，这里按最小字段兼容
        const pinProxy: any =
          (currentScene as any)?.pinProxies?.[`${props.meta.id}-${props.id}`];
        if (pinProxy?.frameId && pinProxy?.pinId) {
          const method = pinProxy.pinId as string;
          const controllerName = (config as any).isPopup ? "popupRouter" : "pageRouter";

          config.addParentDependencyImport({
            packageName: config.getComponentPackageName(),
            dependencyNames: [controllerName],
            importType: "named",
          });

          // 仅支持 Page 内置的四种输出方法
          if (["commit", "cancel", "apply", "close"].includes(method)) {
            const sceneId = pinProxy.frameId || currentScene?.id;
            const argCode = nextValue ? `, ${nextValue}` : "";
            code +=
              `${indent}/** ${props.meta.title} 输出 ${method} */` +
              `\n${indent}${nextCode}${controllerName}.${method}("${sceneId}"${argCode})`;
          }
        }
      } else if (category === "normal") {
        let componentNameWithId = getComponentNameWithId(props, config, event);
        code +=
          `${indent}/** 调用 ${props.meta.title} */` +
          `\n${indent}${nextCode}${componentNameWithId}(${runType === "input" ? nextValue : ""})`;
      } else if (category === "var") {
        if (props.meta.global) {
          config.addParentDependencyImport({
            packageName: config.getComponentPackageName(),
            dependencyNames: ["globalVars"],
            importType: "named",
          });
          code +=
            `${indent}/** ${props.title} 全局变量 ${props.meta.title} */` +
            `\n${indent}${nextCode}globalVars.${props.meta.title}.${props.id}(${nextValue})`;
        } else {
          const currentProvider = getCurrentProvider(
            { isSameScope, props },
            config,
          );
          code +=
            `${indent}/** ${props.title} 变量 ${props.meta.title} */` +
            `\n${indent}${nextCode}this.${currentProvider.name}_Vars.${props.meta.title}.${props.id}(${nextValue})`;
        }
      } else if (category === "fx") {
        if (props.meta.global) {
          config.addParentDependencyImport({
            packageName: config.getComponentPackageName(),
            dependencyNames: ["globalFxs"],
            importType: "named",
          });
          code +=
            `${indent}/** 调用全局Fx ${props.meta.title} */` +
            `\n${indent}${nextCode}globalFxs.${props.meta.ioProxy.id}(${nextValue})`;
        } else {
          const currentProvider = getCurrentProvider(
            { isSameScope, props },
            config,
          );
          code +=
            `${indent}/** 调用Fx ${props.meta.title} */` +
            `\n${indent}${nextCode}this.${currentProvider.name}_Fxs.${props.meta.ioProxy.id}(${nextValue})`;
        }
      }
    } else {
      // UI 组件处理
      code +=
        `${indent}/** 调用 ${props.meta.title} 的 ${props.title} */` +
        // 新架构：WithCom 会把 inputProxy 挂到 comRefs.current[comId]
        // 因此这里直接调用 this.<comId>.<pinId>(...)，后续会被 replace 成 comRefs.current.<comId>.<pinId>(...)
        `\n${indent}${nextCode}this.${props.meta.id}.${props.id}(${nextValue})`;
    }
  });

  if (["fx", "extension-api", "extension-bus"].includes(event.type)) {
    const returnCode = Object.entries(event.frameOutputs).reduce(
      (pre, [, { id, outputs }]: any) => {
        if (!outputs) {
          return pre + `${indent2}${id}: undefined,\n`;
        } else {
          const next = outputs
            .map((output: any) => {
              return getNextValueWithParam(output, config, event);
            })
            .join(", ");

          return pre + `${indent2}${id}: ${next},\n`;
        }
      },
      "",
    );

    if (returnCode) {
      code += `\n${indent}return {\n${returnCode}${indent}}`;
    }
  }

  return code;
};

const checkIsSameScope = (event: any, props: any) => {
  if (
    event.type === "com" &&
    event.meta.parentComId === props.meta.parentComId &&
    event.meta.frameId === props.meta.frameId
  ) {
    return true;
  } else if (
    event.type === "slot" &&
    event.comId === props.meta.parentComId &&
    event.slotId === props.meta.frameId
  ) {
    return true;
  } else if (
    event.type === "fx" &&
    event.parentComId === props.meta.parentComId &&
    event.parentSlotId === props.meta.frameId
  ) {
    return true;
  }
  return false;
};

const getComponentNameWithId = (props: any, config: HandleProcessConfig, event: any) => {
  // 检查是否是 JS 计算组件
  if (isJsCalculationComponent(props.meta.def.namespace)) {
    // JS 计算组件：使用 jsModules_${meta.id} 作为变量名
    if (config.getEventNodeName) {
      const componentName = config.getEventNodeName({
        com: props.meta,
        scene: config.getCurrentScene(),
        event,
        type: "declaration",
      });
      if (componentName) {
        return componentName;
      }
    }
    return `jsModules_${props.meta.id}`;
  }

  if (config.getEventNodeName) {
    const componentName = config.getEventNodeName({
      com: props.meta,
      scene: config.getCurrentScene(),
      event,
      type: "declaration",
    });
    if (componentName) {
      return componentName;
    }
  }
  const { name } = config.getComponentMeta(props.meta);
  // 确保变量名合法（将连字符替换为下划线）
  const sanitizedName = name.replace(/-/g, '_');
  return `${sanitizedName}_${props.meta.id}`;
};

const getNextCode = (props: any, config: HandleProcessConfig, isSameScope: boolean, event: any) => {
  const { nextParam } = props;
  if (!nextParam.length) {
    return "";
  }

  const componentNameWithId = getComponentNameWithId(props, config, event);
  return `const ${componentNameWithId}_result = `;
};

const getNextValue = (props: any, config: HandleProcessConfig, event: any) => {
  const { paramSource } = props;
  const nextValue = paramSource.map((param: any) => {
    if (param.type === "params") {
      const params = config.getParams();
      return params[param.id];
    } else if (param.type === "constant") {
      return JSON.stringify(param.value);
    }
    const componentNameWithId = getComponentNameWithId(param, config, event);
    // 变量组件直接返回 Subject，不加 .id 后缀
    if (param.meta?.def?.namespace?.includes(".var")) {
      return `${componentNameWithId}_result`;
    }
    return `${componentNameWithId}_result.${param.id}`;
  });

  return nextValue.join(", ");
};

const getNextValueWithParam = (
  param: any,
  config: HandleProcessConfig,
  event: any,
) => {
  if (param.type === "params") {
    const params = config.getParams();
    return params[param.id];
  }
  const componentNameWithId = getComponentNameWithId(param, config, event);
  // 变量组件直接返回 Subject
  if (param.meta?.def?.namespace?.includes(".var")) {
    return `${componentNameWithId}_result`;
  }
  return `${componentNameWithId}_result.${param.id}`;
};

const getCurrentProvider = (
  params: { isSameScope: boolean; props: any },
  config: HandleProcessConfig,
) => {
  const providerMap = config.getProviderMap();
  const { isSameScope, props } = params;
  const { meta } = props;
  const { parentComId, frameId } = meta;

  const providerName =
    config.getProviderName?.({ com: meta, scene: config.getCurrentScene() }) ||
    (!parentComId
      ? "slot_Index"
      : `slot_${frameId[0].toUpperCase() + frameId.slice(1)}_${parentComId}`);

  const provider = providerMap?.[providerName];

  // 兜底：如果 provider 不存在（例如新架构未构建 slot provider），回退到当前 provider
  const safeProvider = provider || config.getCurrentProvider?.();

  if (!isSameScope && safeProvider) {
    config.addConsumer?.(safeProvider);
  }

  return safeProvider;
};

/**
 * 生成 JS 计算组件的代码
 */
const generateJsCalculationComponentCode = (params: {
  meta: any;
  props: any;
  componentName: string;
  config: HandleProcessConfig;
  event: any;
  indent: string;
  indent2: string;
}): string => {
  const { meta, props, componentName, config, event, indent, indent2 } = params;

  const componentNameWithId =
    config.getEventNodeName?.({
      com: meta,
      scene: config.getCurrentScene(),
      type: "declaration",
      event,
    }) || `jsModules_${meta.id}`;

  // JS 计算组件的 data 只包含必要配置（如 runImmediate），不包含 fns、transformCode 等
  const jsData: any = {};
  if (props.data && 'runImmediate' in props.data) {
    jsData.runImmediate = props.data.runImmediate;
  }

  return (
    `${indent}/** ${meta.title} */` +
    `\n${indent}const ${componentNameWithId} = jsModules.${meta.id}({` +
    (config.verbose ? `\n${indent2}title: "${meta.title}",` : "") +
    (Object.keys(jsData).length > 0
      ? `\n${indent2}data: ${genObjectCode(jsData, {
          initialIndent: config.codeStyle!.indent * (config.depth + 1),
          indentSize: config.codeStyle!.indent,
        })},`
      : "") +
    (props.inputs
      ? `\n${indent2}inputs: [${props.inputs.map((input: string) => `"${input}"`).join(", ")}],`
      : "") +
    (props.outputs
      ? `\n${indent2}outputs: [${props.outputs.map((output: string) => `"${output}"`).join(", ")}],`
      : "") +
    `\n${indent}}, appContext)\n`
  );
};

/**
 * 生成 JS API 组件的代码
 */
const generateJsApiComponentCode = (params: {
  meta: any;
  props: any;
  componentName: string;
  callName?: string;
  importInfo: any;
  config: HandleProcessConfig;
  event: any;
  indent: string;
  indent2: string;
}): string => {
  const {
    meta,
    props,
    componentName,
    callName,
    importInfo,
    config,
    event,
    indent,
    indent2,
  } = params;

  // 导入 createJSHandle
  config.addParentDependencyImport({
    packageName: "../../core/mybricks/index",
    dependencyNames: ["createJSHandle"],
    importType: "named",
  });

  // 导入 JS API 组件
  config.addParentDependencyImport({
    packageName: importInfo.from,
    dependencyNames: [importInfo.name],
    importType: importInfo.type,
  });

  const componentNameWithId =
    config.getEventNodeName?.({
      com: meta,
      scene: config.getCurrentScene(),
      type: "declaration",
      event,
    }) || `${componentName}_${meta.id}`;

  config.addParentDependencyImport({
    packageName: config.getComponentPackageName(),
    dependencyNames: ["useAppContext"],
    importType: "named",
  });

  return (
    `${indent}/** ${meta.title} */` +
    `\n${indent}const ${componentNameWithId} = createJSHandle(${callName || componentName}, {` +
    `\n${indent2}props: {` +
    (config.verbose ? `\n${indent2}  title: "${meta.title}",` : "") +
    (props.data
      ? `\n${indent2}  data: ${genObjectCode(props.data, {
          initialIndent: config.codeStyle!.indent * (config.depth + 2),
          indentSize: config.codeStyle!.indent,
        })},`
      : "") +
    (props.inputs
      ? `\n${indent2}  inputs: [${props.inputs.map((input: string) => `"${input}"`).join(", ")}],`
      : "") +
    (props.outputs
      ? `\n${indent2}  outputs: [${props.outputs.map((output: string) => `"${output}"`).join(", ")}],`
      : "") +
    `\n${indent2}},` +
    `\n${indent2}appContext` +
    `\n${indent}})\n`
  );
};

