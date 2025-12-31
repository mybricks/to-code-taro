/**
 * Base64 图片处理工具
 * 负责将 base64 图片保存为本地文件
 */

import type { ImageFileInfo } from './types';

/**
 * MIME 类型到文件扩展名的映射
 */
const MIME_TO_EXT: Record<string, string> = {
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
  svg: 'svg',
};

/**
 * Base64 图片解析结果
 */
interface ParsedBase64Image {
  mimeType: string;
  base64Data: string;
}

/**
 * 从 base64 字符串中提取图片格式和 base64 数据
 * @param base64Str base64 字符串
 * @returns 解析结果或 null
 */
function parseBase64Image(base64Str: string): ParsedBase64Image | null {
  if (typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return null;
  }

  const match = base64Str.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

/**
 * 根据 MIME 类型获取文件扩展名
 * @param mimeType MIME 类型
 * @returns 文件扩展名，默认为 'png'
 */
function getFileExtension(mimeType: string): string {
  return MIME_TO_EXT[mimeType.toLowerCase()] || 'png';
}

/**
 * 生成唯一的文件名
 * @param index TabBar 项的索引
 * @param type 图标类型
 * @param extension 文件扩展名
 * @returns 文件名
 */
function generateFileName(
  index: number,
  type: 'normal' | 'selected',
  extension: string,
): string {
  return `tabbar_${index}_${type}.${extension}`;
}

/**
 * 处理 TabBar 图标，如果是 base64 则准备保存为文件
 * @param iconPath 图标路径（可能是 base64 或普通路径）
 * @param tabBarIndex TabBar 项的索引
 * @param type 图标类型（'normal' 或 'selected'）
 * @param imageFiles 用于收集需要保存的图片文件的数组（可选）
 * @returns 处理后的图标路径（用于 app.config.ts），如果不是 base64 则返回原路径
 */
export function processTabBarIcon(
  iconPath: string | undefined,
  tabBarIndex: number,
  type: 'normal' | 'selected',
  imageFiles?: ImageFileInfo[],
): string | undefined {
  if (!iconPath) {
    return undefined;
  }

  // 解析 base64 图片
  const parsed = parseBase64Image(iconPath);
  if (!parsed) {
    // 不是 base64 格式，直接返回原路径
    return iconPath;
  }

  // 生成文件名和路径
  const extension = getFileExtension(parsed.mimeType);
  const fileName = generateFileName(tabBarIndex, type, extension);
  const fileSystemPath = `src/assets/tabbar/${fileName}`;
  const configPath = `assets/tabbar/${fileName}`;

  // 如果需要收集图片文件
  if (imageFiles) {
    try {
      // 将 base64 数据转换为 Buffer
      const imageBuffer = Buffer.from(parsed.base64Data, 'base64');
      imageFiles.push({
        filePath: fileSystemPath,
        fileContent: imageBuffer,
      });
    } catch (error) {
      console.error(`处理 TabBar 图标失败: ${error}`);
      // 转换失败时返回原路径
      return iconPath;
    }
  }

  // 返回配置路径（用于 app.config.ts）
  return configPath;
}
