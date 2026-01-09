/**
 * Taro 代码生成入口文件
 * 参考鸿蒙实现，采用低耦合、高内聚的设计
 */

import toCode from "@mybricks/to-code-react/dist/cjs/toCode";
import type { ToJSON } from "@mybricks/to-code-react/dist/cjs/toCode/types";
import { ImportManager } from "./utils/common/ImportManager";
import handleGlobal from "./handleGlobal";
import handleExtension from "./handleExtension";
import { HandlePageConfig } from "./utils/config/handlePageConfig";

// 工具函数
import { buildFrameMap } from "./utils/context/buildFrameMap";
import {
  buildSceneMap,
  buildEventsMap,
  createGetSceneById,
  createGetExtensionEventById,
  createGetFrameById,
} from "./utils/context/buildContext";
import { createJSModulesCollector } from "./utils/context/collectJSModules";
import { buildGlobalVarTypeDef, buildDefaultFxsMap } from "./utils/context/buildGlobalData";
import { buildFinalResults } from "./utils/builder/buildResult";

// 处理器
import { processScenes } from "./processors/processScene";
import { processModules } from "./processors/processModule";

export interface ToTaroCodeConfig {
  getComponentMeta: (
    com: Extract<UI["children"][0], { type: "com" }>["meta"],
    config?: any,
  ) => {
    importInfo: {
      /** 导入名「a as b」*/
      name: string;
      from: string;
      type: "default" | "named";
    };
    /** 组件名 */
    name: string;
    /**
     * 调用名
     * 例如js、ai-js这类特殊组件，调用方式由外部实现
     */
    callName?: string;
  };
  getComponentPackageName: (props?: any) => string;
  getUtilsPackageName: (props?: any) => string;
  getPageId?: (id: string) => string;
  getBus?: (namespace: string) => { title: string; name: string };
  getApi?: (namespace: string) => { title: string };
  getFileName?: (id: string) => string | undefined;
  getModuleApi: (type: "event") => {
    dependencyImport: {
      packageName: string;
      dependencyNames: string[];
      importType: "default" | "named";
    };
    componentName: string;
  };
  /**
   * 写入更多详细信息
   * 当运行时打印IO日志时，必须开启
   */
  verbose?: boolean;
  getComponentName?: any;
  getComponentController?: any;
  getProviderName?: any;
  getEventNodeName?: any;

  /** 代码风格 */
  codeStyle?: {
    indent: number;
  };
}

/** 单个生成文件的信息 */
export interface GeneratedFile {
  content: string;
  cssContent?: string;
  pageConfigContent?: string; // 页面配置内容（definePageConfig）
  importManager: ImportManager;
  type:
    | "normal"
    | "popup"
    | "module"
    | "global"
    | "extension-config"
    | "extension-api"
    | "extension-bus"
    | "abstractEventTypeDef"
    | "fx"
    | "api"
    | "extension-event"
    | "jsModules"
    | "commonIndex"
    | "tabBarConfig"
    | "customTabBar";
  meta?: ReturnType<typeof toCode>["scenes"][0]["scene"];
  name: string;
  tabBarConfig?: string; // TabBar 配置内容（用于 app.config.ts）
}

/** 统一的生成结果结构 */
export interface GenerationResult {
  files: GeneratedFile[];
  assets?: {
    tabBarImages?: any[];
  };
}

/**
 * Taro 代码生成主函数
 */
const toCodeTaro = (
  tojson: ToJSON,
  config: ToTaroCodeConfig,
): GenerationResult => {
  return getCode({ tojson, toCodejson: toCode(tojson) }, config);
};

interface GetCodeParams {
  tojson: ToJSON;
  toCodejson: ReturnType<typeof toCode>;
}

/**
 * 核心代码生成逻辑
 * 参考鸿蒙实现，采用模块化设计
 */
