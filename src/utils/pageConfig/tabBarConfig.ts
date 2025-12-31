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
  indent: string = '  ',
): string {
  const lines: string[] = [];
  lines.push(`${indent}tabBar: {`);

  // 添加颜色配置（如果存在）
  if (config.color) {
    lines.push(`${indent}  color: '${config.color}',`);
  }
  if (config.selectedColor) {
    lines.push(`${indent}  selectedColor: '${config.selectedColor}',`);
  }
  if (config.backgroundColor) {
    lines.push(`${indent}  backgroundColor: '${config.backgroundColor}',`);
  }
  if (config.borderStyle) {
    lines.push(`${indent}  borderStyle: '${config.borderStyle}',`);
  }

  // 添加 list 配置
  lines.push(`${indent}  list: [`);
  config.list.forEach((item, index) => {
    const isLast = index === config.list.length - 1;
    lines.push(`${indent}    {`);
    lines.push(`${indent}      pagePath: '${item.pagePath}',`);
    lines.push(`${indent}      text: '${item.text}',`);
    if (item.iconPath) {
      lines.push(`${indent}      iconPath: '${item.iconPath}',`);
    }
    if (item.selectedIconPath) {
      lines.push(`${indent}      selectedIconPath: '${item.selectedIconPath}',`);
    }
    lines.push(`${indent}    }${isLast ? '' : ','}`);
  });
  lines.push(`${indent}  ]`);
  lines.push(`${indent}}`);

  return lines.join('\n');
}

