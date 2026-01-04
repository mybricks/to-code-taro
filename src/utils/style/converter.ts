import pxtransform from "./pxtransform";
import { kebabToCamel, camelToKebab } from "../common/string";
import type { Style } from "./types";

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

