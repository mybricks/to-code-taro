import * as fs from 'fs';
import * as path from 'path';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

/**
 * 根据 JSON 结构生成项目文件和目录
 * @param projectJson 项目文件结构 JSON 数组
 * @param outputDir 输出目录路径，默认为 _output/project 目录
 */
const genFile = (
  projectJson: FileNode[],
  outputDir: string = path.join(__dirname, '../../src/_output/project')
) => {
  /**
   * 递归处理文件节点
   * @param node 文件或目录节点
   * @param baseDir 基础目录路径（所有 path 都相对于此目录）
   */
  const processNode = (node: FileNode, baseDir: string) => {
    const nodePath = path.join(baseDir, node.path);

    if (node.content === null) {
      // 目录节点：创建目录并递归处理子节点
      if (!fs.existsSync(nodePath)) {
        fs.mkdirSync(nodePath, { recursive: true });
      }

      // 递归处理子节点（子节点的 path 也是完整路径，使用相同的 baseDir）
      if (node.children) {
        node.children.forEach((child) => {
          processNode(child, baseDir);
        });
      }
    } else {
      // 文件节点：确保目录存在并写入文件
      const fileDir = path.dirname(nodePath);
      
      // 确保父目录存在
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // 判断是否为 base64 编码的二进制文件（图片等）
      // 如果 content 是 base64 字符串且路径是图片文件，则按二进制写入
      // 写入文件内容（文本文件）
      fs.writeFileSync(nodePath, node.content, 'utf-8');
    }
  };

  // 如果输出目录存在则删除
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // 创建输出目录
  fs.mkdirSync(outputDir, { recursive: true });

  // 处理所有根节点
  projectJson.forEach((node) => {
    processNode(node, outputDir);
  });
};

export default genFile;