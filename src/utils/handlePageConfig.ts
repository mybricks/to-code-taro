import toCode from "@mybricks/to-code-react/dist/esm/toCode";
import { generatePageConfigContent, generateTabBarConfigContent, type ImageFileInfo } from "./pageConfig";

/**
 * 处理页面配置的类
 * 负责提取 systemPage 组件数据，生成页面配置和 TabBar 配置
 */
export class HandlePageConfig {
  private globalTabBarConfig: string | null = null;
  private tabBarImageFiles: ImageFileInfo[] = [];

  /**
   * 处理页面配置（提取 systemPage 组件数据）
   * @param scene 场景数据
   * @returns 页面配置内容
   */
  handle(scene: ReturnType<typeof toCode>["scenes"][0]["scene"]): string | undefined {
    // 提取 systemPage 组件数据，生成 pageConfigContent
    let pageConfigContent: string | undefined;
    
    const systemPageCom = Object.values(scene.coms || {}).find((com: any) => {
      return com.def?.namespace === 'mybricks.taro.systemPage';
    });
    
    if (systemPageCom?.model?.data) {
      const systemPageData = systemPageCom.model.data;
      // 生成页面配置
      pageConfigContent = generatePageConfigContent(systemPageData);
      
      // 提取 TabBar 配置（只提取一次，从第一个找到的 systemPage 组件）
      if (!this.globalTabBarConfig && systemPageData.tabBar && Array.isArray(systemPageData.tabBar)) {
        // 使用 tabBar[x].scene.id 作为路径的 id
        const pageIdToPath = (pageId: string) => `pages/${pageId}/index`;
        this.globalTabBarConfig = generateTabBarConfigContent(
          systemPageData.tabBar,
          pageIdToPath,
          this.tabBarImageFiles,
        );
      }
    }

    return pageConfigContent;
  }

  /**
   * 获取全局 TabBar 配置
   */
  getTabBarConfig(): string | null {
    return this.globalTabBarConfig;
  }

  /**
   * 获取 TabBar 图片文件数组
   */
  getTabBarImageFiles(): ImageFileInfo[] {
    return this.tabBarImageFiles;
  }
}
