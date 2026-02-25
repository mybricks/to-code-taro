/**
 * 更新自定义 TabBar 配置文件
 */

import { GeneratedFile } from '../../toCodeTaro'
import { ensureDir } from './fileNode'
import { parseLooseObject } from './fileNode'

interface FileNode {
  path: string
  content: string | null
  children?: FileNode[]
}

export function updateCustomTabBar(srcDir: FileNode, files: GeneratedFile[]) {
  const customTabBarDir = ensureDir(srcDir, 'src/custom-tab-bar')

  // 将mybricks的tabbar数据写入/custom-tab-bar/mybricks/tabbar-config.ts
  const customTabBarItem = files.find((item) => item.type === 'customTabBar')
  if (customTabBarItem?.content) {
    const CUSTOM_TAB_BAR_CONFIG_PATH =
      'src/custom-tab-bar/mybricks/tabbar-config.ts'
    const mybricksDir = ensureDir(
      customTabBarDir,
      'src/custom-tab-bar/mybricks',
    )
    const tabbarConfigFileIndex = mybricksDir.children?.findIndex(
      (node) => node.path === CUSTOM_TAB_BAR_CONFIG_PATH,
    )
    if (tabbarConfigFileIndex === -1) {
      mybricksDir.children!.push({
        path: CUSTOM_TAB_BAR_CONFIG_PATH,
        content: customTabBarItem.content,
      })
    } else {
      mybricksDir.children[tabbarConfigFileIndex].content =
        customTabBarItem.content
    }
  }

  // 将app.config.ts中的tabbar配置写入/custom-tab-bar/tabBar.json
  // 后续可以用来判断页面是否标签页
  const tabBarConfigItem = files.find((item) => item.type === 'tabBarConfig')
  if (tabBarConfigItem?.content) {
    const contentStr = JSON.stringify(
      parseLooseObject(`{${tabBarConfigItem.content}}`),
      null,
      2,
    )
    const tabBarJsonPath = `${customTabBarDir.path}/tabBar.json`
    const tabBarJsonIndex = customTabBarDir.children?.findIndex(
      (node) => node.path === tabBarJsonPath,
    )
    if (tabBarJsonIndex === -1) {
      customTabBarDir.children!.push({
        path: tabBarJsonPath,
        content: contentStr,
      })
    } else {
      customTabBarDir.children[tabBarJsonIndex].content = contentStr
    }
  }
}
