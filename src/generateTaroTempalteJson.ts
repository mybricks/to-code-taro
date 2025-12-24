import * as fs from 'fs';
import * as path from 'path';

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

interface TemplateJson {
  rootDir: string;
  files: FileNode[];
}


const _templateDir = path.join(__dirname, 'template');

/**
 * 递归遍历目录并生成文件树结构
 * @param templateDir 模板目录路径，默认为当前文件所在目录下的 template 目录
 */
const generateTaroTemplateJson = (templateDir: string = _templateDir): TemplateJson => {
  const rootDir = path.basename(templateDir);
  const files: FileNode[] = [];

  // 需要忽略的目录和文件
  const ignoreList = [
    'node_modules',
    'dist',
    '.git',
    '.husky',
    '.swc',
    'yarn.lock',
    'package-lock.json',
  ];

  /**
   * 递归读取目录
   */
  const readDirectory = (dirPath: string, relativePath: string = ''): FileNode[] => {
    const items: FileNode[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // 按名称排序，目录在前
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      // 跳过忽略列表中的项
      if (ignoreList.includes(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const itemRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        // 递归读取子目录
        const children = readDirectory(fullPath, itemRelativePath);
        items.push({
          path: itemRelativePath,
          content: null,
          children: children.length > 0 ? children : undefined,
        });
      } else {
        // 读取文件内容
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          items.push({
            path: itemRelativePath,
            content,
            children: undefined,
          });
        } catch (error) {
          // 如果读取失败（如二进制文件），内容设为空字符串
          items.push({
            path: itemRelativePath,
            content: '',
            children: undefined,
          });
        }
      }
    }

    return items;
  };

  files.push(...readDirectory(templateDir));
  // console.log(files);

  // 写入 JSON 文件，如果已存在则先删除
  const jsonFilePath = path.join(__dirname, './_output/taro-template.json');
  if (fs.existsSync(jsonFilePath)) {
    fs.unlinkSync(jsonFilePath);
  }
  fs.writeFileSync(jsonFilePath, JSON.stringify(files, null, 2));

  return {
    rootDir,
    files,
  };
};

export default generateTaroTemplateJson;