import type { ToJSON } from '@mybricks/to-code-react/dist/esm/toCode/types';

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
 * 页面配置生成器
 * 负责生成 definePageConfig 配置
 */

interface GenerateItem {
  meta?: {
    id?: string;
    scene?: {
      id?: string;
      title?: string;
    };
    title?: string;
  };
  [key: string]: any;
}

/**
 * 从 toJson 中获取场景的 systemPage 组件数据
 * @param toJson MyBricks toJson 数据
 * @param sceneId 场景 ID
 * @returns systemPage 组件的 model.data，如果找不到则返回 undefined
 */
function getSystemPageDataFromToJson(
  toJson: ToJSON,
  sceneId: string,
): any | undefined {
  if (!toJson.scenes || !Array.isArray(toJson.scenes)) {
    return undefined;
  }

  const scene = toJson.scenes.find((s: any) => s.id === sceneId);
  if (!scene?.coms) {
    return undefined;
  }

  // 查找 systemPage 组件
  const systemPageCom = Object.values(scene.coms).find((com: any) => {
    return com.def?.namespace === 'mybricks.taro.systemPage';
  });

  return systemPageCom?.model?.data;
}

/**
 * 生成 definePageConfig 配置内容
 * @param item GenerateItem 项
 * @param toJson MyBricks toJson 数据（可选）
 * @returns definePageConfig 配置字符串
 */
export function generatePageConfig(
  item: GenerateItem,
  toJson?: ToJSON,
): string {
  const sceneId = item.meta?.id || item.meta?.scene?.id;
  const pageConfig: Record<string, any> = {};

  if (toJson && sceneId) {
    const systemPageData = getSystemPageDataFromToJson(toJson, sceneId);
    
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

