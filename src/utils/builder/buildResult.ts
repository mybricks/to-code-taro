/**
 * 构建最终结果
 * 包括抽象事件类型定义、JS 模块、TabBar 配置等
 */

import { ImportManager } from "../common/ImportManager";
import abstractEventTypeDef from "../../abstractEventTypeDef";
import { genJSModules } from "../logic/genJSModules";
import type { ToTaroCodeConfig, GeneratedFile } from "../../toCodeTaro";
import type { JSModulesMap } from "../context/collectJSModules";

interface BuildResultParams {
  abstractEventTypeDefMap: Record<string, any>;
  jsModulesMap: JSModulesMap;
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

  // 生成 JSModules.ts 文件
  files.push({
    type: "jsModules",
    content: genJSModules(Array.from(jsModulesMap.values())),
    importManager: new ImportManager(config),
    name: "JSModules",
  });

  // 生成 common/index.ts 文件（初始化并导出 jsModules）
  if (jsModulesMap.size > 0) {
    const commonIndexContent = `import jsModulesGenerator from "./jsModules";
import { createJSHandle } from "../core/mybricks/index";

const jsModules: Record<string, (props: any, appContext: any) => any> = jsModulesGenerator({ createJSHandle });

export { jsModules };
`;

    files.push({
      type: "commonIndex",
      content: commonIndexContent,
      importManager: new ImportManager(config),
      name: "commonIndex",
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
      tabBarConfig: globalTabBarConfig,
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

