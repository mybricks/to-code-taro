/**
 * 处理场景（Scene）
 * 参考鸿蒙实现，将场景处理逻辑独立出来
 */

import { ImportManager } from "../utils";
import handleSlot from "../handleSlot";
import { RenderManager } from "../utils/templates/renderManager";
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

  // 参考鸿蒙逻辑：如果场景中包含 popup 组件，则标记场景类型为 popup
  const originalScene = getSceneById(scene.id);
  const isPopup = originalScene?.type === 'popup' || originalScene?.deps?.some((dep: any) => dep.namespace === 'mybricks.taro.popup');

  // 处理页面配置
  const pageConfigContent = pageConfigHandler.handle(scene, isPopup);

  // 创建事件查询函数
  const eventQueries = createEventQueries(event);

  // 创建 RenderManager
  const renderManager = new RenderManager();

  // 鸿蒙规范：建立全局组件 ID -> DSL 名称映射表，确保在任何层级都能获取到稳定的名称
  const dslComIdToNameMap: Record<string, string> = {};
  if (originalScene?.slot?.comAry) {
    const scanComs = (coms: any) => {
      if (!Array.isArray(coms)) return;
      coms.forEach(com => {
        if (com.name) dslComIdToNameMap[com.id] = com.name;
        if (com.slots) {
          const slotList = Array.isArray(com.slots) ? com.slots : Object.values(com.slots);
          slotList.forEach((slot: any) => {
            if (slot.comAry) scanComs(slot.comAry);
            if (slot.children) scanComs(slot.children);
          });
        }
        // 特殊处理表单容器
        if (com.def?.namespace === 'mybricks.taro.formContainer' && com.model?.data?.items) {
          com.model.data.items.forEach((item: any) => {
            if (item.comName) dslComIdToNameMap[item.id] = item.comName;
          });
        }
      });
    };
    scanComs(originalScene.slot.comAry);
  }

  // 处理 Slot
  handleSlot(ui, {
    ...config,
    renderManager, // 显式传入 renderManager
    isPopup, // 标记当前场景是否为弹窗
    getDslComNameById: (id: string) => dslComIdToNameMap[id],
    getCurrentScene: () => {
      const originalScene = getSceneById(scene.id);
      return { ...scene, ...originalScene, event };
    },
    add: (value) => {
      params.addResult({
        ...value,
        type: isPopup ? "popup" : (originalScene?.type ? originalScene.type : "normal"),
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

