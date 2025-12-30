
import toCode from "@mybricks/to-code-react/dist/esm/toCode";
import type { ToJSON } from "@mybricks/to-code-react/dist/esm/toCode/types";
import handleSlot from "./handleSlot";
import {
  ImportManager,
  firstCharToLowerCase,
  firstCharToUpperCase,
} from "./utils";
import handleGlobal from "./handleGlobal";
import handleExtension from "./handleExtension";
import abstractEventTypeDef from "./abstractEventTypeDef";
import { genJSModules } from "./utils/genJSModules";
import { HandlePageConfig } from "./utils/handlePageConfig";

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
  getUtilsPackageName: () => string;
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

/** 返回结果 */
export type Result = Array<{
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
    // 组件抽象事件类型定义
    | "abstractEventTypeDef"
    // TODO: 忽略，类型定义没写完整，到这一步的处理不会存在fx类型
    | "fx"
    // api归类，包含 event、api、config
        | "api"
        // 目前不会有，归类到api，不需要分文件
        | "extension-event"
        | "jsModules"
        | "commonIndex"
        | "tabBarConfig"; // TabBar 配置
  meta?: ReturnType<typeof toCode>["scenes"][0]["scene"];
  name: string;
  tabBarConfig?: string; // TabBar 配置内容（用于 app.config.ts）
}>;

const toCodeTaro = (tojson: ToJSON, config: ToTaroCodeConfig): Result => {
  console.log('tojson', tojson);
  return getCode({ tojson, toCodejson: toCode(tojson) }, config);
};

