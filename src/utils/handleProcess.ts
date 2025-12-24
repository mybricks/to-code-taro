/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImportManager, indentation, genObjectCode } from "./index";
import type { BaseConfig } from "../toCodeTaro";

export interface HandleProcessConfig extends BaseConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
  getParams: () => Record<string, string>;
  addConsumer: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
}

export const handleProcess = (
  event: Exclude<ReturnType<BaseConfig["getEventByDiagramId"]>, undefined>,
  config: HandleProcessConfig,
) => {
  let code = "";
  const { process } = event;

  const indent = indentation(config.codeStyle!.indent * config.depth);
  const indent2 = indentation(config.codeStyle!.indent * (config.depth + 1));

  // 处理节点声明
  process.nodesDeclaration.forEach(({ meta, props }: any) => {
    if (meta.def.namespace.startsWith("mybricks.taro.module")) {
      return;
    }

    // 检查是否是 JS 计算组件（以下划线开头，如 _muilt-inputJs）
    const { importInfo, name, callName } = config.getComponentMeta(meta);
    if (name.startsWith('_')) {
      // JS 计算组件：不引入组件，在调用时直接执行 transformCode
      return;
    }
    const componentName = name;

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
        config.addParentDependencyImport({
          packageName: config.getComponentPackageName(),
          dependencyNames: ["page"],
          importType: "named",
        });

        const _sceneId = props.meta.model.data._sceneId;
        const operateName =
          props.meta.model.data.openType === "redirect" ? "replace" : "open";

        code +=
          `${indent}/** 打开 ${props.meta.title} */` +
          `\n${indent}${nextCode}page.${operateName}("${config.getPageId?.(_sceneId) || _sceneId}", ${nextValue})`;
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
      const currentProvider = getCurrentProvider({ isSameScope, props }, config);
      currentProvider.controllers.add(props.meta.id);
      const componentController =
        config.getComponentController?.({
          com: props.meta,
          scene: config.getCurrentScene(),
        }) || `controller_${props.meta.id}`;

      code +=
        `${indent}/** 调用 ${props.meta.title} 的 ${props.title} */` +
        `\n${indent}${nextCode}this.${currentProvider.name}.${componentController}.${props.id}(${nextValue})`;
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
  return `${name}_${props.meta.id}`;
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
    if (param.connectId) {
      return `${componentNameWithId}_${param.connectId}.${param.id}`;
    }
    return `${componentNameWithId}_result.${param.id}`;
  });

  return nextValue.join(", ");
};

const getNextValueWithParam = (param: any, config: HandleProcessConfig, event: any) => {
  if (param.type === "params") {
    const params = config.getParams();
    return params[param.id];
  }
  const componentNameWithId = getComponentNameWithId(param, config, event);
  if (param.connectId) {
    return `${componentNameWithId}_${param.connectId}.${param.id}`;
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

  const provider = providerMap[providerName];

  if (!isSameScope) {
    config.addConsumer(provider);
  }

  return provider;
};

