/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 生成 JSModules.ts 文件内容
 * 参考鸿蒙的实现方式
 */
export const genJSModules = (jsModules: Array<{
  id: string;
  title: string;
  transformCode: string;
  inputs: string[];
  outputs: string[];
  data: any;
}>) => {
  if (jsModules.length === 0) {
    return `export default function({ createJSHandle }) {
  const comModules = {};
  return comModules;
}`;
  }

  // 工具函数：将对象转换为数组
  const convertObject2ArrayCode = `
function convertObject2Array(input) {
  let result = [];
  Object.keys(input)
    .sort((a, b) => {
      let _a = extractNumbers(a) || 0;
      let _b = extractNumbers(b) || 0;
      return +_a - +_b;
    })
    .forEach((key) => {
      result.push(input[key]);
    });
  return result;
}
function extractNumbers(str) {
  let number = "";
  for (let i = 0; i < str.length; i++) {
    if (!isNaN(parseInt(str[i]))) {
      number += str[i];
    }
  }
  return number;
}
function _execJs(script) {
  return function ({ env, data, inputs, outputs, logger, onError }) {
    const { fns, runImmediate } = data || {};
    const runJSParams = {
      logger,
      outputs: convertObject2Array(outputs),
    };
    try {
      if (runImmediate) {
        script(runJSParams);
      }
      inputs["input"]((val) => {
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

  let code = `export default function({ createJSHandle }) {
  const comModules = {};
  ${convertObject2ArrayCode}
`;

  // 为每个 JS 计算组件生成代码
  jsModules.forEach((module) => {
    const { id, title, transformCode, inputs, outputs } = module;
    
    // 如果 transformCode 已经是解码后的代码，直接使用；否则解码
    let decodedCode = transformCode;
    try {
      // 尝试解码，如果失败说明已经是原始代码
      decodedCode = decodeURIComponent(transformCode);
    } catch (e) {
      // 如果解码失败，说明已经是原始代码，直接使用
      decodedCode = transformCode;
    }
    
    // 生成 JS 函数
    code += `\n  // ${title}\n`;
    code += `  const js_${id} = ${decodedCode};\n`;
    code += `  const _execJs_${id} = _execJs(js_${id});\n`;
    code += `  comModules["${id}"] = (props, appContext) => {\n`;
    code += `    return createJSHandle(_execJs_${id}, { props, appContext });\n`;
    code += `  };\n`;
  });

  code += `\n  return comModules;\n}`;

  return code;
};

