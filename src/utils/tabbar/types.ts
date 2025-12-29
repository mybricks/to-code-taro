/**
 * TabBar 相关类型定义
 */

/**
 * TabBar 项的数据结构（来自 toJson.tabbar）
 */
export interface TabBarItemSource {
  scene: {
    id: string;
    title?: string;
  };
  text?: string;
  type?: string;
  selectedIconPath?: string;
  selectedIconStyle?: Record<string, any>;
  selectedTextStyle?: Record<string, any>;
  selectedBackgroundStyle?: Record<string, any>;
  normalIconPath?: string;
  normalIconStyle?: Record<string, any>;
  normalTextStyle?: Record<string, any>;
  normalBackgroundStyle?: Record<string, any>;
  subMenu?: Array<{
    scene: {
      id: string;
      title?: string;
    };
    normalIconPath?: string;
    normalIconStyle?: Record<string, any>;
    normalTextStyle?: Record<string, any>;
    normalBackgroundStyle?: Record<string, any>;
  }>;
}

/**
 * Taro TabBar 配置项
 */
export interface TaroTabBarItem {
  pagePath: string;
  text: string;
  iconPath?: string;
  selectedIconPath?: string;
}

/**
 * Taro TabBar 完整配置
 */
export interface TaroTabBarConfig {
  color?: string;
  selectedColor?: string;
  backgroundColor?: string;
  borderStyle?: 'black' | 'white';
  list: TaroTabBarItem[];
}

/**
 * TabBar 验证结果
 */
export interface TabBarValidationResult {
  /** 是否启用 TabBar */
  useTabBar: boolean;
  /** 验证后的 TabBar 项列表 */
  validItems: TabBarItemSource[];
  /** 错误信息（如果有） */
  error?: string;
}

