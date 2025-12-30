/**
 * app.config.ts 更新工具
 */

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

interface GenerateItem {
  type: string;
  tabBarConfig?: string;
  meta?: {
    id: string;
  };
  [key: string]: any;
}

/**
 * 更新 app.config.ts
 */
export function updateAppConfig(
  appConfigFile: FileNode,
  normalItems: GenerateItem[],
  items: GenerateItem[],
): void {
  if (!appConfigFile.content) {
    return;
  }

  let content = appConfigFile.content;

  // 更新 pages 配置（使用 scene id）
  const newPagePaths = normalItems
    .map((item) => `    'pages/${item.meta!.id}/index'`)
    .join(',\n');
  content = content.replace(/pages:\s*\[([\s\S]*?)\]/, `pages: [\n${newPagePaths}\n  ]`);

  // 添加 TabBar 配置（从 items 中读取）
  const tabBarConfigItem = items.find((item) => item.type === 'tabBarConfig');
  if (tabBarConfigItem?.tabBarConfig) {
    content = content.replace(
      /window:\s*\{([\s\S]*?)\n\s*\}/,
      (match) => `${match},\n${tabBarConfigItem.tabBarConfig}`,
    );
  }

  appConfigFile.content = content;
}

