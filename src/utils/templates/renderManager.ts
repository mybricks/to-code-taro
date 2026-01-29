import { indentation, toPascalCase } from "./index";

/** Render 函数管理器 */
export class RenderManager {
  /** 存储格式：renderId -> { renderCode, children?, logicCode?, slotType?, useWrap?, description? } */
  private _renders: Map<string, { renderCode: string; children?: any[]; logicCode?: string; slotType?: string; useWrap?: boolean; description?: string }> = new Map();

  /**
   * 注册一个 render 函数
   */
  register(renderId: string, renderCode: string, children?: any[], logicCode?: string, slotType?: string, useWrap?: boolean, description?: string) {
    this._renders.set(renderId, { renderCode, children, logicCode, slotType, useWrap, description });
  }

  /**
   * 生成所有 render 函数的 definition 代码
   */
  toCode(indent: string): string {
    if (this._renders.size === 0) {
      return "";
    }

    let code = "";
    const indentSize = 2;
    const indent2 = indentation(indentSize);
    const indent3 = indentation(indentSize * 2);
    const indent4 = indentation(indentSize * 3);
    const indent5 = indentation(indentSize * 4);
    const indent6 = indentation(indentSize * 5);

    this._renders.forEach(({ renderCode, children, logicCode, useWrap, description }, renderId) => {
      const renderFunctionName = toPascalCase(`${renderId}_Render`);
      
      if (description) {
        code += `${indent}/** ${description} */\n`;
      }
      code += `${indent}function ${renderFunctionName}(params: any) {\n`;
      // render 函数内的事件处理代码可能会用到 appContext（例如 jsModules.xxx(..., appContext)）
      // outputs 统一从 comRefs.current.$outputs 读取（不再通过 context.outputs 透出）
      code += `${indent}${indent2}const { comRefs, $vars, $fxs, appContext } = useAppContext();\n`;
      // code += `${indent}${indent2}const outputs = comRefs.current.$outputs;\n`;

      if (logicCode) {
        code += logicCode.split("\n").map(line => `${indent}${line}`).join("\n") + "\n";
      }

      // 1. 提取组件 JSX 为变量，实现单次定义、多次引用
      const comVars: Record<string, string> = {};
      let modifiedRenderCode = renderCode;

      if (children && children.length > 0) {
        children.forEach((child) => {
          if (child.type === "com") {
            const varName = `${child.id}_JSX`;
            const comJsx = child.ui; // 保持原始字符串（包含可能的 Fragment 或 View 包裹）
            comVars[child.id] = varName;
            
            code += `${indent}${indent2}const ${varName} = (\n`;
            // 内部定义时 trim 掉外层缩进，保持变量内容整洁
            code += `${indent}${indent3}${comJsx.trim()}\n`;
            code += `${indent}${indent2});\n`;

            // 优化：使用宽容空白匹配正则
            const pattern = this.createFlexibleRegex(comJsx.trim());
            modifiedRenderCode = modifiedRenderCode.replace(pattern, `{${varName}}`);
          }
        });
        code += "\n";
      }

      // 2. 定义描述符（仅在容器协议下生成，精简元数据）
      if (useWrap && children && children.length > 0) {
        code += `${indent}${indent2}const descriptors = [\n`;
        children.forEach((child) => {
          if (child.type === "com") {
            const childStyle = JSON.stringify(child.rootStyle || child.props?.style || {});
            const varName = comVars[child.id];
            
            code += `${indent}${indent3}{\n`;
        code += `${indent}${indent4}id: '${child.id}',\n`;
        code += `${indent}${indent4}name: ${child.name !== undefined ? `'${child.name}'` : 'undefined'},\n`;
        code += `${indent}${indent4}style: ${childStyle},\n`;
        code += `${indent}${indent4}get inputs() { return comRefs.current['${child.id}'] },\n`;
        code += `${indent}${indent4}get outputs() { return comRefs.current.$outputs['${child.id}'] },\n`;
        code += `${indent}${indent4}jsx: ${varName},\n`;
            code += `${indent}${indent3}},\n`;
          }
        });
        code += `${indent}${indent2}];\n\n`;
      }

      // 3. 核心渲染逻辑（精简 wrap 分发）
      code += `${indent}${indent2}return (\n`;
      if (useWrap) {
        // 如果是容器协议插槽，直接调用 wrap
        code += `${indent}${indent3}params?.wrap?.(descriptors)\n`;
      } else {
        code += `${indent}${indent3}<>\n`;
        code += modifiedRenderCode.split("\n").map(line => `${indent}${indent2}${line}`).join("\n") + "\n";
        code += `${indent}${indent3}</>\n`;
      }
      code += `${indent}${indent2});\n`;
      code += `${indent}}\n\n`;
    });

    return code;
  }

  /**
   * 转义字符串并创建能够匹配任意空白符的正则
   */
  private createFlexibleRegex(str: string): RegExp {
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义正则元字符
                       .replace(/\s+/g, '\\s+');               // 将所有空白符替换为 \s+
    return new RegExp(escaped, 'g');
  }

  genRenderRef(slotId: string, renderId: string, indent: string): string {
    const renderFunctionName = toPascalCase(`${renderId}_Render`);
    return `${indent}${slotId}: {\n${indent}  render: ${renderFunctionName},\n${indent}},\n`;
  }
}
