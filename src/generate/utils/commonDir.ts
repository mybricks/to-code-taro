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

  // 处理 jsModulesRuntime
  const jsModulesRuntimeItem = items.find((item) => item.type === 'jsModulesRuntime');
  if (jsModulesRuntimeItem) {
    const importCode = jsModulesRuntimeItem.importManager?.toCode() || '';
    const fileContent = jsModulesRuntimeItem.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;
    commonDir.children.push({
      path: 'src/common/jsModulesRuntime.ts',
      content: fullContent,
    });
  }
}

