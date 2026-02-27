/**
 * 图片压缩工具
 * 使用 sharp（可选依赖）对生成的图片进行压缩
 */

import type { GenerationResult } from "../toCodeTaro";
import type { ImageFileInfo } from "../utils/config/content/types";

export interface ImageCompressionOptions {
  /** sharp .png() 参数，如 { compressionLevel: 9, palette: true, effort: 10 } */
  png?: Record<string, any>;
  /** sharp .jpeg() 参数，如 { quality: 80 } */
  jpeg?: Record<string, any>;
}

let sharpModule: any;

function getSharp(): any | null {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = require("sharp");
  } catch {
    sharpModule = null;
  }
  return sharpModule;
}

/**
 * 压缩 GenerationResult 中的所有图片
 * 需要安装 sharp（optionalDependency），未安装时原样返回
 */
export async function compressImages(
  result: GenerationResult,
  options: ImageCompressionOptions,
): Promise<GenerationResult> {
  const sharp = getSharp();
  if (!sharp) {
    console.warn(
      "[to-code-taro] sharp 未安装，跳过图片压缩。可通过 pnpm add sharp 安装。",
    );
    return result;
  }

  const allImages: ImageFileInfo[] = [
    ...((result.assets?.pageImages as ImageFileInfo[]) || []),
    ...((result.assets?.tabBarImages as ImageFileInfo[]) || []),
  ];

  if (allImages.length === 0) return result;

  await Promise.all(
    allImages.map(async (img) => {
      const ext = img.filePath.split(".").pop()?.toLowerCase();
      const original = img.fileContent;
      try {
        let compressed: Buffer | undefined;
        if (ext === "png" && options.png) {
          compressed = await sharp(original)
            .png(options.png)
            .toBuffer();
        } else if ((ext === "jpg" || ext === "jpeg") && options.jpeg) {
          compressed = await sharp(original)
            .jpeg(options.jpeg)
            .toBuffer();
        }
        if (compressed) {
          img.fileContent = compressed;
        }
      } catch (e) {
        console.warn(`[to-code-taro] 压缩图片失败 ${img.filePath}:`, e);
      }
    }),
  );

  return result;
}
