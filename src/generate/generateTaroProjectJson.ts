import * as fs from 'fs';
import * as path from 'path';
import type { ImageFileInfo } from '../utils/pageConfig';
import { findDir, ensureDir } from './utils/fileNode';
import { handleCommonDir } from './utils/commonDir';
import { handleTabBarImages } from './utils/tabBarImages';
import { updateAppConfig } from './utils/appConfig';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

interface GenerateItem {
  type: string;
  content?: string;
  cssContent?: string;
  pageConfigContent?: string; // 页面配置内容
  name?: string;
  importManager?: {
    toCode: () => string;
  };
  tabBarConfig?: string; // TabBar 配置内容
  [key: string]: any;
}

/**
 * 根据数组生成文件结构 JSON 对象
 * @param items 包含 content、cssContent、pageConfigContent、tabBarConfig 等信息的数组
 * @returns 返回文件结构的 JSON 对象数组
 */
const generateTaroProjectJson = (
  items: GenerateItem[] = [],
): FileNode[] => {
  // 读取模板 JSON 文件
  const templateJsonPath = path.join(__dirname, '../taro-template.json');
  if (!fs.existsSync(templateJsonPath)) {
    throw new Error(`模板文件不存在: ${templateJsonPath}`);
  }

  const templateJson: FileNode[] = JSON.parse(
    fs.readFileSync(templateJsonPath, 'utf-8')
  );

  // 找到 src 目录
  const srcDir = templateJson.find((node) => node.path === 'src')!;
  srcDir.children = srcDir.children || [];

  // 找到 pages 目录
  const pagesDir = findDir(templateJson, 'src/pages');
  if (!pagesDir) {
    throw new Error('未找到 pages 目录');
  }
  pagesDir.children = pagesDir.children || [];

  // 确保 common 目录存在
  const commonDir = ensureDir(srcDir, 'src/common');

  // 确保 assets/tabbar 目录存在
  const assetsDir = ensureDir(srcDir, 'src/assets');
  const tabbarDir = ensureDir(assetsDir, 'src/assets/tabbar');

  // 从 items 的扩展字段中获取 TabBar 图片文件信息
  const imageFiles: ImageFileInfo[] = (items as any).__tabBarImageFiles || [];

  // 过滤出类型为 normal 的项
  const normalItems = items.filter((item) => item.type === 'normal');

  // 处理所有 normal 类型的项，生成页面节点数组
  const generatedPages: FileNode[] = normalItems.map((item) => {
    const pageName = item.meta!.id;

    // 生成完整的文件内容：import 语句 + content
    const importCode = item.importManager?.toCode() || '';
    const fileContent = item.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;

    // 使用 item 中的 pageConfigContent，如果没有则使用默认配置
    const configContent = item.pageConfigContent || `export default definePageConfig({
  navigationBarTitleText: '页面'
})`;

    // 固定生成三个文件节点
    const pageChildren: FileNode[] = [
      {
        path: `src/pages/${pageName}/index.config.ts`,
        content: configContent,
      },
      {
        path: `src/pages/${pageName}/index.less`,
        content: item.cssContent || '',
      },
      {
        path: `src/pages/${pageName}/index.tsx`,
        content: fullContent,
      },
    ];

    // 返回页面目录节点
    return {
      path: `src/pages/${pageName}`,
      content: null,
      children: pageChildren,
    };
  });

  // 一次性将所有生成的页面添加到 pages 目录
  pagesDir.children.push(...generatedPages);

  // 更新 app.config.ts
  const appConfigFile = srcDir.children?.find((node) => node.path === 'src/app.config.ts');
  if (appConfigFile) {
    updateAppConfig(appConfigFile, normalItems, items);
  }

  // 处理 TabBar 图片文件
  handleTabBarImages(tabbarDir, imageFiles);

  // 处理 common 目录下的文件
  handleCommonDir(commonDir, items);

  return templateJson;
};

export default generateTaroProjectJson;