const getCode = (
  params: GetCodeParams,
  config: ToTaroCodeConfig,
): GenerationResult => {
  // 初始化配置
  transformConfig(config);

  const files: GeneratedFile[] = [];
  const { tojson, toCodejson } = params;
  const { scenes, extensionEvents, globalFxs, globalVars, modules } =
    toCodejson;

  // ========== 第一步：构建上下文数据 ==========
  // 构建 frameMap（参考鸿蒙实现）
  const frameMap = buildFrameMap(tojson);
  const getFrameById = createGetFrameById(frameMap);

  // 构建场景和事件映射
  const sceneMap = buildSceneMap(tojson.scenes);
  const eventsMap = buildEventsMap(tojson.frames);
  const getSceneById = createGetSceneById(sceneMap);
  const getExtensionEventById = createGetExtensionEventById(eventsMap);

  // ========== 第二步：处理扩展事件 ==========
  files.push(
    ...handleExtension(
      {
        extensionEvents,
        tojson,
      },
      {
        ...config,
        // @ts-ignore
        getExtensionEventById,
        getSceneById,
      },
    ),
  );

  // ========== 第三步：构建全局数据 ==========
  const globalVarTypeDef = buildGlobalVarTypeDef(tojson.global.comsReg);
  const defaultFxsMap = buildDefaultFxsMap(tojson.global.fxFrames || []);

  // ========== 第四步：处理全局变量和 FX ==========
  files.push(
    ...handleGlobal(
      {
        tojson,
        globalFxs,
        globalVars,
      },
      {
        ...config,
        // @ts-ignore
        getExtensionEventById,
        getSceneById,
      },
    ),
  );

  // ========== 第五步：初始化共享资源 ==========
  const abstractEventTypeDefMap: Record<string, any> = {};
  const jsModulesCollector = createJSModulesCollector();
  const pageConfigHandler = new HandlePageConfig();
  
  // 提前识别所有弹窗场景
  const popupIds = new Set<string>();
  tojson.scenes.forEach((s: any) => {
    if (s.type === 'popup' || s.deps?.some((dep: any) => dep.namespace === 'mybricks.taro.popup')) {
      popupIds.add(s.id);
    }
  });

  // ========== 第六步：处理场景 ==========
  processScenes(scenes, {
    config: {
      ...config,
      // @ts-ignore
      hasPopups: popupIds.size > 0
    },
    globalVarTypeDef,
    defaultFxsMap,
    abstractEventTypeDefMap,
    jsModulesMap: jsModulesCollector.getMap(),
    getExtensionEventById,
    getSceneById,
    getFrameById,
    pageConfigHandler,
    addResult: (item) => {
      files.push(item);
    },
  });

  // ========== 第七步：处理模块 ==========
  processModules(modules, {
    config,
    globalVarTypeDef,
    defaultFxsMap,
    abstractEventTypeDefMap,
    jsModulesMap: jsModulesCollector.getMap(),
    getExtensionEventById,
    getSceneById,
    getFrameById,
    addResult: (item) => {
      files.push(item);
    },
  });

  // ========== 第八步：构建最终结果 ==========
  const finalResultData = buildFinalResults({
    abstractEventTypeDefMap,
    jsModulesMap: jsModulesCollector.getMap(),
    globalTabBarConfig: pageConfigHandler.getTabBarConfig(),
    tabBarImageFiles: pageConfigHandler.getTabBarImageFiles(),
    customTabBarFileContent: pageConfigHandler.getCustomTabBarFileContent(),
    popupIds: Array.from(popupIds),
    config,
  });

  files.push(...finalResultData.files);

  return {
    files,
    assets: {
      tabBarImages: finalResultData.tabBarImageFiles,
    },
  };
};

/**
 * 初始化配置
 */
const transformConfig = (config: ToTaroCodeConfig) => {
  if (!config.codeStyle) {
    config.codeStyle = {
      indent: 2,
    };
  }
};

type ToCodeResult = ReturnType<typeof toCode>;
export type UI = ToCodeResult["scenes"][0]["ui"];

interface Provider {
  name: string;
  class: string;
  controllers: Set<string>;
  /** 跨作用域调用当前输入项（当前仅作用于插槽） */
  useParams: boolean;
  /** 调用事件（当前仅区块的输出项） */
  useEvents: boolean;
  coms: Set<string>;
  /** 使用区块的输入项 */
  useController: boolean;
  /** 使用区块的配置项 */
  useData: boolean;
}

export interface BaseConfig extends ToTaroCodeConfig {
  /** 获取当前场景信息 */
  getCurrentScene: () => ReturnType<typeof toCode>["scenes"][0]["scene"];
  /** 添加最终的文件列表 */
  add: (value: {
    content: string;
    cssContent?: string;
    importManager: ImportManager;
    name: string;
  }) => void;
  /** 获取事件 */
  getEventByDiagramId: (
    diagramId: string,
  ) => ReturnType<typeof toCode>["scenes"][0]["event"][0];
  /** 获取事件 - 变量 */
  getVarEvents: (params?: {
    comId?: string;
    slotId?: string;
  }) => ReturnType<typeof toCode>["scenes"][0]["event"];
  /** 获取事件 - fx */
  getFxEvents: (params?: {
    comId?: string;
    slotId?: string;
  }) => ReturnType<typeof toCode>["scenes"][0]["event"];
  /** 获取事件 - 生命周期 */
  getEffectEvent: (params?: {
    comId: string;
    slotId: string;
  }) => ReturnType<typeof toCode>["scenes"][0]["event"][0];
  getCurrentProvider: () => Provider;
  getRootProvider: () => Provider;
  getProviderMap: () => Record<
    string,
    ReturnType<BaseConfig["getCurrentProvider"]>
  >;
  getExtensionEventById: (
    id: string,
  ) => ReturnType<typeof toCode>["scenes"][0]["event"][0];
  getSceneById: (id: string) => ReturnType<typeof toCode>["scenes"][0]["scene"];
  /** 根据 pinId 获取场景/区块的输入项事件 */
  getFrameInputEvent: (pinId: string, frameId?: string) => ReturnType<typeof toCode>["scenes"][0]["event"][0];
  /** 根据 frameId 获取 frame 信息（参考鸿蒙实现） */
  getFrameById?: (id: string) => {
    frame: any;
    meta: any;
  } | undefined;
  /** 层级，用于格式化代码 */
  depth: number;
  getTypeDef: () => {
    vars: Record<string, any>;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
  };
  getFxsMap: () => Record<string, Provider>;
  setAbstractEventTypeDefMap: (params: {
    comId: string;
    eventId: string;
    typeDef: any;
    schema: any;
  }) => void;
  /** 根据 ID 获取 DSL 中的稳定组件名（参考鸿蒙实现） */
  getDslComNameById?: (id: string) => string | undefined;
}

export default toCodeTaro;
