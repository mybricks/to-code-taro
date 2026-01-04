/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 处理Extension事件卡片
 */

import { ImportManager, indentation } from "./utils";
import { handleProcess } from "./utils/handleProcess";
import type { ToTaroCodeConfig, GeneratedFile } from "./toCodeTaro";

interface HandleExtensionParams {
  tojson: any;
  extensionEvents: any[];
}

const handleExtension = (
  params: HandleExtensionParams,
  config: ToTaroCodeConfig,
): GeneratedFile[] => {
  const { tojson, extensionEvents } = params;
  const files: GeneratedFile[] = [];
  const importManager = new ImportManager(config);
  const addDependencyImport = importManager.addImport.bind(importManager);

  const eventCode = genEvent(
    {
      tojson,
      extensionEvents: extensionEvents.filter((extensionEvent: any) => {
        return extensionEvent.meta.type === "extension-event";
      }),
    },
    { ...config, addParentDependencyImport: addDependencyImport },
  );

  const apiCode = genApi(
    {
      tojson,
      extensionEvents: extensionEvents.filter((extensionEvent: any) => {
        return extensionEvent.meta.type === "extension-api";
      }),
    },
    { ...config, addParentDependencyImport: addDependencyImport },
  );

  const configCode = genConfig(
    {
      tojson,
      extensionEvents: extensionEvents.filter((extensionEvent: any) => {
        return extensionEvent.meta.type === "extension-config";
      }),
    },
    { ...config, addParentDependencyImport: addDependencyImport },
  );

  files.push({
    type: "api",
    content:
      (apiCode ? `${apiCode}\n\n` : "") +
      (configCode ? `${configCode}\n\n` : "") +
      eventCode,
    importManager,
    name: "abstractEventTypeDef",
  });

  const extensionBusImportManager = new ImportManager(config);
  const addDependencyExtensionBusImport =
    extensionBusImportManager.addImport.bind(extensionBusImportManager);

  const busCode = genBus(
    {
      tojson,
      extensionEvents: extensionEvents.filter((extensionEvent: any) => {
        return extensionEvent.meta.type === "extension-bus";
      }),
    },
    { ...config, addParentDependencyImport: addDependencyExtensionBusImport },
  );

  if (busCode) {
    files.push({
      content: busCode,
      importManager: extensionBusImportManager,
      type: "extension-bus",
      name: "系统总线",
    });
  }

  return files;
};

export default handleExtension;

interface GenConfig extends ToTaroCodeConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
}

const genConfig = (params: HandleExtensionParams, config: GenConfig) => {
  const { extensionEvents } = params;
  const { addParentDependencyImport } = config;

  if (!extensionEvents.length) {
    return "";
  }

  const extensionEvent = extensionEvents[0];
  const event = extensionEvent.events[0];

  const eventParams: Record<string, string> = {};
  (event.paramPins || []).forEach((cur: any) => {
    eventParams[cur.id] = `value.${cur.id}`;
  });
  const code = handleProcess(event, {
    ...config,
    depth: 2,
    getParams: () => {
      return eventParams;
    },
    getComponentPackageName: () => {
      return config.getComponentPackageName({ type: "extensionEvent" });
    },
    addParentDependencyImport,
    getComponentMeta: ((com, configMeta) => {
      return config.getComponentMeta(com, {
        ...configMeta,
        json: extensionEvent.meta,
      });
    }) as typeof config.getComponentMeta,
  } as any);

  addParentDependencyImport({
    packageName: config.getUtilsPackageName(),
    dependencyNames: ["MyBricks"],
    importType: "named",
  });

  return (
    `export const config = (${event.paramPins?.length ? "value: any" : ""}) => {` +
    (code ? `\n${code}` : "") +
    `\n}`
  );
};

const genApi = (params: HandleExtensionParams, config: GenConfig) => {
  const { extensionEvents } = params;
  const { addParentDependencyImport } = config;

  if (!extensionEvents.length) {
    return "";
  }

  let apiCode = "";

  extensionEvents.forEach((extension: any) => {
    const { meta, events } = extension;
    const event = events[0];
    const params = {
      open: "value",
      call: "value",
    };
    const code = handleProcess(event, {
      ...config,
      depth: 2,
      getParams: () => {
        return params;
      },
      getComponentPackageName: () => {
        return config.getComponentPackageName({ type: "extensionEvent" });
      },
      addParentDependencyImport,
      getComponentMeta: ((com, configMeta) => {
        return config.getComponentMeta(com, {
          ...configMeta,
          json: meta,
        });
      }) as typeof config.getComponentMeta,
    } as any);

    const indent = indentation(config.codeStyle!.indent);
    const indent2 = indentation(config.codeStyle!.indent * 2);

    apiCode +=
      `${indent}/** ${event.title} */` +
      `\n${indent}${event.title}: any = transformApi((value: any) => {` +
      `\n${code}` +
      `\n${indent}})\n`;

    addParentDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["MyBricks", "transformApi"],
      importType: "named",
    });
  });

  return `class Api {` + `\n${apiCode}}` + `\n\nexport const api = new Api()`;
};

