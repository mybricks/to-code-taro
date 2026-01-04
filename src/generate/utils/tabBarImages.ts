/**
 * TabBar 图片文件处理工具
 */

import type { ImageFileInfo } from '../../utils/config/content';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

/**
 * 处理 TabBar 图片文件
 */
export function handleTabBarImages(
  tabbarDir: FileNode,
  imageFiles: ImageFileInfo[],
): void {
  imageFiles.forEach((imageFile) => {
    tabbarDir.children!.push({
      path: imageFile.filePath,
      content: imageFile.fileContent.toString('base64'),
    });
  });
}

