import { indentation } from "../index";

/** Render 函数管理器 */
export class RenderManager {
  private _renders: Map<string, string> = new Map();

  /**
   * 注册一个 render 函数
   * @param renderId 唯一标识符，格式：组件ID_插槽ID
   * @param renderCode render 函数的代码内容（不包含函数声明）
   */
  register(renderId: string, renderCode: string) {
    this._renders.set(renderId, renderCode);
  }

  /**
   * 生成所有 render 函数的定义代码
   * @param indent 基础缩进
   */
  toCode(indent: string): string {
    if (this._renders.size === 0) {
      return "";
    }

    let code = "";
    const indentSize = 2; // 函数体内部缩进大小（通常是 2 个空格）
    const indent2 = indentation(indentSize); // 函数体内部缩进

    this._renders.forEach((renderCode, renderId) => {
      code += `${indent}const ${renderId}_Render = (params?: { style?: any }) => {\n`;
      code += `${indent}${indent2}return (\n`;
      // renderCode 已经包含了正确的缩进，直接拼接
      code += renderCode;
      code += `\n${indent}${indent2});\n`;
      code += `${indent}};\n\n`;
    });

    return code;
  }

  /**
   * 生成 render 对象的引用代码
   * @param slotId 插槽ID
   * @param renderId render 函数ID
   * @param indent 缩进
   */
  genRenderRef(slotId: string, renderId: string, indent: string): string {
    return `${indent}${slotId}: {\n${indent}  render: ${renderId}_Render,\n${indent}},\n`;
  }
}

