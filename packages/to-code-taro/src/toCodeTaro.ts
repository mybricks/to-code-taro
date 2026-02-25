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
import { processPageBase64Image, replaceBase64InText, type ImageFileInfo } from "./utils/config/content";

// 工具函数
import { buildFrameMap } from "./utils/context/buildFrameMap";
import {
  buildSceneMap,
  buildEventsMap,
  buildConnectorMap,
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
  /** 当前页面/弹窗内用到的 JS 计算组件（用于生成 index.jsModules.ts） */
  jsModules?: import("./utils/context/collectJSModules").JSModule[];
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
    | "rootConfig"
    | "connector-api"
    | "extension-event"
    | "jsModulesRuntime"
    | "tabBarConfig"
    | "customTabBar";
  meta?: ReturnType<typeof toCode>["scenes"][0]["scene"];
  name: string;
}

/** 统一的生成结果结构 */
export interface GenerationResult {
  files: GeneratedFile[];
  assets?: {
    tabBarImages?: any[];
    pageImages?: any[];
  };
}

/**
 * Taro 代码生成主函数
 */
const toCodeTaro = (
  tojson: ToJSON,
  config: ToTaroCodeConfig,
): GenerationResult => {
  // 将 modules 中的场景展开到 scenes 中，使 toCode 能识别并处理模块
  if ((tojson as any).modules) {
    Object.values((tojson as any).modules as Record<string, any>).forEach((mod) => {
      if (mod.json) {
        tojson.scenes.push(mod.json);
      }
    });
    // 预处理：从 modules.json 重建 frames 中模块的事件数据
    rebuildModuleFrames(tojson);
  }
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
  // 将模块场景也加入 sceneMap，使 getSceneById 能查到模块
  if (tojson.modules) {
    Object.values(tojson.modules as Record<string, any>).forEach((mod) => {
      if (mod.json?.id) {
        sceneMap[mod.json.id] = mod.json;
      }
    });
  }
  const eventsMap = buildEventsMap(tojson.frames);
  const getSceneById = createGetSceneById(sceneMap);
  const getExtensionEventById = createGetExtensionEventById(eventsMap);
  const connectorMap = buildConnectorMap((tojson as any).plugins);

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

  // ========== 第四步：处理全局变量、FX、其他全局配置 ==========
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
  const pageBase64Images: ImageFileInfo[] = [];
  const pageImageIndex = new Map<string, number>();

  const nextImageIndex = (pageId: string, nameHint: string) => {
    const key = `${pageId}::${nameHint}`;
    const next = (pageImageIndex.get(key) || 0) + 1;
    pageImageIndex.set(key, next);
    return next;
  };

  const replaceBase64InObject = (
    value: any,
    pageId: string,
    nameHint: string,
  ): any => {
    if (typeof value === "string") {
      return replaceBase64InText(
        value,
        pageId,
        pageBase64Images,
        nameHint,
        () => nextImageIndex(pageId, nameHint),
      );
    }
    if (Array.isArray(value)) {
      return value.map((item) => replaceBase64InObject(item, pageId, nameHint));
    }
    if (value && typeof value === "object") {
      Object.keys(value).forEach((key) => {
        value[key] = replaceBase64InObject(value[key], pageId, nameHint);
      });
      return value;
    }
    return value;
  };
  
  // 提前识别所有弹窗场景
  const popupIds = new Set<string>();
  tojson.scenes.forEach((s: any) => {
    if (s.type === 'popup' || s.deps?.some((dep: any) => dep.namespace === 'mybricks.taro.popup')) {
      popupIds.add(s.id);
    }
  });

  // ========== 第六步：预处理 base64 图片（替换 data 中的 base64 为本地资源路径） ==========
  scenes.forEach(({ scene }: any) => {
    const pageId = scene?.id;
    if (!pageId) return;
    Object.entries(scene.coms || {}).forEach(([comId, com]: any) => {
      if (com?.model?.data) {
        com.model.data = replaceBase64InObject(com.model.data, pageId, `${comId}`);
      }
      if (com?.props?.data) {
        com.props.data = replaceBase64InObject(com.props.data, pageId, `${comId}`);
      }
      if (com?.props?.style) {
        com.props.style = replaceBase64InObject(com.props.style, pageId, `${comId}`);
      }
    });
  });

  // ========== 第七步：处理场景 ==========
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

  // ========== 第八步：处理模块 ==========
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

  // ========== 第九步：构建最终结果 ==========
  // 为页面产物中的图片路径补充 import，并用变量名替换字符串
  files.forEach((file) => {
    if (!file.content || !file.importManager || !file.meta?.id) return;
    const pageId = file.meta.id;
    const regex = new RegExp(`@/assets/${pageId}/([a-zA-Z0-9_\\-\\.]+\\.(?:png|jpg|jpeg|gif|webp|svg))`, "g");
    const seen = new Map<string, string>();
    let updated = file.content;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(file.content)) !== null) {
      const fileName = match[1];
      if (!seen.has(fileName)) {
        const base = fileName.replace(/\.[^.]+$/, "");
        let varName = `${base}Img`.replace(/[^a-zA-Z0-9_]/g, "_");
        if (/^[0-9]/.test(varName)) {
          varName = `img_${varName}`;
        }
        seen.set(fileName, varName);
        file.importManager.addImport({
          packageName: `@/assets/${pageId}/${fileName}`,
          dependencyNames: [varName],
          importType: "default",
        });
      }
    }
    seen.forEach((varName, fileName) => {
      const literal = `@/assets/${pageId}/${fileName}`;
      // 替换字符串字面量为变量（去掉引号）
      updated = updated
        .split(`"${literal}"`).join(varName)
        .split(`'${literal}'`).join(varName)
        .split(literal).join(varName);
    });
    file.content = updated;
  });

  const finalResultData = buildFinalResults({
    abstractEventTypeDefMap,
    jsModulesMap: jsModulesCollector.getMap(),
    connectorMap,
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
      pageImages: pageBase64Images,
    },
  };
};

