/**
 * 构建全局数据
 * 包括全局变量类型定义、FX Map 等
 */

import type { Provider } from "./createProvider";

/**
 * 构建全局变量类型定义
 */
export const buildGlobalVarTypeDef = (comsReg: Record<string, any>) => {
  const globalVarTypeDef: Record<string, any> = {};

  Object.entries(comsReg).forEach(([, com]: [string, any]) => {
    if (com.def.namespace !== "mybricks.core-comlib.var") {
      // 非变量，不需要初始化
      return;
    }

    globalVarTypeDef[com.title] = com;
  });

  return globalVarTypeDef;
};

/**
 * 构建默认 FX Map
 */
export const buildDefaultFxsMap = (fxFrames: any[]): Record<string, Provider> => {
  const defaultFxsMap: Record<string, Provider> = {};

  (fxFrames || [])
    .filter((fxFrame: any) => {
      return fxFrame.type === "fx";
    })
    .forEach((fxFrame: any) => {
      defaultFxsMap[fxFrame.id] = {
        name: "global",
        class: "global",
        controllers: new Set(),
        useParams: false,
        useEvents: false,
        coms: new Set(),
        useController: false,
        useData: false,
      };
    });

  return defaultFxsMap;
};

