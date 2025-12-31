/**
 * TabBar 相关类型定义
 */

/**
 * TabBar 项源数据（来自 toJson.tabbar）
 */
export interface TabBarItemSource {
  scene: {
    id: string;
    title?: string;
  };
  text?: string;
  type?: string;
  normalIconPath?: string;
  selectedIconPath?: string;
  normalTextStyle?: Record<string, any>;
  selectedTextStyle?: Record<string, any>;
  normalIconStyle?: Record<string, any>;
  selectedIconStyle?: Record<string, any>;
  normalBackgroundStyle?: Record<string, any>;
  selectedBackgroundStyle?: Record<string, any>;
  subMenu?: Array<{
    scene: {
      id: string;
      title?: string;
    };
    normalIconPath?: string;
    normalTextStyle?: Record<string, any>;
    normalIconStyle?: Record<string, any>;
    normalBackgroundStyle?: Record<string, any>;
  }>;
}

/**
 * Taro TabBar 项配置
 */
export interface TaroTabBarItem {
  pagePath: string;
  text: string;
  iconPath?: string;
  selectedIconPath?: string;
}

/**
 * Taro TabBar 配置
 */
export interface TaroTabBarConfig {
  color?: string;
  selectedColor?: string;
  backgroundColor?: string;
  borderStyle?: string;
  list: TaroTabBarItem[];
}

/**
 * TabBar 验证结果
 */
export interface TabBarValidationResult {
  useTabBar: boolean;
  validItems: TabBarItemSource[];
  error?: string;
}

/**
 * 图片文件信息
 */
export interface ImageFileInfo {
  filePath: string;
  fileContent: Buffer;
}

