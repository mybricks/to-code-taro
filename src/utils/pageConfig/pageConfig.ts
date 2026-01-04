/**
 * 页面配置工具
 * 负责从 systemPage 组件数据生成 definePageConfig 配置字符串
 */

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
    const propertiesToUse =
      systemPageData.useNavigationStyle === "default"
        ? TARO_NAVIGATION_BAR_PROPERTIES
        : TARO_PAGE_CONFIG_TEMPLATE_PROPERTIES;

    // 从 systemPageData 中提取配置属性
    propertiesToUse.forEach((prop) => {
      const value = systemPageData[prop];
      if (value !== undefined && value !== null) {
        pageConfig[prop] = value;
      }
    });
  }

  // 如果没有找到任何配置，设置默认的 navigationBarTitleText
  if (Object.keys(pageConfig).length === 0) {
    pageConfig.navigationBarTitleText = "页面";
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

