/**
 * 收集 JS 计算组件模块
 */

export interface JSModule {
  id: string;
  title: string;
  transformCode: string;
  inputs: string[];
  outputs: string[];
  data: any;
}

export type JSModulesMap = Map<string, JSModule>;

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
 * 从组件信息中提取 JS 模块数据
 */
export const extractJSModuleFromCom = (comId: string, comInfo: any): JSModule | null => {
  const { def, model } = comInfo;

  if (!isJsCalculationComponent(def?.namespace)) {
    return null;
  }

  // 优先使用原始代码（code），而不是转译后的代码（transformCode），避免包含 Babel 辅助函数
  const transformCode =
    model?.data?.fns?.code ||
    model?.data?.fns?.transformCode ||
    model?.data?.fns;

  if (!transformCode) {
    return null;
  }

  return {
    id: comId,
    title: comInfo.title || "JS计算",
    transformCode: typeof transformCode === "string" ? transformCode : "",
    inputs: model?.inputs || [],
    outputs: model?.outputs || [],
    data: model?.data || {},
  };
};

/**
 * 从场景中收集 JS 模块
 */
export const collectJSModulesFromScene = (
  scene: any,
  jsModulesMap: JSModulesMap,
): void => {
  Object.entries(scene.coms || {}).forEach(([comId, comInfo]: [string, any]) => {
    const jsModule = extractJSModuleFromCom(comId, comInfo);
    if (jsModule && !jsModulesMap.has(comId)) {
      jsModulesMap.set(comId, jsModule);
    }
  });
};

/**
 * 创建 JS 模块收集器
 */
export const createJSModulesCollector = () => {
  const jsModulesMap: JSModulesMap = new Map();

  return {
    /**
     * 从场景中收集 JS 模块
     */
    collectFromScene: (scene: any) => {
      collectJSModulesFromScene(scene, jsModulesMap);
    },
    /**
     * 添加 JS 模块
     */
    add: (module: JSModule) => {
      if (!jsModulesMap.has(module.id)) {
        jsModulesMap.set(module.id, module);
      }
    },
    /**
     * 获取所有 JS 模块
     */
    getAll: (): JSModule[] => {
      return Array.from(jsModulesMap.values());
    },
    /**
     * 获取 JS 模块映射表
     */
    getMap: (): JSModulesMap => {
      return jsModulesMap;
    },
  };
};

