import type { ToTaroCodeConfig } from "../toCodeTaro";
import pxtransform from "./pxtransform";

// 临时类型定义，实际使用时应该从 code-next 导入
export interface Style {
  layout?: "smart" | "flex-column" | "flex-row";
  width?: string | number;
  height?: string | number;
  [key: string]: any;
}

type ImportType = "default" | "named" | "module";
type DependencyImport = Record<
  string,
  Record<
    string,
    {
      importType: ImportType;
    }
  >
>;

/** 导入依赖收集、解析 */
export class ImportManager {
  private _imports: DependencyImport = {};

  constructor(private _config: ToTaroCodeConfig) {}

  /** 添加依赖 */
  addImport({
    packageName,
    dependencyNames,
    importType,
  }: {
    packageName: string;
    dependencyNames: string[];
    importType: ImportType;
  }) {
    if (!packageName) {
      return;
    }
    const { _imports } = this;
    if (!_imports[packageName]) {
      _imports[packageName] = {};
    }

    // 对于 module 类型且 dependencyNames 为空的情况，使用特殊标记
    if (importType === "module" && dependencyNames.length === 0) {
      _imports[packageName]["__module__"] = {
        importType: "module",
      };
    } else {
      dependencyNames.forEach((dependencyName) => {
        _imports[packageName][dependencyName] = {
          importType,
        };
      });
    }
  }

  /** 依赖解析为code */
  toCode() {
    const indent = indentation(this._config.codeStyle!.indent);
    return Object.entries(this._imports).reduce(
      (pre, [packageName, dependencies]) => {
        let defaultDependency = "";
        let namedDependencies = "";
        let moduleDependency = "";

        const dependencyEntries = Object.entries(dependencies);
        
        // 检查是否有 module 类型的导入（如 import './index.less'）
        // 通过检查 __module__ 标记或依赖项中的 module 类型
        const hasModuleType = dependencies["__module__"]?.importType === "module" ||
          dependencyEntries.some(([, { importType }]) => importType === "module");
        
        if (hasModuleType) {
          // module 类型：直接生成 import 'packageName'，不再处理其他依赖
          return pre + `import '${packageName}';\n`;
        }

        /** 超过三项换行 */
        // 排除 __module__ 标记
        const validEntries = dependencyEntries.filter(([key]) => key !== "__module__");
        const wrap = validEntries.length > 3;

        validEntries.forEach(([dependencyName, { importType }], index) => {
          if (importType === "default") {
            defaultDependency = dependencyName;
          } else if (importType === "named") {
            if (wrap) {
              namedDependencies += `${indent}${dependencyName},\n`;
            } else {
              namedDependencies += `${index ? ", " : ""}${dependencyName}`;
            }
          }
        });

        if (namedDependencies) {
          if (wrap) {
            namedDependencies = `{\n${namedDependencies}}`;
          } else {
            namedDependencies = `{ ${namedDependencies} }`;
          }

          if (defaultDependency) {
            defaultDependency += ", ";
          }
        }

        return (
          pre +
          `import ${defaultDependency}${namedDependencies} from '${packageName}';\n`
        );
      },
      "",
    );
  }
}

/** 将第一个字符转大写 */
export const firstCharToUpperCase = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/** 将第一个字符转小写 */
export const firstCharToLowerCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

/** 缩进 */
export const indentation = (level: number) => {
  return " ".repeat(level);
};

/** 驼峰转中划线 */
export const camelToKebab = (str: string) => {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
};

/** 中划线转驼峰 */
export const kebabToCamel = (str: string) => {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
};

/** 转换根节点样式 */
export const convertRootStyle = (style: Style) => {
  const rootStyle: Record<string, string | number> = {};

  Object.entries(style || {}).forEach(([key, value]) => {
    // 忽略一些不需要的属性
    if (
      key === "_new" ||
      key === "themesId" ||
      key === "visibility" ||
      key === "styleAry"
    ) {
      return;
    }

    if (key === "layout") {
      if (typeof value === "object" && value !== null) {
        // 处理 layout 对象，动态转换所有属性
        const layoutObj = value as any;
        Object.entries(layoutObj).forEach(([lKey, lValue]) => {
          if (lKey === "position") {
            if (lValue === "smart") {
              rootStyle["position"] = "absolute";
            } else if (lValue !== "inherit") {
              rootStyle["position"] = lValue as string;
            }
          } else {
            // 所有布局属性转为小驼峰（React 行内样式使用 camelCase）
            const camelLayoutKey = kebabToCamel(lKey);
            rootStyle[camelLayoutKey] = pxtransform(lValue as string | number);
          }
        });
      } else if (value === "flex-row") {
        rootStyle["display"] = "flex";
        rootStyle["flexDirection"] = "row";
      } else if (value === "flex-column") {
        rootStyle["display"] = "flex";
        rootStyle["flexDirection"] = "column";
      } else if (value === "smart") {
        // 处理 layout: 'smart'
        rootStyle["position"] = "relative";
      }
      return;
    }

    // 根样式转换，统一转为小驼峰（React 行内样式使用 camelCase）
    // 如果 key 已经是 kebab-case，转换为 camelCase；如果已经是 camelCase，保持不变
    const camelKey = key.includes('-') ? kebabToCamel(key) : key;
    if (typeof value === "string" || typeof value === "number") {
      rootStyle[camelKey] = pxtransform(value);
    }
  });

  return rootStyle;
};

