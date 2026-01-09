import { indentation, toPascalCase } from "./index";

/** Render 函数管理器 */
export class RenderManager {
  /** 存储格式：renderId -> { renderCode, children?, logicCode?, slotType?, useWrap? } */
  private _renders: Map<string, { renderCode: string; children?: any[]; logicCode?: string; slotType?: string; useWrap?: boolean }> = new Map();

  /**
   * 注册一个 render 函数
   */
  register(renderId: string, renderCode: string, children?: any[], logicCode?: string, slotType?: string, useWrap?: boolean) {
    this._renders.set(renderId, { renderCode, children, logicCode, slotType, useWrap });
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

    this._renders.forEach(({ renderCode, children, logicCode, useWrap }, renderId) => {
      const renderFunctionName = toPascalCase(`${renderId}_Render`);
      
      code += `${indent}const ${renderFunctionName} = (params: any) => {\n`;
      code += `${indent}${indent2}const { comRefs, outputs } = useAppContext();\n`;

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
            const comJsx = child.ui.trim();
            comVars[child.id] = varName;
            
            code += `${indent}${indent2}const ${varName} = (\n`;
            code += `${indent}${indent3}${comJsx}\n`;
            code += `${indent}${indent2});\n`;

            // 替换渲染结构中的组件调用为变量引用
            const pattern = new RegExp(`<WithCom\\s+[^>]*id=['"]${child.id}['"][\\s\\S]*?/>|<WithCom\\s+[^>]*id=['"]${child.id}['"][\\s\\S]*?>[\\s\\S]*?</WithCom>`, 'g');
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
        code += `${indent}${indent4}get outputs() { return outputs.current['${child.id}'] },\n`;
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
      code += `${indent}};\n\n`;
    });

    return code;
  }

  genRenderRef(slotId: string, renderId: string, indent: string): string {
    const renderFunctionName = toPascalCase(`${renderId}_Render`);
    return `${indent}${slotId}: {\n${indent}  render: ${renderFunctionName},\n${indent}},\n`;
  }
}
