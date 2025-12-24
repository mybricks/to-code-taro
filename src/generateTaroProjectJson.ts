import * as fs from 'fs';
import * as path from 'path';

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
 * @returns 返回文件结构的 JSON 对象数组
 */
const generateTaroProjectJson = (items: GenerateItem[] = []): FileNode[] => {

  // 读取模板 JSON 文件
  const templateJsonPath = path.join(__dirname, '_output/taro-template.json');
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
  if (!pagesDir || !pagesDir.children) {
    throw new Error('未找到 pages 目录');
  }

  // 过滤出类型为 normal 的项
  const normalItems = items.filter((item) => item.type === 'normal');

  // 处理所有 normal 类型的项，生成页面节点数组
  const generatedPages: FileNode[] = normalItems.map((item, index) => {
    const pageName = `page${index + 1}`;

    // 生成完整的文件内容：import 语句 + content
    const importCode = item.importManager?.toCode() || '';
    const fileContent = item.content || '';
    const fullContent = importCode ? `${importCode}\n${fileContent}` : fileContent;

    // 固定生成三个文件节点
    const pageChildren: FileNode[] = [
      {
        path: `src/pages/${pageName}/index.config.ts`,
        content: '',
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

  // 找到 app.config.ts 文件并更新 pages 配置（在 src 目录的第一层）
  const srcDir = templateJson.find((node) => node.path === 'src');
  const appConfigFile = srcDir?.children?.find((node) => node.path === 'src/app.config.ts');
  
  if (appConfigFile && appConfigFile.content) {
    // 提取现有的 pages 数组内容
    const content = appConfigFile.content;
    // 匹配 pages: [ ... ] 中的内容
    const pagesMatch = content.match(/pages:\s*\[([\s\S]*?)\]/);
    
    if (pagesMatch) {
      // 生成新的页面路径数组（格式：pages/page1/index, pages/page2/index 等）
      const newPagePaths = normalItems.map((_, index) => {
        const pageName = `page${index + 1}`;
        return `    'pages/${pageName}/index'`;
      }).join(',\n');

      // 更新 content，在原有 pages 后面添加新页面
      const existingPages = pagesMatch[1].trim();
      const updatedPages = existingPages 
        ? `${existingPages},\n${newPagePaths}`
        : newPagePaths;
      
      appConfigFile.content = content.replace(
        /pages:\s*\[([\s\S]*?)\]/,
        `pages: [\n${updatedPages}\n  ]`
      );
    }
  }

  // TODO: 处理类型为 api 的项，留扩展口子
  // const apiItems = items.filter((item) => item.type === 'api');
  // if (apiItems.length > 0) {
  //   // 扩展点：后续可以在这里处理 api 类型的项
  // }

  // 用于测试：判断文件是否存在，存在则删除，然后写入
  const outputFilePath = path.join(__dirname, '_output/taro-project.json');
  if (fs.existsSync(outputFilePath)) {
    fs.unlinkSync(outputFilePath);
  }
  fs.writeFileSync(outputFilePath, JSON.stringify(templateJson, null, 2));

  // 返回完整的模板 JSON（包含新添加的页面）
  // console.log(JSON.stringify(templateJson, null, 2));
  return templateJson;
};

export default generateTaroProjectJson;