/** 转换组件样式为 Taro/React 样式 */
export const convertComponentStyle = (style: Style) => {
  const resultStyle: Record<string, Record<string, string | number>> = {};
  const rootStyle = convertRootStyle(style);

  if (style.styleAry) {
    // 处理样式数组
    (style.styleAry as any[]).forEach(
      ({
        css,
        selector,
      }: {
        css: Record<string, string | number>;
        selector: string;
      }) => {
        const transformedCss: Record<string, string | number> = {};
        Object.entries(css).forEach(([cssKey, cssValue]) => {
          if (cssKey === "layout") {
            if (typeof cssValue === "object" && cssValue !== null) {
              const layoutObj = cssValue as any;
              Object.entries(layoutObj).forEach(([lKey, lValue]) => {
                if (lKey === "position") {
                  if (lValue === "smart") {
                    transformedCss["position"] = "absolute";
                  } else if (lValue !== "inherit") {
                    transformedCss["position"] = lValue as string;
                  }
                } else {
                  // 布局属性转为小驼峰（React 行内样式使用 camelCase）
                  transformedCss[kebabToCamel(lKey)] = lValue as string | number;
                }
              });
            } else if (cssValue === "flex-row") {
              transformedCss["display"] = "flex";
              transformedCss["flexDirection"] = "row";
            } else if (cssValue === "flex-column") {
              transformedCss["display"] = "flex";
              transformedCss["flexDirection"] = "column";
            } else if (cssValue === "smart") {
              transformedCss["position"] = "relative";
            }
          } else {
            // CSS 属性转为小驼峰（React 行内样式使用 camelCase）
            // 如果 cssKey 已经是 kebab-case，转换为 camelCase；如果已经是 camelCase，保持不变
            const camelKey = cssKey.includes('-') ? kebabToCamel(cssKey) : cssKey;
            transformedCss[camelKey] = pxtransform(cssValue);
          }
        });
        resultStyle[selector] = transformedCss;
      },
    );
  }

  resultStyle["root"] = rootStyle;

  return resultStyle;
};

/** 转换 styleAry 为 CSS 字符串 */
export const convertStyleAryToCss = (styleAry: any[], parentSelector?: string) => {
  if (!Array.isArray(styleAry)) return "";

  const prefix = parentSelector ? `.${parentSelector} ` : "";

  return styleAry
    .map(({ selector, css }) => {
      if (!selector || !css) return "";
      
      // 处理选择器，如果是以 > 开头，处理空格
      let finalSelector = selector;
      if (finalSelector.startsWith(">")) {
        finalSelector = `${prefix}${finalSelector}`;
      } else {
        finalSelector = `${prefix}${finalSelector}`;
      }

      const transformedCss: Record<string, string | number> = {};
      Object.entries(css).forEach(([key, value]) => {
        if (key === "layout") {
          if (typeof value === "object" && value !== null) {
            const layoutObj = value as any;
            Object.entries(layoutObj).forEach(([lKey, lValue]) => {
              if (lKey === "position") {
                if (lValue === "smart") {
                  transformedCss["position"] = "absolute";
                } else if (lValue !== "inherit") {
                  transformedCss["position"] = lValue as string;
                }
              } else {
                transformedCss[kebabToCamel(lKey)] = lValue as string | number;
              }
            });
          } else if (value === "flex-row") {
            transformedCss["display"] = "flex";
            transformedCss["flexDirection"] = "row";
          } else if (value === "flex-column") {
            transformedCss["display"] = "flex";
            transformedCss["flexDirection"] = "column";
          } else if (value === "smart") {
            transformedCss["position"] = "relative";
          }
        } else {
          transformedCss[kebabToCamel(key)] = value as string | number;
        }
      });

      const cssString = Object.entries(transformedCss)
        .map(([key, value]) => {
          // 使用通用工具转换驼峰为中划线
          const kebabKey = camelToKebab(key);
          const formattedValue =
            typeof value === "number" ? `${value}px` : value;
          return `  ${kebabKey}: ${formattedValue};`;
        })
        .join("\n");
      return `${finalSelector} {\n${cssString}\n}`;
    })
    .join("\n\n");
};

/** 生成对象代码 */
export const genObjectCode = (
  object: any,
  config: { initialIndent: number; indentSize: number },
): string => {
  const { initialIndent, indentSize } = config;
  const keys = Object.keys(object);
  if (keys.length === 0) return "{}";

  let result = "{\n";
  keys.forEach((key, idx) => {
    const value = object[key];
    let formattedValue: string;

    if (Array.isArray(value)) {
      formattedValue = JSON.stringify(value);
    } else if (value && typeof value === "object") {
      formattedValue = genObjectCode(value, {
        initialIndent: initialIndent + indentSize,
        indentSize,
      });
    } else if (typeof value === "string") {
      formattedValue = JSON.stringify(value);
    } else {
      formattedValue = String(value);
    }

    result +=
      indentation(initialIndent + indentSize) +
      `${JSON.stringify(key)}: ${formattedValue}`;
    if (idx < keys.length - 1) result += ",";
    result += "\n";
  });
  result += indentation(initialIndent) + "}";
  return result;
};

// 导出 code 目录下的函数
export { getUiComponentCode } from "./code";
export { getRootComponentClassName } from "./getComponentClassName";

