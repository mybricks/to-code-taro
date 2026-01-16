/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 生成 jsModules 运行时工具（公共部分，避免每个页面重复 & 避免单文件过大）
 */
export const genJSModulesRuntime = () => {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

function convertObject2Array(input: any) {
  let result: any[] = [];
  Object.keys(input)
    .sort((a, b) => {
      let _a = extractNumbers(a) || 0;
      let _b = extractNumbers(b) || 0;
      return +_a - +_b;
    })
    .forEach((key) => {
      result.push((input as any)[key]);
    });
  return result;
}

function extractNumbers(str: string) {
  let number = "";
  for (let i = 0; i < str.length; i++) {
    if (!isNaN(parseInt(str[i] as any))) {
      number += str[i];
    }
  }
  return number;
}

export function _execJs(script: any) {
  return function ({ env, data, inputs, outputs, logger, onError }: any) {
    const { fns, runImmediate } = data || {};
    const runJSParams: any = {
      logger,
      outputs: convertObject2Array(outputs),
    };
    try {
      if (runImmediate) {
        script(runJSParams);
      }
      inputs["input"]((val: any) => {
        try {
          script({
            ...runJSParams,
            inputs: convertObject2Array(val),
          });
        } catch (ex) {
          console.error("js计算组件运行错误.", ex);
        }
      });
    } catch (ex) {
      console.error("js计算组件运行错误.", ex);
    }
  };
}
`;
};

/**
 * 生成“页面级/弹窗级”的 jsModules（只包含当前页面用到的 JS 计算组件）
 * 输出：export const jsModules = { u_xxx: (props, appContext) => createJSHandle(...) }
 */
export const genScopedJSModules = (
  jsModules: Array<{
    id: string;
    title: string;
    transformCode: string;
    inputs: string[];
    outputs: string[];
    data: any;
  }>,
  importCreateJSHandleFrom: string,
  importRuntimeFrom: string,
) => {
  let code = `/* eslint-disable @typescript-eslint/no-explicit-any */
import { createJSHandle } from "${importCreateJSHandleFrom}";
import { _execJs } from "${importRuntimeFrom}";

export const jsModules: Record<string, (props: any, appContext: any) => any> = {};
`;

  jsModules.forEach((module) => {
    const { id, title, transformCode } = module;
    let decodedCode = transformCode;
    try {
      decodedCode = decodeURIComponent(transformCode);
    } catch (e) {
      decodedCode = transformCode;
    }

    code += `\n// ${title}\n`;
    code += `const js_${id} = ${decodedCode};\n`;
    code += `const _execJs_${id} = _execJs(js_${id});\n`;
    code += `jsModules.${id} = (props, appContext) => createJSHandle(_execJs_${id}, { props, appContext });\n`;
  });

  code += `\n`;
  return code;
};

