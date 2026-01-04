/**
 * 处理场景（Scene）
 * 参考鸿蒙实现，将场景处理逻辑独立出来
 */

import { ImportManager } from "../utils";
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
type Scene = ToCodeResult["scenes"][0];

interface ProcessSceneParams {
  scene: Scene;
  config: ToTaroCodeConfig;
  globalVarTypeDef: Record<string, any>;
  defaultFxsMap: Record<string, Provider>;
  abstractEventTypeDefMap: Record<string, any>;
  jsModulesMap: JSModulesMap;
  getExtensionEventById: (id: string) => any;
  getSceneById: (id: string) => any;
  getFrameById?: (id: string) => any;
  pageConfigHandler: any;
  addResult: (result: GeneratedFile) => void;
}

/**
 * 处理单个场景
 */
export const processScene = (params: ProcessSceneParams): void => {
  const {
    scene: { scene, ui, event },
    config,
    globalVarTypeDef,
    defaultFxsMap,
    abstractEventTypeDefMap,
    jsModulesMap,
    getExtensionEventById,
    getSceneById,
    getFrameById,
    pageConfigHandler,
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

  // 处理页面配置
  const pageConfigContent = pageConfigHandler.handle(scene);

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
      params.addResult({
        ...value,
        type: scene.type ? scene.type : "normal",
        meta: scene,
        pageConfigContent,
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
  });
};

/**
 * 处理所有场景
 */
export const processScenes = (
  scenes: Scene[],
  params: Omit<ProcessSceneParams, "scene">,
): void => {
  scenes.forEach((scene) => {
    processScene({
      ...params,
      scene,
    });
  });
};

