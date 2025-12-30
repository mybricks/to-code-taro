/**
 * Common 目录处理工具
 */

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

interface GenerateItem {
  type: string;
  content?: string;
  importManager?: {
    toCode: () => string;
  };
  [key: string]: any;
}

/**
 * 处理 common 目录下的文件
 */
export function handleCommonDir(commonDir: FileNode, items: GenerateItem[]): void {
  commonDir.children = commonDir.children || [];

  // 处理 jsModules
  const jsModulesItem = items.find((item) => item.type === 'jsModules');
  if (jsModulesItem) {
    const importCode = jsModulesItem.importManager?.toCode() || '';
    const fileContent = jsModulesItem.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;
    commonDir.children.push({
      path: 'src/common/jsModules.ts',
      content: fullContent,
    });
  }

  // 处理 commonIndex
  const commonIndexItem = items.find((item) => item.type === 'commonIndex');
  if (commonIndexItem) {
    commonDir.children.push({
      path: 'src/common/index.ts',
      content: commonIndexItem.content || '',
    });
  }
}

