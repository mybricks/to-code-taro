import * as fs from 'fs';
import * as path from 'path';
import type { ToJSON } from '@mybricks/to-code-react/dist/esm/toCode/types';
import {
  generateTabBarConfig,
  formatTabBarConfigForAppConfig,
} from './utils/generateTabBarConfig';
import { generatePageConfig } from './utils/generatePageConfig';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

interface GenerateItem {
  type: string;
  content?: string;
  cssContent?: string;
  name?: string;
  importManager?: {
    toCode: () => string;
  };
  [key: string]: any;
}

/**
 * 根据数组生成文件结构 JSON 对象
 * @param items 包含 content、cssContent 等信息的数组
 * @param toJson MyBricks toJson 数据（可选，用于生成 TabBar 配置）
 * @returns 返回文件结构的 JSON 对象数组
 */
const generateTaroProjectJson = (
  items: GenerateItem[] = [],
  toJson?: ToJSON,
): FileNode[] => {

  // 读取模板 JSON 文件
  const templateJsonPath = path.join(__dirname, '../_output/taro-template.json');
  if (!fs.existsSync(templateJsonPath)) {
    throw new Error(`模板文件不存在: ${templateJsonPath}`);
  }

  const templateJson: FileNode[] = JSON.parse(
    fs.readFileSync(templateJsonPath, 'utf-8')
  );

  // 找到 pages 目录（用于 push 新页面）
  const findPagesDir = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.path === 'src/pages') {
        return node;
      }
      if (node.children) {
        const found = findPagesDir(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const pagesDir = findPagesDir(templateJson);
  if (!pagesDir) {
    throw new Error('未找到 pages 目录');
  }
  // 如果 pages 目录没有 children，初始化一个空数组
  if (!pagesDir.children) {
    pagesDir.children = [];
  }

  // 创建 common 目录
  const srcDir = templateJson.find((node) => node.path === 'src')!;
  srcDir.children = srcDir.children || [];
  let commonDir = srcDir.children.find((node) => node.path === 'src/common');
  if (!commonDir) {
    commonDir = {
      path: 'src/common',
      content: null,
      children: [],
    };
    srcDir.children.push(commonDir);
  }

  // 创建 assets/tabbar 目录（用于存放 TabBar 图标）
  let assetsDir = srcDir.children.find((node) => node.path === 'src/assets');
  if (!assetsDir) {
    assetsDir = { path: 'src/assets', content: null, children: [] };
    srcDir.children.push(assetsDir);
  }
  assetsDir.children = assetsDir.children || [];
  let tabbarDir = assetsDir.children.find((node) => node.path === 'src/assets/tabbar');
  if (!tabbarDir) {
    tabbarDir = { path: 'src/assets/tabbar', content: null, children: [] };
    assetsDir.children.push(tabbarDir);
  }
  tabbarDir.children = tabbarDir.children || [];

  // 收集需要保存的图片文件
  const imageFiles: Array<{ filePath: string; fileContent: Buffer }> = [];

  // 过滤出类型为 normal 的项
  const normalItems = items.filter((item) => item.type === 'normal');

  // 处理所有 normal 类型的项，生成页面节点数组
  const generatedPages: FileNode[] = normalItems.map((item, index) => {
    // 使用序号作为页面目录名
    const pageName = `page${index + 1}`;

    // 生成完整的文件内容：import 语句 + content
    const importCode = item.importManager?.toCode() || '';
    const fileContent = item.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;

    // 生成 index.config.ts 内容
    const configContent = generatePageConfig(item, toJson);

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

  // 一次性将所有生成的页面添加到 pages 目录的子项后面
  pagesDir.children.push(...generatedPages);

  // 更新 app.config.ts
  const appConfigFile = srcDir.children?.find((node) => node.path === 'src/app.config.ts');
  if (appConfigFile?.content) {
    let content = appConfigFile.content;
    
    // 更新 pages 配置（使用序号）
    const newPagePaths = normalItems.map((_, index) => {
      return `    'pages/page${index + 1}/index'`;
    }).join(',\n');
    content = content.replace(/pages:\s*\[([\s\S]*?)\]/, `pages: [\n${newPagePaths}\n  ]`);

    // 生成并添加 TabBar 配置
    if (toJson) {
      // tabBar 的 pagePath 都指向第一个页面
      const pageIdToPath = (pageId: string): string => {
        return 'pages/page1/index';
      };

      const tabBarConfig = generateTabBarConfig(toJson, pageIdToPath, true, imageFiles);
      if (tabBarConfig) {
        const tabBarConfigStr = formatTabBarConfigForAppConfig(tabBarConfig);
        content = content.replace(/window:\s*\{([\s\S]*?)\n\s*\}/, (match) => `${match},\n${tabBarConfigStr}`);
      }
    }

    appConfigFile.content = content;
  }

  // 将收集到的图片文件添加到项目结构中
  imageFiles.forEach((imageFile) => {
    // 使用完整路径（与 generateTaroProject.ts 的处理逻辑一致）
    tabbarDir.children!.push({
      path: imageFile.filePath,
      content: imageFile.fileContent.toString('base64'),
    });
  });

  // 处理 common 目录下的文件
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

  // TODO: 处理类型为 api 的项，留扩展口子
  // const apiItems = items.filter((item) => item.type === 'api');
  // if (apiItems.length > 0) {
  //   // 扩展点：后续可以在这里处理 api 类型的项
  // }

  // 用于测试：判断文件是否存在，存在则删除，然后写入
  const outputFilePath = path.join(__dirname, '../_output/taro-project.json');
  if (fs.existsSync(outputFilePath)) {
    fs.unlinkSync(outputFilePath);
  }
  fs.writeFileSync(outputFilePath, JSON.stringify(templateJson, null, 2));

  // 返回完整的模板 JSON（包含新添加的页面）
  // console.log(JSON.stringify(templateJson, null, 2));
  return templateJson;
};

export default generateTaroProjectJson;