/**
 * 预处理：从 modules.json 重建 frames 中模块的事件数据
 *
 * 背景：tojson.frames 中模块的 frame 可能是空壳（coms: {}, diagrams[0].conAry: []），
 * 而完整的组件事件数据在 modules[moduleId].json 中（coms/cons/outputEvents）。
 * toCode 的 handleFrame 需要 frame.coms 包含组件事件子 frames 才能生成事件代码。
 */
const rebuildModuleFrames = (tojson: ToJSON) => {
  const modules = (tojson as any).modules as Record<string, any> | undefined;
  if (!modules) return;

  Object.values(modules).forEach((mod) => {
    const moduleJson = mod.json;
    if (!moduleJson) return;

    const frame = tojson.frames.find((f: any) => f.id === moduleJson.id);
    if (!frame || Object.keys(frame.coms).length > 0) return;

    const coms = moduleJson.coms || {};
    const cons = moduleJson.cons || {};

    Object.values(coms).forEach((com: any) => {
      const outputEvents = com.model?.outputEvents;
      if (!outputEvents || Object.keys(outputEvents).length === 0) return;

      const comFrames: any[] = [];

      Object.entries(outputEvents).forEach(([pinId, events]: [string, any]) => {
        const activeEvent = Array.isArray(events)
          ? events.find((e: any) => e.active)
          : null;
        if (!activeEvent?.options?.id) return;

        const diagramId = activeEvent.options.id;
        const consKey = `${com.id}-${pinId}`;
        const connections: any[] = cons[consKey] || [];

        const conAry = connections.map((con: any) => ({
          id: con.id,
          from: {
            id: pinId,
            title: activeEvent.options.title || pinId,
            parent: { id: com.id, type: "com" },
          },
          to: {
            id: con.pinId,
            title: con.pinId,
            parent: { id: con.comId, type: "com" },
          },
          startPinParentKey: con.startPinParentKey || con.frameKey,
          finishPinParentKey: con.finishPinParentKey || con.targetFrameKey,
        }));

        if (conAry.length === 0) return;

        comFrames.push({
          id: `${com.id}_${pinId}_frame`,
          title: activeEvent.options.title || `${com.title} > ${pinId}`,
          type: "com",
          coms: {},
          autoRunComs: {},
          inputs: [],
          outputs: [],
          frames: [],
          diagrams: [{
            id: diagramId,
            title: activeEvent.options.title || `${com.title} > ${pinId}`,
            starter: {
              type: "com",
              comId: com.id,
              pinId,
            },
            conAry,
            runtimeBefore: [],
            runtimeAfter: [],
          }],
        });
      });

      if (comFrames.length > 0) {
        (frame.coms as any)[com.id] = { id: com.id, frames: comFrames };
      }
    });
  });
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
  /** 获取组件/场景调用的代码模板（解耦核心） */
  getCallTemplate?: (params: {
    com: any;
    pinId: string;
    args: string;
  }) => {
    code: string;
    import?: {
      packageName: string;
      dependencyNames: string[];
      importType: "default" | "named";
    };
  } | undefined;
  /** 根据 ID 获取 DSL 中的稳定组件名（参考鸿蒙实现） */
  getDslComNameById?: (id: string) => string | undefined;
}

export default toCodeTaro;
