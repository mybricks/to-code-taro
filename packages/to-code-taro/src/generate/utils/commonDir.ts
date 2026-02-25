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

  // 处理 global
  const globalItem = items.find((item) => item.type === 'global');
  if (globalItem) {
    const importCode = globalItem.importManager?.toCode() || '';
    const fileContent = globalItem.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;
    commonDir.children.push({
      path: 'src/common/global.ts',
      content: fullContent,
    });
  }

  // 处理rootConfig
  const rootConfigItem = items.find((item) => item.type === 'rootConfig');
  if (rootConfigItem) {
    const fileContent = rootConfigItem.content || '{}';
    const fullContent = `export default ${fileContent}`;
    commonDir.children.push({
      path: 'src/common/rootConfig.ts',
      content: fullContent,
    });
  }
}

