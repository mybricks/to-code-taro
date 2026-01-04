/**
 * 测试入口文件
 * 
 * 使用方法：
 * 1. 将测试 JSON 数据文件放入此文件夹
 * 2. 导入测试数据
 * 3. 调用 toCodeTaro 函数
 * 4. 运行 npm run test 执行测试
 */

import {toCodeTaro} from '../src/index';
import { convertNamespaceToImportName } from '../src/utils/logic/convertNamespace';

import testData from './test-data.json';

// 示例测试代码
async function runCode() {
  try {
    // 配置 toCodeTaro 的参数
    const config = {
      getComponentMeta: (com: any) => {
        const { namespace = "" } = com.def || {};

        // JS API 组件（以 _ 开头，如 _showToast）
        if (namespace.startsWith("mybricks.taro._")) {
          const importName = convertNamespaceToImportName(namespace);
          return {
            importInfo: {
              name: importName,
              from: "../../core/comlib",
              type: "named" as const,
            },
            name: importName,
            callName: importName,
          };
        }

        // 普通组件：从 namespace 中提取组件名
        const componentName = namespace.split(".").pop() || "Component";
        return {
          importInfo: {
            name: componentName,
            from: "../../components",
            type: "named" as const,
          },
          name: componentName,
          callName: componentName,
        };
      },
      getComponentPackageName: () => "../../core/utils/index",
      getUtilsPackageName: () => "../../core/utils/index",
      getPageId: (id: string) => id,
      getModuleApi: () => ({
        dependencyImport: {
          packageName: "@mybricks/taro-api-todo",
          dependencyNames: ["api"],
          importType: "named" as const,
        },
        componentName: "api",
      }),
      codeStyle: { indent: 2 },
    };

    // 确保测试数据结构完整
    const testDataWithModules = {
      ...testData,
      modules: (testData as any).modules || {},
      frames: (testData as any).frames || [],
    } as any;

    return toCodeTaro(testDataWithModules, config);
  } catch (error) {
    console.error("测试失败:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCode();
}

export { runCode };

