/**
 * 页面配置工具
 * 负责从 systemPage 组件数据生成 definePageConfig 配置字符串
 */

import { colorToHex } from "../index";

const TARO_NAVIGATION_BAR_PROPERTIES = [
  'navigationBarBackgroundColor',
  'navigationBarTextStyle',
  'navigationBarTitleText',
  'navigationStyle',
];

const TARO_PAGE_CONFIG_TEMPLATE_PROPERTIES = [
  'navigationBarBackgroundColor',
  'navigationBarTextStyle',
  'navigationBarTitleText',
  'navigationStyle',
  'transparentTitle',
  'backgroundColor',
  'backgroundTextStyle',
  'backgroundColorTop',
  'backgroundColorBottom',
  'enablePullDownRefresh',
  'onReachBottomDistance',
  'pageOrientation',
  'disableScroll',
  'disableSwipeBack',
  'enableShareAppMessage',
  'enableShareTimeline',
  'usingComponents',
  'renderer',
];

/**
 * 从 systemPage 组件数据生成 definePageConfig 配置字符串
 * @param systemPageData systemPage 组件的 model.data
 * @returns definePageConfig 配置字符串
 */
export function generatePageConfigContent(systemPageData?: any): string {
  const pageConfig: Record<string, any> = {};

  if (systemPageData) {
    // 1. 处理导航栏隐藏逻辑：如果是 none，强制设置 navigationStyle 为 custom 以隐藏默认导航栏
    if (systemPageData.useNavigationStyle === "none") {
      pageConfig.navigationStyle = "custom";
    }

    const propertiesToUse =
      systemPageData.useNavigationStyle === "default"
        ? TARO_NAVIGATION_BAR_PROPERTIES
        : TARO_PAGE_CONFIG_TEMPLATE_PROPERTIES;

    // 2. 从 systemPageData 中提取配置属性
    propertiesToUse.forEach((prop) => {
      let value = systemPageData[prop];
      if (value !== undefined && value !== null) {
        // 特殊处理：将 RGBA 颜色转换为 WeChat 要求的 Hex 格式
        if (prop.includes("BackgroundColor") || prop === "backgroundColor" || prop === "backgroundColorTop" || prop === "backgroundColorBottom") {
          value = colorToHex(value);
        }
        pageConfig[prop] = value;
      }
    });
  }

  // 生成配置字符串
  const configContent = JSON.stringify(pageConfig, null, 2)
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .trim();

  return `export default definePageConfig({
  ${configContent}
})`;
}

