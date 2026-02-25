/**
 * 页面图片文件处理工具
 */
import type { ImageFileInfo } from '../../utils/config/content';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

/**
 * 处理页面 base64 图片文件
 */
export function handlePageImages(
  assetsDir: FileNode,
  imageFiles: ImageFileInfo[],
): void {
  imageFiles.forEach((imageFile) => {
    assetsDir.children!.push({
      path: imageFile.filePath,
      content: imageFile.fileContent.toString('base64'),
    });
  });
}