interface GetCodeParams {
  tojson: ToJSON;
  toCodejson: ReturnType<typeof toCode>;
}
const getCode = (params: GetCodeParams, config: ToTaroCodeConfig): Result => {
  transformConfig(config);

  const result: Result = [];
  const { tojson, toCodejson } = params;
  const { scenes, extensionEvents, globalFxs, globalVars, modules } =
    toCodejson;

  // 收集所有 JS 计算组件
  const jsModulesMap = new Map<string, {
    id: string;
    title: string;
    transformCode: string;
    inputs: string[];
    outputs: string[];
    data: any;
  }>();

  const eventsMap = tojson.frames.reduce((pre, cur) => {
    if (cur.type === "extension-event") {
      pre[cur.id] = cur;
    }
    return pre;
  }, {} as any);
  const sceneMap = tojson.scenes.reduce((pre, cur) => {
    pre[cur.id] = cur;
    return pre;
  }, {} as any);

  const getSceneById = (id: string) => {
    return sceneMap[id];
  };

  const getExtensionEventById = (id: string) => {
    return eventsMap[id];
  };

  result.push(
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

  const globalVarTypeDef: any = {};

  Object.entries(tojson.global.comsReg).forEach(([, com]: [string, any]) => {
    if (com.def.namespace !== "mybricks.core-comlib.var") {
      // 非变量，不需要初始化
      return;
    }

    globalVarTypeDef[com.title] = com;
  });

  /** 向下记录组件可调用的fx，id唯一，所以直接key-value即可 */
  const defaultFxsMap: Record<string, Provider> = {};
  (tojson.global.fxFrames || [])
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

  result.push(
    handleGlobal(
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

  const abstractEventTypeDefMap: any = {};

  // 创建页面配置处理器
  const pageConfigHandler = new HandlePageConfig();

  scenes.forEach(({ scene, ui, event }) => {
    Object.entries(scene.coms || {}).forEach(([comId, comInfo]: [string, any]) => {
      const { def, model } = comInfo;

      // 收集js计算
      const isJsCalculationComponent = 
        def?.namespace === "mybricks.taro._muilt-inputJs" ||
        def?.namespace === "mybricks.core-comlib.js-ai";
      if (isJsCalculationComponent) {
        // 优先使用原始代码（code），而不是转译后的代码（transformCode），避免包含 Babel 辅助函数
        const transformCode = model?.data?.fns?.code || model?.data?.fns?.transformCode || model?.data?.fns;
        if (transformCode && !jsModulesMap.has(comId)) {
          jsModulesMap.set(comId, {
            id: comId,
            title: comInfo.title || "JS计算",
            transformCode: typeof transformCode === 'string' ? transformCode : '',
            inputs: model?.inputs || [],
            outputs: model?.outputs || [],
            data: model?.data || {},
          });
        }
      }
    });

    const providerMap: ReturnType<BaseConfig["getProviderMap"]> = {};
    const fileName = config.getFileName?.(ui.meta.slotId);
    const providerName = fileName ? `${fileName}Provider` : "slot_Index";
    const currentProvider: ReturnType<BaseConfig["getCurrentProvider"]> = {
      name: firstCharToLowerCase(providerName),
      class: firstCharToUpperCase(providerName),
      controllers: new Set(),
      useParams: false,
      useEvents: false,
      coms: new Set(),
      useController: false,
      useData: false,
    };

    providerMap[currentProvider.name] = currentProvider;

    /** 类型定义 */
    const typeDef = {
      // 变量
      vars: Object.assign({}, globalVarTypeDef),
      // 输入
      inputs: {},
      // 输出
      outputs: {},
    };

    const fxsMap = Object.assign({}, defaultFxsMap);

    // 处理页面配置
    const pageConfigContent = pageConfigHandler.handle(scene);

    handleSlot(ui, {
      ...config,
      getCurrentScene: () => {
        return scene;
      },
      add: (value) => {
        result.push({
          ...value,
          type: scene.type ? scene.type : "normal",
          meta: scene,
          pageConfigContent, // 添加页面配置内容
        });
      },
      addJSModule: (module) => {
        if (!jsModulesMap.has(module.id)) {
          jsModulesMap.set(module.id, module);
        }
      },
      getEventByDiagramId: (diagramId) => {
        return event.find((event) => event.diagramId === diagramId)!;
      },
      getVarEvents: (params) => {
        if (!params) {
          return event.filter((event) => {
            return (
              (event.type === "var" && !event.meta.parentComId) ||
              (event.type === "listener" && !event.meta.proxy.parentComId)
            );
          });
        }
        return event.filter((event) => {
          return (
            (event.type === "var" &&
              params.comId === event.meta.parentComId &&
              params.slotId === event.meta.frameId) ||
            (event.type === "listener" &&
              params.comId === event.meta.proxy.parentComId &&
              params.slotId === event.meta.proxy.frameId)
          );
        });
      },
      getFxEvents: (params) => {
        if (!params) {
          return event.filter((event) => {
            return event.type === "fx" && !event.parentComId;
          });
        }
        return event.filter((event) => {
          return (
            event.type === "fx" &&
            params.comId === event.parentComId &&
            params.slotId === event.parentSlotId
          );
        });
      },
      checkIsRoot: () => true,
      getEffectEvent: (params) => {
        // 默认只有一个生命周期事件
        if (!params) {
          // 主场景
          return event.find((event) => {
            return !event.slotId; // 没有slotId，认为是主场景
          })!;
        } else {
          // 作用域插槽
          const { comId, slotId } = params;
          return event.find((event) => {
            return event.slotId === slotId && event.comId === comId;
          })!;
        }
      },
      getCurrentProvider: () => {
        return currentProvider;
      },
      getRootProvider: () => {
        return currentProvider;
      },
      getProviderMap: () => {
        return providerMap;
      },
      getExtensionEventById,
      getSceneById,
      depth: 0,
      getTypeDef: () => {
        return typeDef;
      },
      getFxsMap: () => {
        return fxsMap;
      },
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
  });

  modules.forEach(({ scene, ui, event }) => {
    // 遍历 scene.coms 收集所有 JS 计算组件（它们不在 slot.comAry 中）
    Object.entries(scene.coms || {}).forEach(([comId, comInfo]: [string, any]) => {
      const { def, model } = comInfo;
      const isJsCalculationComponent = 
        def?.namespace === "mybricks.taro._muilt-inputJs" ||
        def?.namespace === "mybricks.core-comlib.js-ai";
      
      if (isJsCalculationComponent) {
        // 优先使用原始代码（code），而不是转译后的代码（transformCode），避免包含 Babel 辅助函数
        const transformCode = model?.data?.fns?.code || model?.data?.fns?.transformCode || model?.data?.fns;
        if (transformCode && !jsModulesMap.has(comId)) {
          jsModulesMap.set(comId, {
            id: comId,
            title: comInfo.title || "JS计算",
            transformCode: typeof transformCode === 'string' ? transformCode : '',
            inputs: model?.inputs || [],
            outputs: model?.outputs || [],
            data: model?.data || {},
          });
        }
      }
    });

    const providerMap: ReturnType<BaseConfig["getProviderMap"]> = {};
    const fileName = config.getFileName?.(ui.meta.slotId);
    const providerName = fileName ? `${fileName}Provider` : "slot_Index";
    const currentProvider: ReturnType<BaseConfig["getCurrentProvider"]> = {
      name: firstCharToLowerCase(providerName),
      class: firstCharToUpperCase(providerName),
      controllers: new Set(),
      useParams: false,
      useEvents: false,
      coms: new Set(),
      useController: false,
      useData: false,
    };
    providerMap[currentProvider.name] = currentProvider;

    /** 类型定义 */
    const typeDef = {
      // 变量
      vars: Object.assign({}, globalVarTypeDef),
      // 输入
      inputs: {},
      // 输出
      outputs: {},
    };

    const fxsMap = Object.assign({}, defaultFxsMap);

    handleSlot(ui, {
      ...config,
      getCurrentScene: () => {
        return scene;
      },
      add: (value) => {
        result.push({
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
      getEventByDiagramId: (diagramId) => {
        return event.find((event) => event.diagramId === diagramId)!;
      },
      getVarEvents: (params) => {
        if (!params) {
          return event.filter((event) => {
            return (
              (event.type === "var" && !event.meta.parentComId) ||
              (event.type === "listener" && !event.meta.proxy.parentComId)
            );
          });
        }
        return event.filter((event) => {
          return (
            (event.type === "var" &&
              params.comId === event.meta.parentComId &&
              params.slotId === event.meta.frameId) ||
            (event.type === "listener" &&
              params.comId === event.meta.proxy.parentComId &&
              params.slotId === event.meta.proxy.frameId)
          );
        });
      },
      getFxEvents: (params) => {
        if (!params) {
          return event.filter((event) => {
            return event.type === "fx" && !event.parentComId;
          });
        }
        return event.filter((event) => {
          return (
            event.type === "fx" &&
            params.comId === event.parentComId &&
            params.slotId === event.parentSlotId
          );
        });
      },
      checkIsRoot: () => true,
      getEffectEvent: (params) => {
        // 默认只有一个生命周期事件
        if (!params) {
          // 主场景
          return event.find((event) => {
            return !event.slotId; // 没有slotId，认为是主场景
          })!;
        } else {
          // 作用域插槽
          const { comId, slotId } = params;
          return event.find((event) => {
            return event.slotId === slotId && event.comId === comId;
          })!;
        }
      },
      getCurrentProvider: () => {
        return currentProvider;
      },
      getRootProvider() {
        return currentProvider;
      },
      getProviderMap: () => {
        return providerMap;
      },
      getExtensionEventById,
      getSceneById,
      depth: 0,
      getTypeDef() {
        return typeDef;
      },
      getFxsMap: () => {
        return fxsMap;
      },
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
      getComponentController: ({ com }) => {
        return com.id;
      },
    });
  });

  result.push({
    type: "abstractEventTypeDef",
    content: abstractEventTypeDef(abstractEventTypeDefMap, config),
    importManager: new ImportManager(config),
    name: "abstractEventTypeDef",
  });

  // 生成 JSModules.ts 文件
  result.push({
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

    result.push({
      type: "commonIndex",
      content: commonIndexContent,
      importManager: new ImportManager(config),
      name: "commonIndex",
    });
  }

  // 添加 TabBar 配置项（如果存在）
  const globalTabBarConfig = pageConfigHandler.getTabBarConfig();
  if (globalTabBarConfig) {
    result.push({
      type: "tabBarConfig",
      content: globalTabBarConfig,
      importManager: new ImportManager(config),
      name: "tabBarConfig",
      tabBarConfig: globalTabBarConfig,
    });
  }

  // 将 TabBar 图片文件信息附加到结果中（通过扩展字段）
  // 由于 TypeScript 类型限制，我们使用 any 来扩展
  (result as any).__tabBarImageFiles = pageConfigHandler.getTabBarImageFiles();

  return result;
};

/** 初始化配置 */
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
}

export default toCodeTaro;
