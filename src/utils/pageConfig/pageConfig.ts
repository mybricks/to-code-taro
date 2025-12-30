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
    const useNavigationStyle = systemPageData.useNavigationStyle;
    
    // 确定要使用的属性列表
    let propertiesToUse: string[] = [];
    
    if (useNavigationStyle === 'default') {
      // 如果 useNavigationStyle 为 default，使用 TARO_NAVIGATION_BAR_PROPERTIES
      propertiesToUse = TARO_NAVIGATION_BAR_PROPERTIES;
    } else {
      // 否则使用 TARO_PAGE_CONFIG_TEMPLATE_PROPERTIES
      propertiesToUse = TARO_PAGE_CONFIG_TEMPLATE_PROPERTIES;
    }
    
    // 从 systemPageData 中提取配置属性
    propertiesToUse.forEach((prop) => {
      if (systemPageData[prop] !== undefined && systemPageData[prop] !== null) {
        const value = systemPageData[prop];
        // 处理不同类型的值
        if (typeof value === 'string') {
          pageConfig[prop] = `'${value}'`;
        } else if (typeof value === 'boolean' || typeof value === 'number') {
          pageConfig[prop] = value;
        } else if (typeof value === 'object') {
          pageConfig[prop] = JSON.stringify(value);
        }
      }
    });
  }

  // 如果没有找到任何配置，设置默认的 navigationBarTitleText
  if (Object.keys(pageConfig).length === 0) {
    pageConfig.navigationBarTitleText = `'页面'`;
  }

  // 生成配置字符串
  const configLines = Object.entries(pageConfig).map(([key, value]) => {
    return `  ${key}: ${value}`;
  });

  return `export default definePageConfig({
${configLines.join(',\n')}
})`;
}

