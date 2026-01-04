/**
 * TabBar 配置工具
 * 负责从 tabBar 数据生成 app.config.ts 中的 tabBar 配置字符串
 */

import type { TaroTabBarConfig, ImageFileInfo } from './types';
import { convertToTaroTabBarConfig } from './converter';
import { processTabBarIcon } from './saveBase64Image';

/**
 * 从 tabBar 数据生成 TabBar 配置字符串（用于 app.config.ts）
 * @param tabBar tabBar 数据数组（来自 scenes[x].coms[id].model.data.tabBar）
 * @param pageIdToPath 页面 ID 到路径的映射函数（默认使用 pages/${pageId}/index）
 * @param imageFiles 用于收集需要保存的图片文件的数组（可选）
 * @returns TabBar 配置字符串，如果验证失败则返回 null
 */
export function generateTabBarConfigContent(
  tabBar: any[] | undefined,
  pageIdToPath: (pageId: string) => string = (pageId) => `pages/${pageId}/index`,
  imageFiles?: ImageFileInfo[],
): string | null {
  if (!tabBar || !Array.isArray(tabBar)) {
    return null;
  }

  // 转换为 Taro 配置格式
  // 如果启用 base64 处理，传入 processTabBarIcon 函数
  const iconProcessor = imageFiles
    ? (iconPath: string | undefined, index: number, type: 'normal' | 'selected') =>
        processTabBarIcon(iconPath, index, type, imageFiles)
    : undefined;
  
  const config = convertToTaroTabBarConfig(tabBar, pageIdToPath, iconProcessor);
  
  if (!config) {
    return null;
  }

  // 转换为 app.config.ts 中的字符串格式
  return formatTabBarConfigForAppConfig(config);
}

/**
 * 将 TabBar 配置转换为 app.config.ts 中的字符串格式
 * @param config TabBar 配置
 * @param indent 缩进字符串，默认为 2 个空格
 * @returns 配置字符串
 */
function formatTabBarConfigForAppConfig(
  config: TaroTabBarConfig,
  indent: string = "  ",
): string {
  // 使用 JSON.stringify 生成结构化的字符串，然后进行微调以符合 TypeScript 习惯（如去掉引号）
  const tabBarJson = JSON.stringify(config, null, 2);

  // 格式化：将双引号改为单引号，并将 key 的引号去掉（如果符合变量命名规范）
  const formattedJson = tabBarJson
    .replace(/"([^"]+)":/g, "$1:") // 去掉 key 的引号
    .replace(/"/g, "'"); // 将双引号改为单引号

  // 添加缩进，并前置 "tabBar: "
  const lines = formattedJson.split("\n");
  return lines
    .map((line, index) => {
      if (index === 0) return `${indent}tabBar: ${line}`;
      return `${indent}${line}`;
    })
    .join("\n");
}

