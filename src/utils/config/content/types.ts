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
  normalIconUseImg?: boolean;
  selectedIconUseImg?: boolean;
  normalIcon?: string;
  selectedIcon?: string;
  normalFontIconStyle?: Record<string, any>;
  selectedFontIconStyle?: Record<string, any>;
  normalIconPath?: string;
  selectedIconPath?: string;
  normalTextStyle?: Record<string, any>;
  selectedTextStyle?: Record<string, any>;
  normalIconStyle?: Record<string, any>;
  selectedIconStyle?: Record<string, any>;
  normalBackgroundStyle?: Record<string, any>;
  selectedBackgroundStyle?: Record<string, any>;
}

/**
 * 转换后的自定义Tabbar项配置
 * 增加页面路径pagePath
 * normalIconPath/selectedIconPath替换成本地图片路径
 */
export interface CustomTabbarConfig extends TabBarItemSource {
  pagePath: string;
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
  custom?: boolean;
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

