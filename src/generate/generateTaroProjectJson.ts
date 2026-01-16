import * as fs from "fs";
import * as path from "path";
import type { ImageFileInfo } from "../utils/config/content";
import { findDir, ensureDir } from "./utils/fileNode";
import { handleCommonDir } from "./utils/commonDir";
import { handleTabBarImages } from "./utils/tabBarImages";
import { updateAppConfig } from "./utils/appConfig";
import type { GenerationResult, GeneratedFile } from "../toCodeTaro";
import { genScopedJSModules } from "../utils/logic/genJSModules";

interface FileNode {
  path: string;
  content: string | null;
  children?: FileNode[];
}

/**
 * 根据数组生成文件结构 JSON 对象
 * @param result 包含 files 和 assets 的生成结果对象
 * @returns 返回文件结构的 JSON 对象数组
 */
const generateTaroProjectJson = (result: GenerationResult): FileNode[] => {
  const { files = [], assets = {} } = result;

  // 读取模板 JSON 文件
  const templateJsonPath = path.join(__dirname, "../taro-template.json");
  if (!fs.existsSync(templateJsonPath)) {
    throw new Error(`模板文件不存在: ${templateJsonPath}`);
  }

  const templateJson: FileNode[] = JSON.parse(
    fs.readFileSync(templateJsonPath, "utf-8"),
  );

  // 找到 src 目录
  const srcDir = templateJson.find((node) => node.path === "src")!;
  srcDir.children = srcDir.children || [];

  // 找到 pages 目录
  const pagesDir = findDir(templateJson, "src/pages");
  if (!pagesDir) {
    throw new Error("未找到 pages 目录");
  }
  pagesDir.children = pagesDir.children || [];

  // 确保 common 目录存在
  const commonDir = ensureDir(srcDir, "src/common");

  // 确保 assets/tabbar 目录存在
  const assetsDir = ensureDir(srcDir, "src/assets");
  const tabbarDir = ensureDir(assetsDir, "src/assets/tabbar");

  // 从 assets 中获取 TabBar 图片文件信息
  const imageFiles: ImageFileInfo[] = assets.tabBarImages || [];

  // 过滤出类型为 normal 的项
  const normalItems = files.filter((item) => item.type === "normal");

  // 处理所有 normal 类型的项，生成页面节点数组
  const generatedPages: FileNode[] = normalItems.map((item) => {
    const pageName = item.meta!.id;

    // 生成完整的文件内容：import 语句 + content
    const importCode = item.importManager?.toCode() || "";
    const fileContent = item.content || "";
    const fullContent = importCode
      ? `${importCode}\n${fileContent}`
      : fileContent;

    // 使用 item 中的 pageConfigContent，如果没有则使用默认配置
    const configContent =
      item.pageConfigContent ||
      `export default definePageConfig({
  navigationBarTitleText: '页面'
})`;

    // 固定生成三个文件节点
    const pageChildren: FileNode[] = [
      {
        path: `src/pages/${pageName}/index.config.ts`,
        content: configContent,
      },
      {
        path: `src/pages/${pageName}/index.global.less`,
        content: item.cssContent || "",
      },
      {
        path: `src/pages/${pageName}/index.tsx`,
        content: fullContent,
      },
    ];
    // 生成页面级 jsModules（如果有 JS 计算组件）
    if (item.jsModules && item.jsModules.length > 0) {
      pageChildren.push({
        path: `src/pages/${pageName}/index.jsModules.ts`,
        content: genScopedJSModules(
          item.jsModules as any,
          "../../core/mybricks/index",
          "../../common/jsModulesRuntime",
        ),
      });
    }

    // 返回页面目录节点
    return {
      path: `src/pages/${pageName}`,
      content: null,
      children: pageChildren,
    };
  });

  // 一次性将所有生成的页面添加到 pages 目录
  pagesDir.children.push(...generatedPages);

  // --- 处理弹窗场景 (popup) ---
  const popupComponentsDir = ensureDir(srcDir, "src/popupComponents");
  const popupScenes = files.filter((item) => item.type === "popup" && item.meta);

  popupScenes.forEach((item) => {
    const popupId = item.meta!.id;
    const importCode = item.importManager?.toCode() || "";
    const fullContent = `${importCode}\n${item.content || ""}`;

    const popupChildren: FileNode[] = [
      {
        path: `src/popupComponents/${popupId}/index.tsx`,
        content: fullContent,
      },
      {
        path: `src/popupComponents/${popupId}/index.global.less`,
        content: item.cssContent || "",
      },
    ];

    if (item.jsModules && item.jsModules.length > 0) {
      popupChildren.push({
        path: `src/popupComponents/${popupId}/index.jsModules.ts`,
        content: genScopedJSModules(
          item.jsModules as any,
          "../../core/mybricks/index",
          "../../common/jsModulesRuntime",
        ),
      });
    }

    popupComponentsDir.children!.push({
      path: `src/popupComponents/${popupId}`,
      content: null,
      children: popupChildren,
    });
  });

  // 更新 app.config.ts (只传入 normalItems 作为真正的页面)
  const appConfigFile = srcDir.children?.find(
    (node) => node.path === "src/app.config.ts",
  );
  if (appConfigFile) {
    updateAppConfig(appConfigFile, normalItems, files);
  }

  // 处理 TabBar 图片文件
  handleTabBarImages(tabbarDir, imageFiles);

  // 替换自定义 Tabbar 配置文件
  const CUSTOM_TAB_BAR_CONFIG_PATH = "src/custom-tab-bar/mybricks/tabbar-config.ts"
  const customTabBarItem = files.find((item) => item.type === 'customTabBar');
  if (customTabBarItem?.content) {
    const customTabBarDir = ensureDir(srcDir, "src/custom-tab-bar");
    const mybricksDir = ensureDir(customTabBarDir, "src/custom-tab-bar/mybricks");
    const tabbarConfigFileIndex = mybricksDir.children?.findIndex(
      (node) => node.path === CUSTOM_TAB_BAR_CONFIG_PATH,
    );
    if (tabbarConfigFileIndex === -1) {
      mybricksDir.children!.push({
        path: CUSTOM_TAB_BAR_CONFIG_PATH,
        content: customTabBarItem.content,
      })
    } else {
      mybricksDir.children[tabbarConfigFileIndex].content = customTabBarItem.content;
    }
  }

  // 处理 common 目录下的文件
  handleCommonDir(commonDir, files);

  // 处理 popup 汇总文件 (type 为 popup 且无 meta)
  const popupFile = files.find((f) => f.type === "popup" && !f.meta);
  if (popupFile) {
    commonDir.children!.push({
      path: `src/common/${popupFile.name}.ts`,
      content: popupFile.content,
    });
  }

  return templateJson;
};

export default generateTaroProjectJson;
