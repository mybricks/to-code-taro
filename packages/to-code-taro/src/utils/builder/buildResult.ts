/**
 * 构建最终结果
 * 包括抽象事件类型定义、JS 模块、TabBar 配置等
 */

import { ImportManager } from "../common/ImportManager";
import abstractEventTypeDef from "../../abstractEventTypeDef";
import { genJSModulesRuntime } from "../logic/genJSModules";
import type { ToTaroCodeConfig, GeneratedFile } from "../../toCodeTaro";
import type { JSModulesMap } from "../context/collectJSModules";

interface BuildResultParams {
  abstractEventTypeDefMap: Record<string, any>;
  jsModulesMap: JSModulesMap;
  connectorMap: any;
  globalTabBarConfig: string | null;
  tabBarImageFiles: any[];
  popupIds: string[];
  config: ToTaroCodeConfig;
  customTabBarFileContent: string | null;
}

/**
 * 构建最终结果
 */
export const buildFinalResults = (
  params: BuildResultParams,
): {
  files: GeneratedFile[];
  tabBarImageFiles: any[];
} => {
  const {
    abstractEventTypeDefMap,
    jsModulesMap,
    connectorMap,
    globalTabBarConfig,
    tabBarImageFiles,
    popupIds,
    config,
    customTabBarFileContent,
  } = params;

  const files: GeneratedFile[] = [];

  // 添加抽象事件类型定义
  files.push({
    type: "abstractEventTypeDef",
    content: abstractEventTypeDef(abstractEventTypeDefMap, config),
    importManager: new ImportManager(config),
    name: "abstractEventTypeDef",
  });

  // 生成 JSModules 运行时工具（公共）
  if (jsModulesMap.size > 0) {
    files.push({
      type: "jsModulesRuntime",
      content: genJSModulesRuntime(),
      importManager: new ImportManager(config),
      name: "jsModulesRuntime",
    });
  }

  // 生成 API 定义
  if (connectorMap) {
    files.push({
      type: "connector-api",
      content: generateApi(connectorMap),
      importManager: new ImportManager(config),
      name: "api",
    });
  }

  // 生成弹窗汇总文件 (popup.ts)
  if (popupIds.length > 0) {
    let registryContent = "";
    popupIds.forEach((id) => {
      registryContent += `import Scene_${id} from '../popupComponents/${id}/index';\n`;
    });

    registryContent += `\nexport const POPUP_MAP: Record<string, any> = {\n`;
    popupIds.forEach((id) => {
      registryContent += `  '${id}': Scene_${id},\n`;
    });
    registryContent += `};\n\n`;
    registryContent += `export const POPUP_IDS = ${JSON.stringify(popupIds)};\n`;

    files.push({
      type: "popup",
      content: registryContent,
      importManager: new ImportManager(config),
      name: "popup",
    });
  }

  // 添加 TabBar 配置项（如果存在）
  if (globalTabBarConfig) {
    files.push({
      type: "tabBarConfig",
      content: globalTabBarConfig,
      importManager: new ImportManager(config),
      name: "tabBarConfig",
    });

    files.push({
      type: "customTabBar",
      content: customTabBarFileContent,
      importManager: new ImportManager(config),
      name: "customTabBar",
    });
  }

  return {
    files,
    tabBarImageFiles,
  };
};

/**
 * 生成 API 定义代码
 */
function generateApi(connectorMap: any) {
  const { connectors, config } = connectorMap;

  let code = `/* eslint-disable @typescript-eslint/no-explicit-any */\n\n`;
  code += `export const api: Record<string, any> = {\n`;

  connectors.forEach((conn: any) => {
    code += `  '${conn.id}': {\n`;
    code += `    type: '${conn.type}',\n`;
    code += `    input: ${conn.input || 'function _RT_(params) { return params; }'},\n`;
    code += `    output: ${conn.output || 'function _RT_(result) { return result; }'},\n`;
    code += `    method: '${conn.method}',\n`;
    code += `    path: '${conn.path}',\n`;
    code += `    globalMock: ${conn.globalMock || false},\n`;
    code += `    markList: ${JSON.stringify(conn.markList || [])}\n`;
    code += `  },\n`;
  });

  code += `};\n\n`;

  code += `export const baseConfig = {\n`;
  code += `  globalParamsFn: ${config.paramsFn || 'function _RT_(params) { return params; }'},\n`;
  code += `  globalResultFn: ${config.resultFn || 'function _RT_(response) { return response; }'},\n`;
  code += `  globalErrorResultFn: ${config.errorResultFn || 'function _RT_(error) { throw error; }'},\n`;
  code += `  globalMock: ${config.globalMock || false}\n`;
  code += `};\n`;

  return code;
}

