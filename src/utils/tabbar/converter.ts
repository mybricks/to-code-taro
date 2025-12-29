import type { TabBarItemSource, TaroTabBarItem, TaroTabBarConfig } from './types';
import { validateTabBar } from './validator';

/**
 * TabBar 数据转换器
 * 负责将 toJson.tabbar 格式转换为 Taro 配置格式
 */

/**
 * 将单个 TabBar 项转换为 Taro 格式
 * @param item TabBar 项
 * @param pageIdToPath 页面 ID 到路径的映射函数
 * @param index TabBar 项的索引（用于生成文件名）
 * @param processIcon 处理图标的函数（可选，用于处理 base64 图片）
 * @returns Taro TabBar 项
 */
function convertTabBarItem(
  item: TabBarItemSource,
  pageIdToPath: (pageId: string) => string,
  index: number = 0,
  processIcon?: (iconPath: string | undefined, index: number, type: 'normal' | 'selected') => string | undefined,
): TaroTabBarItem {
  const pagePath = pageIdToPath(item.scene.id);
  const text = item.text || item.scene.title || '';

  const taroItem: TaroTabBarItem = {
    pagePath,
    text,
  };

  // 添加图标路径（如果存在）
  if (item.normalIconPath) {
    taroItem.iconPath = processIcon
      ? processIcon(item.normalIconPath, index, 'normal')
      : item.normalIconPath;
  }

  if (item.selectedIconPath) {
    taroItem.selectedIconPath = processIcon
      ? processIcon(item.selectedIconPath, index, 'selected')
      : item.selectedIconPath;
  }

  return taroItem;
}

/**
 * 从文本样式中提取颜色
 * @param textStyle 文本样式对象
 * @returns 颜色值（如果有）
 */
function extractColorFromTextStyle(
  textStyle: Record<string, any> | undefined,
): string | undefined {
  if (!textStyle || typeof textStyle !== 'object') {
    return undefined;
  }
  return textStyle.color || textStyle.colorValue;
}

/**
 * 将 TabBar 数据转换为 Taro 配置格式
 * @param tabBar TabBar 项数组（来自 toJson.tabbar）
 * @param pageIdToPath 页面 ID 到路径的映射函数，默认格式为 `pages/${pageId}/index`
 * @param processIcon 处理图标的函数（可选，用于处理 base64 图片）
 * @returns Taro TabBar 配置，如果验证失败则返回 null
 */
export function convertToTaroTabBarConfig(
  tabBar: TabBarItemSource[] | undefined | null,
  pageIdToPath: (pageId: string) => string = (pageId) => `pages/${pageId}/index`,
  processIcon?: (iconPath: string | undefined, index: number, type: 'normal' | 'selected') => string | undefined,
): TaroTabBarConfig | null {
  // 验证 TabBar 配置
  const validation = validateTabBar(tabBar);
  if (!validation.useTabBar) {
    return null;
  }

  // 转换 TabBar 项
  const list: TaroTabBarItem[] = validation.validItems.map((item, index) =>
    convertTabBarItem(item, pageIdToPath, index, processIcon),
  );

  // 构建 TabBar 配置
  const config: TaroTabBarConfig = {
    list,
  };

  // 从第一个 TabBar 项的样式中提取颜色（如果存在）
  const firstItem = validation.validItems[0];
  if (firstItem) {
    const normalColor = extractColorFromTextStyle(firstItem.normalTextStyle);
    const selectedColor = extractColorFromTextStyle(firstItem.selectedTextStyle);

    if (normalColor) {
      config.color = normalColor;
    }
    if (selectedColor) {
      config.selectedColor = selectedColor;
    }
  }

  return config;
}

/**
 * 获取入口页面 ID
 * 如果启用 TabBar，返回第一个 TabBar 项的页面 ID；否则返回 null
 * @param tabBar TabBar 项数组
 * @param defaultEntryPageId 默认入口页面 ID（当 TabBar 未启用时使用）
 * @returns 入口页面 ID
 */
export function getEntryPageId(
  tabBar: TabBarItemSource[] | undefined | null,
  defaultEntryPageId?: string,
): string | null {
  const validation = validateTabBar(tabBar);
  if (validation.useTabBar && validation.validItems.length > 0) {
    return validation.validItems[0].scene.id;
  }
  return defaultEntryPageId || null;
}

