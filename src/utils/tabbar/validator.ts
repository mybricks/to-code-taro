import type { TabBarItemSource, TabBarValidationResult } from './types';

/**
 * TabBar 验证器
 * 负责验证 TabBar 配置是否有效
 */

/** TabBar 项的最小数量 */
const MIN_TAB_BAR_ITEMS = 2;

/** TabBar 项的最大数量 */
const MAX_TAB_BAR_ITEMS = 5;

/**
 * 验证 TabBar 配置
 * @param tabBar TabBar 项数组（来自 toJson.tabbar）
 * @returns 验证结果
 */
export function validateTabBar(
  tabBar: TabBarItemSource[] | undefined | null,
): TabBarValidationResult {
  // 如果 tabBar 不存在或不是数组，返回不启用
  if (!Array.isArray(tabBar)) {
    return {
      useTabBar: false,
      validItems: [],
      error: 'TabBar 配置不存在或格式错误',
    };
  }

  // 过滤出有效的 TabBar 项（必须有 scene.id）
  const validItems = tabBar.filter((item) => {
    return !!item?.scene?.id;
  });

  // 检查数量是否在有效范围内
  const itemCount = validItems.length;
  if (itemCount < MIN_TAB_BAR_ITEMS) {
    return {
      useTabBar: false,
      validItems: [],
      error: `TabBar 项数量不足，需要至少 ${MIN_TAB_BAR_ITEMS} 个，当前 ${itemCount} 个`,
    };
  }

  if (itemCount > MAX_TAB_BAR_ITEMS) {
    return {
      useTabBar: false,
      validItems: [],
      error: `TabBar 项数量过多，最多 ${MAX_TAB_BAR_ITEMS} 个，当前 ${itemCount} 个`,
    };
  }

  // 验证通过
  return {
    useTabBar: true,
    validItems,
  };
}

/**
 * 判断是否启用 TabBar
 * @param tabBar TabBar 项数组
 * @returns 是否启用
 */
export function shouldUseTabBar(
  tabBar: TabBarItemSource[] | undefined | null,
): boolean {
  return validateTabBar(tabBar).useTabBar;
}

