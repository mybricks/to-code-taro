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
  if (typeof base64Str !== "string") return null;

  const match = base64Str.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!match) return null;

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
const getFileExtension = (mimeType: string): string =>
  MIME_TO_EXT[mimeType.toLowerCase()] ?? "png";

const sanitizeName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64) || "img";

/**
 * 生成唯一的文件名
 * @param index TabBar 项的索引
 * @param type 图标类型
 * @param extension 文件扩展名
 * @returns 文件名
 */
const generateFileName = (
  index: number,
  type: "normal" | "selected",
  extension: string,
): string => `tabbar_${index}_${type}.${extension}`;

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
  type: "normal" | "selected",
  imageFiles?: ImageFileInfo[],
): string | undefined {
  if (!iconPath) return undefined;

  const parsed = parseBase64Image(iconPath);
  if (!parsed) return iconPath.replace(/^\/?@\//, "");

  const extension = getFileExtension(parsed.mimeType);
  const fileName = generateFileName(tabBarIndex, type, extension);
  const fileSystemPath = `src/assets/tabbar/${fileName}`;
  const configPath = `assets/tabbar/${fileName}`;

  if (imageFiles) {
    try {
      imageFiles.push({
        filePath: fileSystemPath,
        fileContent: Buffer.from(parsed.base64Data, "base64"),
      });
    } catch (error) {
      console.error(`处理 TabBar 图标失败: ${error}`);
      return iconPath;
    }
  }

  return configPath;
}

/**
 * 处理页面/组件 data 中的 base64 图片
 * - 图片文件保存到 src/assets/<pageId>/ 目录（与 tabbar 同级）
 * - data 中替换为 "@/assets/<pageId>/<fileName>"
 */
export function processPageBase64Image(
  value: string,
  pageId: string,
  imageFiles: ImageFileInfo[],
  nameHint: string,
  index: number,
): string {
  const parsed = parseBase64Image(value);
  if (!parsed) return value;

  const extension = getFileExtension(parsed.mimeType);
  const safeName = sanitizeName(nameHint);
  const finalName = index > 1 ? `${safeName}_${index}` : safeName;
  const fileName = `${finalName}.${extension}`;
  const fileSystemPath = `src/assets/${pageId}/${fileName}`;
  const aliasPath = `@/assets/${pageId}/${fileName}`;

  imageFiles.push({
    filePath: fileSystemPath,
    fileContent: Buffer.from(parsed.base64Data, "base64"),
  });

  return aliasPath;
}

/**
 * 替换字符串中的 base64 图片（支持 url(data:image/...) 形式）
 */
export function replaceBase64InText(
  value: string,
  pageId: string,
  imageFiles: ImageFileInfo[],
  nameHint: string,
  getIndex: () => number,
): string {
  if (typeof value !== "string") return value as any;
  let result = value;
  // 支持一个字符串中多处 base64
  while (true) {
    const match = result.match(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/);
    if (!match) break;
    const currentIndex = getIndex();
    const replaced = processPageBase64Image(
      match[0],
      pageId,
      imageFiles,
      nameHint,
      currentIndex,
    );
    result = result.replace(match[0], replaced);
  }
  return result;
}
