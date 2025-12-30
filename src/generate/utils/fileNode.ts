/**
 * 文件节点相关工具函数
 */

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

/**
 * 查找目录节点
 */
export function findDir(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.children) {
      const found = findDir(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 确保目录存在，如果不存在则创建
 */
export function ensureDir(parentDir: FileNode, dirPath: string): FileNode {
  parentDir.children = parentDir.children || [];
  let dir = parentDir.children.find((node) => node.path === dirPath);
  if (!dir) {
    dir = {
      path: dirPath,
      content: null,
      children: [],
    };
    parentDir.children.push(dir);
  }
  dir.children = dir.children || [];
  return dir;
}

