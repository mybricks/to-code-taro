import { parseLooseObject } from './fileNode'

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
  meta?: {
    id: string;
    coms?: Record<string, any>;
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

  // 提取export default defineAppConfig()里的内容
  const content = parseLooseObject(appConfigFile.content.match(/defineAppConfig\(([\s\S]*?)\)/)?.[1] || '{}');

  // 更新 pages 配置（使用 scene id）
  const newPagePaths = normalItems.map((item) => `pages/${item.meta!.id}/index`)
  content.pages = newPagePaths;

  // 提取首页
  let entryPagePath = '';
  normalItems.forEach(item => {
    Object.values(item.meta?.coms)?.forEach(com => {
      if (com?.asRoot && com?.model?.data?.isEntryPagePath) {
        entryPagePath = `pages/${item.meta!.id}/index`;
      }
    })
  })
  if (entryPagePath) {
    content.entryPagePath = entryPagePath;
  }

  // 添加 TabBar 配置（从 items 中读取）
  const tabBarConfigItem = items.find((item) => item.type === 'tabBarConfig');
  if (tabBarConfigItem?.content) {
    const tabBar = parseLooseObject(`{${tabBarConfigItem.content}}`);
    Object.assign(content, tabBar);
  }

  appConfigFile.content = `export default defineAppConfig(${JSON.stringify(content, null, 2)})`;
}

