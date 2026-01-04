import { indentation } from "../index";
import { RenderManager } from "./renderManager";

/** 生成组件 Inputs 映射代码 */
export const genComponentInputsCode = (indent: string, providerName: string, comId: string) => {
  return `${indent}inputs['${comId}'] = useBindInputs(controllers.current.${providerName}, '${comId}');\n`;
};

/** 生成组件 Outputs 映射代码 */
export const genComponentOutputsCode = (indent: string, comId: string, comEventCode: string) => {
  if (!comEventCode) return "";
  return `${indent}outputs['${comId}'] = {\n` +
         `${comEventCode}` +
         `${indent}};\n`;
};

/** 包装单个事件处理函数，注入 getConnections */
export const wrapEventProcess = (indent: string, eventId: string, defaultValue: string, process: string) => {
  return `${indent}${eventId}: Object.assign((${defaultValue}: any) => {\n` +
         `${process}\n` +
         `${indent}}, { getConnections: () => [1] }),\n`;
};

/** 生成插槽渲染函数引用（使用 renderManager） */
export const genSlotRenderRef = ({
  slotId,
  renderId,
  indent,
  isLast
}: {
  slotId: string;
  renderId: string;
  indent: string;
  isLast: boolean;
}) => {
  return `${indent}${slotId}: {\n${indent}  render: ${renderId}_Render,\n${indent}}${isLast ? '' : ','}\n`;
};

/** 格式化插槽内容为 render 函数体代码 */
export const formatSlotContent = ({
  uiContent,
  baseIndentSize,
  renderBodyIndent
}: {
  uiContent: string;
  baseIndentSize: number; // 原始代码的基础缩进大小（通常是 2）
  renderBodyIndent: string; // render 函数体内部的缩进字符串（通常是 4 个空格）
}): string => {
  const lines = uiContent.split('\n');
  const formattedLines: string[] = [];
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return; // 跳过空行
    }
    
    // 计算原有缩进（相对于 depth=1 的缩进）
    const originalIndentMatch = line.match(/^(\s*)/);
    const originalIndent = originalIndentMatch ? originalIndentMatch[1].length : 0;
    
    // 计算相对缩进层级（相对于 depth=1，即 baseIndentSize）
    const relativeIndentLevel = Math.floor(originalIndent / baseIndentSize);
    
    // 新的缩进 = render 函数体内部基础缩进 + 相对缩进
    // renderBodyIndent 已经是函数体内部的缩进（通常是 4 个空格）
    // 然后再加上相对缩进层级 * baseIndentSize
    const newIndent = renderBodyIndent + indentation(baseIndentSize * relativeIndentLevel);
    
    formattedLines.push(newIndent + trimmedLine);
  });
  
  return formattedLines.join('\n');
};

