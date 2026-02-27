import pxtransform from "./pxtransform";
import { kebabToCamel, camelToKebab } from "../common/string";
import type { Style } from "./types";

/**
 * 鸿蒙/Taro 规范：尺寸相关属性（数值即 px，需转 rpx）
 */
const DIMENSION_PROPS = /^(width|height|padding|margin|top|right|bottom|left|fontSize|borderRadius|borderWidth|gap|rowGap|columnGap)/i;
/**
 * 混合属性：数值视为倍数（不转），px 字符串视为固定高度（需转 rpx）
 */
const MIXED_PROPS = /^(lineHeight)/i;
const MIN_MAX_PROPS = /^(min|max)/i;

/**
 * 判断是否为尺寸相关属性（数值即 px）
 */
function isDimensionProp(key: string): boolean {
  if (DIMENSION_PROPS.test(key)) return true;
  if (MIN_MAX_PROPS.test(key)) {
    const subKey = key.replace(/^(min|max)/i, "");
    const normalizedSubKey = subKey.charAt(0).toLowerCase() + subKey.slice(1);
    return DIMENSION_PROPS.test(normalizedSubKey);
  }
  return false;
}

/**
 * 统一处理样式值的转换逻辑
 */
function transformStyleValue(key: string, value: any): any {
  if (typeof value !== "string" && typeof value !== "number") return value;

  // 1. 尺寸属性：数值/px 字符串 均转换
  if (isDimensionProp(key)) {
    return pxtransform(value);
  }

  // 2. 混合属性 (如 lineHeight)：仅转换 px 字符串，数值视为倍数保持原样
  if (MIXED_PROPS.test(key)) {
    return typeof value === "string" ? pxtransform(value) : value;
  }

  // 3. 其他属性 (如 zIndex, flex, fontWeight)：保持原样
  return value;
}

/**
 * 提取通用的 layout 属性转换逻辑
 */
function handleLayoutProp(value: any, target: Record<string, string | number>) {
  if (typeof value === "object" && value !== null) {
    const layoutObj = value as any;
    Object.entries(layoutObj).forEach(([lKey, lValue]) => {
      if (lKey === "position") {
        if (lValue === "smart") {
          if (target["position"] === undefined) {
            target["position"] = "relative";
          }
        } else if (lValue !== "inherit") {
          target["position"] = lValue as string;
        }
      } else {
        const camelLKey = kebabToCamel(lKey);
        target[camelLKey] = transformStyleValue(camelLKey, lValue);
      }
    });
  } else if (value === "flex-row") {
    target["display"] = "flex";
    target["flexDirection"] = "row";
  } else if (value === "flex-column") {
    target["display"] = "flex";
    target["flexDirection"] = "column";
  } else if (value === "smart") {
    if (target["position"] === undefined) {
      target["position"] = "relative";
    }
  }
}

/** 转换根节点样式 */
export const convertRootStyle = (style: Style) => {
  const rootStyle: Record<string, string | number> = {};

  Object.entries(style || {}).forEach(([key, value]) => {
    if (
      key === "_new" ||
      key === "themesId" ||
      key === "visibility" ||
      key === "styleAry"
    ) {
      return;
    }

    if (key === "layout") {
      handleLayoutProp(value, rootStyle);
      return;
    }

    const camelKey = key.includes("-") ? kebabToCamel(key) : key;
    rootStyle[camelKey] = transformStyleValue(camelKey, value);
  });

  return rootStyle;
};

/** 转换组件样式为 Taro/React 样式 */
export const convertComponentStyle = (style: Style) => {
  const resultStyle: Record<string, Record<string, string | number>> = {};
  const rootStyle = convertRootStyle(style);

  if (style.styleAry) {
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
            handleLayoutProp(cssValue, transformedCss);
          } else {
            const camelKey = cssKey.includes("-") ? kebabToCamel(cssKey) : cssKey;
            transformedCss[camelKey] = transformStyleValue(camelKey, cssValue);
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
export const convertStyleAryToCss = (
  styleAry: any[],
  parentSelector?: string,
) => {
  if (!Array.isArray(styleAry)) return "";


  return styleAry
    .map(({ selector, css }) => {
      if (!selector || !css) return "";

      let finalSelector = selector.trim();
      if (parentSelector) {
        const prefix = `.${parentSelector}`;
        finalSelector = `${prefix} ${finalSelector}`;
      }

      const transformedCss: Record<string, string | number> = {};
      Object.entries(css).forEach(([key, value]) => {
        if (key === "layout") {
          handleLayoutProp(value, transformedCss);
        } else {
          const camelKey = kebabToCamel(key);
          transformedCss[camelKey] = transformStyleValue(camelKey, value);
        }
      });

      const cssString = Object.entries(transformedCss)
        .map(([key, value]) => {
          const kebabKey = camelToKebab(key);
          return `  ${kebabKey}: ${value};`;
        })
        .join("\n");
      return `${finalSelector} {\n${cssString}\n}`;
    })
    .join("\n\n");
};
