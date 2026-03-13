/**
 * 处理全局变量、全局Fx、其他全局配置
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImportManager, indentation } from "./utils";
import { handleProcess } from "./utils/logic/handleProcess";
import { getSafeVarName } from "./utils/common/string";
import { extractJSModuleFromCom } from "./utils/context/collectJSModules";
import type { ToTaroCodeConfig, GeneratedFile } from "./toCodeTaro";

interface HandleGlobalParams {
  tojson: any;
  globalFxs: any[];
  globalVars: any[];
}

const handleGlobal = (
  params: HandleGlobalParams,
  config: ToTaroCodeConfig,
): GeneratedFile[] => {
  const { tojson, globalFxs, globalVars } = params;
  const globalImportManager = new ImportManager(config);
  const globalAddDependencyImport =
    globalImportManager.addImport.bind(globalImportManager);

  globalAddDependencyImport({
    packageName: config.getComponentPackageName(),
    dependencyNames: ["useAppContext"],
    importType: "named",
  });

  let globalVarsInitCode = "";
  let globalVarsRegisterChangeCode = "";

  const indent = indentation(config.codeStyle!.indent);
  const indent2 = indentation(config.codeStyle!.indent * 2);

  Object.entries(tojson.global.comsReg).forEach(([, com]: any) => {
    if (com.def.namespace !== "mybricks.core-comlib.var") {
      // 非变量，不需要初始化
      return;
    }

    const event = globalVars.find((globalVar: any) => {
      return globalVar.meta.id === com.id;
    })!;

    const res = handleProcess(event, {
      ...config,
      depth: 2,
      getParams: () => {
        return {
          [event.paramId]: "value",
        };
      },
      getComponentPackageName: (props: any) => {
        if (props?.meta.global) {
          return "";
        }
        return config.getComponentPackageName(props);
      },
      addParentDependencyImport: globalAddDependencyImport,
      getComponentMeta: config.getComponentMeta,
      getCurrentScene: () => {
        return tojson.global;
      },
    } as any);

    const varKey = getSafeVarName(com);

    globalVarsRegisterChangeCode +=
      `\n${indent2}this.${varKey}.registerChange((value: any) => {` +
      `\n${res}` +
      `\n${indent2}})`;

    globalVarsInitCode += `${indent}${varKey}: any = createVariable(${JSON.stringify(com.model.data.initValue || {})})\n`;
  });

  let globalFxsInitCode = "";
  globalFxs.forEach((event: any) => {
    const currentScene = tojson.global.fxFrames.find(
      (fxFrame: any) => fxFrame.id === event.frameId,
    );
    const res = handleProcess(event, {
      ...config,
      depth: 2,
      getCurrentScene: () => {
        return currentScene;
      },
      getParams: () => {
        return event.paramPins.reduce(
          (pre: any, cur: any, index: number) => {
            pre[cur.id] = `value${index}`;
            return pre;
          },
          {} as Record<string, string>,
        );
      },
      getComponentPackageName: (props: any) => {
        if (props?.meta.global) {
          return "";
        }
        return config.getComponentPackageName(props);
      },
      addParentDependencyImport: (params: any) => {
        const { dependencyNames } = params;
        const filterDependencyNames = dependencyNames.filter(
          (dependencyName: string) => {
            return !["globalVars", "globalFxs"].includes(dependencyName);
          },
        );

        if (filterDependencyNames.length) {
          globalAddDependencyImport({
            ...params,
            dependencyNames: filterDependencyNames,
          });
        }
      },
      getComponentMeta: config.getComponentMeta,
    } as any);

    /** 入参 */
    const values = event.paramPins
      .map((paramPin: any, index: number) => {
        if (paramPin.type === "config") {
          return `value${index}: any = ${JSON.stringify(event.initValues[paramPin.id])}`;
        }
        return `value${index}: any`;
      })
      .join(", ");

    const fxParams = values ? `${values}, appContext: any` : `appContext: any`;

    globalFxsInitCode +=
      `${indent}/** ${event.title} */` +
      `\n${indent}${event.frameId}: any = createFx((${fxParams}) => {` +
      `\n${res}` +
      `\n${indent}})\n`;
  });

  const varCode =
    "/** 全局变量 */" +
    `\nclass GlobalVars {` +
    `\n${globalVarsInitCode}` +
    `\n${indent}init() {` +
    `${globalVarsRegisterChangeCode}` +
    `\n${indent}}` +
    `\n}` +
    `\n\nexport const globalVars = new GlobalVars()`;

  const fxCode =
    "/** 全局Fx */" +
    `\nclass GlobalFxs {` +
    `\n${globalFxsInitCode}` +
    `}` +
    `\n\nexport const globalFxs = new GlobalFxs()`;

  if (varCode.includes("createVariable(")) {
    globalAddDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["createVariable"],
      importType: "named",
    });
  }

  if (fxCode.includes("createFx(")) {
    globalAddDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["createFx"],
      importType: "named",
    });
  }

  if (fxCode.includes("merge(")) {
    globalAddDependencyImport({
      packageName: config.getUtilsPackageName(),
      dependencyNames: ["merge"],
      importType: "named",
    });
  }

  // 收集全局 JS 计算组件（从 fxFrames 的 coms 中提取）
  const globalJsModules: any[] = [];
  (tojson.global.fxFrames || []).forEach((fxFrame: any) => {
    Object.entries(fxFrame.coms || {}).forEach(([comId, comInfo]: [string, any]) => {
      const jsModule = extractJSModuleFromCom(comId, comInfo);
      if (jsModule && !globalJsModules.some((m) => m.id === comId)) {
        globalJsModules.push(jsModule);
      }
    });
  });

  return [
    {
      type: "rootConfig",
      content: JSON.stringify(tojson.rootConfig, null, 2),
      importManager: null,
      name: "rootConfig",
    },
    {
      type: "global",
      content: varCode + "\n\n" + fxCode,
      importManager: globalImportManager,
      name: "global",
      jsModules: globalJsModules,
    },
  ];
};

export default handleGlobal;

