/* eslint-disable @typescript-eslint/no-explicit-any */
import { indentation } from "../index";

export { indentation };

/** 将第一个字符转大写 */
export const firstCharToUpperCase = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/** 格式化插槽内容缩进 */
export const formatSlotContent = (uiContent: string, baseIndentSize: number, renderBodyIndent: string): string => {
  return uiContent
    .split("\n")
    .map((line) => `${renderBodyIndent}${line}`)
    .join("\n");
};

/** 将字符串转为大驼峰 */
export const toPascalCase = (str: string): string => {
  return str
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

/** 根节点data去除无用属性 */
const formatData = (data: any, isRoot: boolean) => {
  if (!data) return {}
  if (!isRoot) return data
  const delKeys = ['tabBar', 'navigationStyle', 'navigationBarBackgroundColor', 'navigationBarTextStyle', 'navigationBarTitleText', 'backgroundColorTop', 'backgroundColorBottom']
  return Object.fromEntries(Object.entries(data).filter(([key]) => !delKeys.includes(key)))
}

/** Taro/React UI 组件代码生成 */
export const getUiComponentCode = (
  params: {
    componentName: string;
    meta: any;
    props: any;
    resultStyle: Record<string, Record<string, string | number>>;
    /** 可选：自定义 data 的表达式代码（用于插槽动态入参等场景） */
    dataCode?: string;
    componentInputs?: string[];
    componentOutputs?: string[];
    comEventCode?: string;
    slotsCode?: string;
    eventHandlers?: Record<string, string>; // 事件处理函数代码
  },
  config: {
    codeStyle: { indent: number };
    depth: number;
    verbose?: boolean;
    checkIsRoot: () => boolean;
  },
): string => {
  const {
    componentName,
    meta,
    props,
    resultStyle,
    dataCode,
    slotsCode,
    eventHandlers = {},
  } = params;

  const isRoot = config.checkIsRoot();
  const indent = indentation(config.codeStyle.indent * config.depth);
  const indent2 = indentation(config.codeStyle.indent * (config.depth + 1));

  // 使用 WithCom 包裹组件
  let ui = `${indent}<WithCom`;
  ui += `\n${indent2}component={${componentName}}`;
  ui += `\n${indent2}id='${meta.id}'`;
  ui += `\n${indent2}className='${meta.id} mybricks_com'`;
  
  if (meta.name) {
    ui += `\n${indent2}name='${meta.name}'`;
  }

  // 添加 style
  if (resultStyle.root && Object.keys(resultStyle.root).length > 0) {
    const styleCode = JSON.stringify(resultStyle.root);
    ui += `\n${indent2}style={${styleCode}}`;
  }

  // 添加 data
  const initialDataCode = dataCode ?? JSON.stringify(formatData(props.data, isRoot));
  ui += `\n${indent2}data={${initialDataCode}}`;

  // 添加事件处理函数
  Object.entries(eventHandlers).forEach(([eventName, handlerCode]) => {
    ui += `\n${indent2}${eventName}={${handlerCode}}`;
  });

  // 添加插槽
  if (slotsCode) {
    ui += `\n${indent2}slots={{\n${slotsCode}${indent2}}}`;
  } else {
  }
  
  ui += `\n${indent}/>`;

  return ui;
};
