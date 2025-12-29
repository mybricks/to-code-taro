import type { ToJSON } from '@mybricks/to-code-react/dist/esm/toCode/types';
import type { TaroTabBarConfig } from '../../utils/tabbar/types';
import { convertToTaroTabBarConfig, getEntryPageId } from '../../utils/tabbar';
import { processTabBarIcon } from './saveBase64Image';

/**
 * 图片文件信息
 */
export interface ImageFileInfo {
  filePath: string;
  fileContent: Buffer;
}

/**
 * TabBar 配置生成器
 * 负责从 toJson 中提取并生成 TabBar 配置
 */

/**
 * 从场景中提取 tabbar 数据
 * 优先从 toJson.tabbar 获取，如果没有则从 scenes 中的 systemPage 组件中提取
 */
function extractTabBarFromToJson(toJson: ToJSON): any[] | undefined {
  // 优先从根级别获取
  if ((toJson as any).tabbar && Array.isArray((toJson as any).tabbar)) {
    return (toJson as any).tabbar;
  }

  // 如果没有，从 scenes 中的 systemPage 组件中提取
  if (toJson.scenes && Array.isArray(toJson.scenes)) {
    for (const scene of toJson.scenes) {
      if (scene.coms) {
        // 查找 systemPage 组件
        const systemPageCom = Object.values(scene.coms).find((com: any) => {
          return com.def?.namespace === 'mybricks.taro.systemPage'
        });

        if (systemPageCom?.model?.data?.tabBar && Array.isArray(systemPageCom.model.data.tabBar)) {
          return systemPageCom.model.data.tabBar;
        }
      }
    }
  }

  return undefined;
}

/**
 * 从 toJson 中生成 TabBar 配置
 * @param toJson MyBricks toJson 数据
 * @param pageIdToPath 页面 ID 到路径的映射函数
 * @param processBase64Icons 是否处理 base64 图标（默认 true）
 * @param imageFiles 用于收集需要保存的图片文件的数组（可选）
 * @returns Taro TabBar 配置，如果验证失败则返回 null
 */
export function generateTabBarConfig(
  toJson: ToJSON,
  pageIdToPath?: (pageId: string) => string,
  processBase64Icons: boolean = true,
  imageFiles?: ImageFileInfo[],
): TaroTabBarConfig | null {
  const tabBar = extractTabBarFromToJson(toJson);
  
  // 转换为 Taro 配置格式
  // 如果启用 base64 处理，传入 processTabBarIcon 函数
  const iconProcessor = processBase64Icons
    ? (iconPath: string | undefined, index: number, type: 'normal' | 'selected') =>
        processTabBarIcon(iconPath, index, type, imageFiles)
    : undefined;
  return convertToTaroTabBarConfig(tabBar, pageIdToPath, iconProcessor);
}

/**
 * 获取入口页面 ID
 * @param toJson MyBricks toJson 数据
 * @param defaultEntryPageId 默认入口页面 ID
 * @returns 入口页面 ID
 */
export function getTabBarEntryPageId(
  toJson: ToJSON,
  defaultEntryPageId?: string,
): string | null {
  const tabBar = (toJson as any).tabbar;
  return getEntryPageId(tabBar, defaultEntryPageId);
}

/**
 * 将 TabBar 配置转换为 app.config.ts 中的字符串格式
 * @param config TabBar 配置
 * @param indent 缩进字符串，默认为 2 个空格
 * @returns 配置字符串
 */
export function formatTabBarConfigForAppConfig(
  config: TaroTabBarConfig,
  indent: string = '  ',
): string {
  const lines: string[] = [];
  lines.push(`${indent}tabBar: {`);

  // 添加颜色配置（如果存在）
  if (config.color) {
    lines.push(`${indent}  color: '${config.color}',`);
  }
  if (config.selectedColor) {
    lines.push(`${indent}  selectedColor: '${config.selectedColor}',`);
  }
  if (config.backgroundColor) {
    lines.push(`${indent}  backgroundColor: '${config.backgroundColor}',`);
  }
  if (config.borderStyle) {
    lines.push(`${indent}  borderStyle: '${config.borderStyle}',`);
  }

  // 添加 list 配置
  lines.push(`${indent}  list: [`);
  config.list.forEach((item, index) => {
    const isLast = index === config.list.length - 1;
    lines.push(`${indent}    {`);
    lines.push(`${indent}      pagePath: '${item.pagePath}',`);
    lines.push(`${indent}      text: '${item.text}',`);
    if (item.iconPath) {
      lines.push(`${indent}      iconPath: '${item.iconPath}',`);
    }
    if (item.selectedIconPath) {
      lines.push(`${indent}      selectedIconPath: '${item.selectedIconPath}',`);
    }
    lines.push(`${indent}    }${isLast ? '' : ','}`);
  });
  lines.push(`${indent}  ]`);
  lines.push(`${indent}}`);

  return lines.join('\n');
}