const genBus = (params: HandleExtensionParams, config: GenConfig) => {
  const { extensionEvents } = params;
  const { addParentDependencyImport } = config;

  if (!extensionEvents.length) {
    return "";
  }

  let busCode = "";

  extensionEvents.forEach((extension: any) => {
    const { meta, events } = extension;
    const event = events[0];
    const params = {
      open: "value",
      call: "value",
    };
    const code = handleProcess(event, {
      ...config,
      depth: 2,
      getParams: () => {
        return params;
      },
      getComponentPackageName: () => {
        return config.getComponentPackageName({ type: "extensionEvent" });
      },
      addParentDependencyImport,
      getComponentMeta: ((com, configMeta) => {
        return config.getComponentMeta(com, {
          ...configMeta,
          json: meta,
        });
      }) as typeof config.getComponentMeta,
    } as any);

    const indent = indentation(config.codeStyle!.indent);

    busCode +=
      `${indent}/** ${event.title} */` +
      `\n${indent}${event.title}: any = createFx((value: any) => {` +
      `\n${code}` +
      `\n${indent}})\n`;

    addParentDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["MyBricks", "createFx"],
      importType: "named",
    });
  });

  return (
    "/** 系统总线 */" +
    `\nclass Bus {` +
    `\n${busCode}}` +
    `\n\nexport const bus = new Bus()`
  );
};

const genEvent = (params: HandleExtensionParams, config: GenConfig) => {
  const { tojson, extensionEvents } = params;
  const { addParentDependencyImport } = config;

  if (!extensionEvents.length) {
    return "";
  }

  addParentDependencyImport({
    packageName: config.getUtilsPackageName(),
    dependencyNames: ["MyBricks", "createEvent", "transformEvents"],
    importType: "named",
  });

  let typeCode = "";
  let eventCode = "";
  let eventCreateCode = "";

  const indent = indentation(config.codeStyle!.indent);

  extensionEvents.forEach((event: any) => {
    const extensionEvent = tojson.frames.find(
      (frame: any) => frame.id === event.meta.id,
    )!;

    const typeParams = `T${extensionEvent.title}Params`;
    const interfaceCallBack = `I${extensionEvent.title}CallBack`;

    typeCode += `type ${typeParams} = any;\n`;

    let interfaceCallBackCode = "";

    extensionEvent.outputs.forEach((output: any) => {
      const title = output.title;
      interfaceCallBackCode +=
        (title ? `\n${indent}/** ${title} */` : "") +
        `\n${indent}${output.id}: (value: any) => void;`;
    });

    if (interfaceCallBackCode) {
      typeCode +=
        `interface ${interfaceCallBack} {` + `${interfaceCallBackCode}\n}\n`;
    }

    eventCode +=
      `${indent}${extensionEvent.title}?: ${interfaceCallBackCode ? "EventWithCallBack" : "Event"}<${typeParams}${interfaceCallBackCode ? `, ${interfaceCallBack}` : ""}>;\n`;

    const params = {
      open: "value",
      call: "value",
    };

    const code = handleProcess(event.events[0], {
      ...config,
      depth: 2,
      getParams: () => {
        return params;
      },
      getComponentPackageName: () => {
        return config.getComponentPackageName({ type: "extensionEvent" });
      },
      getComponentMeta: ((com, configMeta) => {
        return config.getComponentMeta(com, {
          ...configMeta,
          json: event.meta,
        });
      }) as typeof config.getComponentMeta,
    } as any);

    eventCreateCode +=
      `${indent}${extensionEvent.title}: any = createEvent((value: ${typeParams}${interfaceCallBackCode ? `, callBack: ${interfaceCallBack}` : ""}) => {` +
      code +
      `\n${indent}})\n`;
  });

  return (
    `type Event<ParamsType> = (params: ParamsType) => void;` +
    `\ntype EventWithCallBack<ParamsType, CallbackType> = (value: ParamsType, callBack: CallbackType) => void;` +
    `\n${typeCode}` +
    `class Events {` +
    `\n${eventCreateCode}}` +
    `\n\nexport const events = new Events();` +
    `\n\ninterface OnEventParams {` +
    `\n${eventCode}}` +
    `\n\nexport const onEvent: (events: OnEventParams) => void = transformEvents(events);`
  );
};

