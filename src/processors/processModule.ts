/**
 * 处理模块（Module）
 * 参考鸿蒙实现，将模块处理逻辑独立出来
 */

import handleSlot from "../handleSlot";
import type { ToTaroCodeConfig, GeneratedFile } from "../toCodeTaro";
import toCode from "@mybricks/to-code-react/dist/cjs/toCode";
import {
  createProvider,
  createProviderMap,
  type Provider,
} from "../utils/context/createProvider";
import { createEventQueries } from "../utils/context/createEventQueries";
import { collectJSModulesFromScene } from "../utils/context/collectJSModules";
import type { JSModulesMap } from "../utils/context/collectJSModules";

type ToCodeResult = ReturnType<typeof toCode>;
type Module = ToCodeResult["modules"][0];

interface ProcessModuleParams {
  module: Module;
  config: ToTaroCodeConfig;
  globalVarTypeDef: Record<string, any>;
  defaultFxsMap: Record<string, Provider>;
  abstractEventTypeDefMap: Record<string, any>;
  jsModulesMap: JSModulesMap;
  getExtensionEventById: (id: string) => any;
  getSceneById: (id: string) => any;
  getFrameById?: (id: string) => any;
  addResult: (result: GeneratedFile) => void;
}

/**
 * 处理单个模块
 */
export const processModule = (params: ProcessModuleParams): void => {
  const {
    module: { scene, ui, event },
    config,
    globalVarTypeDef,
    defaultFxsMap,
    abstractEventTypeDefMap,
    jsModulesMap,
    getExtensionEventById,
    getSceneById,
    getFrameById,
    addResult,
  } = params;

  // 收集 JS 计算组件
  collectJSModulesFromScene(scene, jsModulesMap);

  // 创建 Provider
  const fileName = config.getFileName?.(ui.meta.slotId);
  const currentProvider = createProvider(fileName, true);
  const providerMap = createProviderMap(currentProvider);

  // 创建类型定义
  const typeDef = {
    vars: Object.assign({}, globalVarTypeDef),
    inputs: {},
    outputs: {},
  };

  // 创建 FX Map
  const fxsMap = Object.assign({}, defaultFxsMap);

  // 创建事件查询函数
  const eventQueries = createEventQueries(event);

  // 处理 Slot
  handleSlot(ui, {
    ...config,
    getCurrentScene: () => {
      const originalScene = getSceneById(scene.id);
      return { ...scene, ...originalScene, event };
    },
    add: (value) => {
      addResult({
        ...value,
        type: scene.type,
        meta: scene,
      });
    },
    addJSModule: (module) => {
      if (!jsModulesMap.has(module.id)) {
        jsModulesMap.set(module.id, module);
      }
    },
    getEventByDiagramId: eventQueries.getEventByDiagramId,
    getFrameInputEvent: eventQueries.getFrameInputEvent,
    getVarEvents: eventQueries.getVarEvents,
    getFxEvents: eventQueries.getFxEvents,
    checkIsRoot: () => true,
    getEffectEvent: eventQueries.getEffectEvent,
    getCurrentProvider: () => currentProvider,
    getRootProvider: () => currentProvider,
    getProviderMap: () => providerMap,
    getExtensionEventById,
    getSceneById,
    getFrameById,
    depth: 0,
    getTypeDef: () => typeDef,
    getFxsMap: () => fxsMap,
    setAbstractEventTypeDefMap: (params) => {
      const { comId, eventId, typeDef, schema } = params;
      if (!abstractEventTypeDefMap[comId]) {
        abstractEventTypeDefMap[comId] = {
          typeDef,
          eventIdMap: {},
        };
      }
      abstractEventTypeDefMap[comId].eventIdMap[eventId] = schema;
    },
    getCallTemplate: (params) => {
      const { com, pinId, args } = params;
      // 优先通过 sceneId 查找，如果找不到再通过 id 查找
      const targetScene = getSceneById(com.sceneId || com.id);
      
      if (targetScene || com.isScene) {
        const sceneId = targetScene?.id || com.sceneId || com.id;
        const isTargetPopup = targetScene?.type === 'popup' || targetScene?.deps?.some((dep: any) => dep.namespace === 'mybricks.taro.popup');
        const routerName = isTargetPopup ? "popupRouter" : "pageRouter";

        // 动态判断 pinId 是否属于该场景的输入或输出
        const isInput = targetScene?.inputs?.some((pin: any) => pin.id === pinId);
        const isOutput = targetScene?.outputs?.some((pin: any) => pin.id === pinId);

        if (isInput || isOutput) {
          return {
            code: `${routerName}.${pinId}("${config.getPageId?.(sceneId) || sceneId}"${args ? `, ${args}` : ""})`,
            import: {
              packageName: config.getComponentPackageName(),
              dependencyNames: [routerName],
              importType: "named",
            }
          };
        }
      }
      return undefined;
    },
    getComponentController: ({ com }) => {
      return com.id;
    },
  });
};

/**
 * 处理所有模块
 */
export const processModules = (
  modules: Module[],
  params: Omit<ProcessModuleParams, "module">,
): void => {
  modules.forEach((module) => {
    processModule({
      ...params,
      module,
    });
  });
};

