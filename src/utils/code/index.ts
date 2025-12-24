/* eslint-disable @typescript-eslint/no-explicit-any */
import { indentation, genObjectCode } from "../index";

/** Taro/React UI 组件代码生成 */
export const getUiComponentCode = (
  params: {
    componentName: string;
    meta: any;
    props: any;
    resultStyle: Record<string, Record<string, string | number>>;
    componentInputs?: string[];
    componentOutputs?: string[];
    comEventCode?: string;
    slotsCode?: string;
    eventHandlers?: Record<string, string>; // 事件处理函数代码，例如 { onClick: "() => { ... }" }
  },
  config: {
    codeStyle: { indent: number };
    depth: number;
    verbose?: boolean;
  },
): string => {
  const {
    componentName,
    meta,
    props,
    resultStyle,
    componentInputs,
    componentOutputs,
    comEventCode,
    slotsCode,
    eventHandlers = {},
  } = params;

  const indent = indentation(config.codeStyle.indent * config.depth);
  const indent2 = indentation(config.codeStyle.indent * (config.depth + 1));

  // 使用 WithCom 包裹组件
  let ui = `${indent}<WithCom`;
  ui += `\n${indent2}component={${componentName}}`;
  ui += `\n${indent2}id='${meta.id}'`;
  ui += `\n${indent2}className='${meta.id}'`;
  
  // 添加 style（从 resultStyle.root 中提取）
  if (resultStyle.root && Object.keys(resultStyle.root).length > 0) {
    const styleCode = JSON.stringify(resultStyle.root);
    ui += `\n${indent2}style={${styleCode}}`;
  }

  // 添加 data（直接传递 props.data，WithCom 内部会使用 useModel）
  const initialData = JSON.stringify(props.data || {});
  ui += `\n${indent2}data={${initialData}}`;

  // 添加事件处理函数（onClick, onScroll 等）
  Object.entries(eventHandlers).forEach(([eventName, handlerCode]) => {
    // eventName 已经是 onXxx 格式（onClick, onScroll 等），直接使用
    ui += `\n${indent2}${eventName}={${handlerCode}}`;
  });

  // 添加插槽
  if (slotsCode) {
    ui += `\n${indent2}slots={{\n${slotsCode}${indent2}}}`;
  }
  
  ui += `\n${indent}/>`;

  return ui;
};

