/**
 * 测试入口文件
 * 
 * 使用方法：
 * 1. 将测试 JSON 数据文件放入此文件夹
 * 2. 导入测试数据
 * 3. 调用 toCodeTaro 函数
 * 4. 运行 npm run test 执行测试
 */

import toCodeTaro from '../src/index';
import { convertNamespaceToImportName } from '../src/utils/convertNamespace';

import testData from './test-data.json';

// 示例测试代码
async function runCode() {
  try {
    // 配置 toCodeTaro 的参数
    const config = {
      getComponentMeta: (com: any, configMeta?: any) => {
        // 根据组件的 namespace 返回对应的元数据
        const namespace = com.def?.namespace || '';
        const rtType = com.def?.rtType || '';
        
        // JS 类型组件（_showToast、_scan-qrcode、_setStorage 等）
        const isJsComponent = rtType?.match(/^js/gi);
        const isJsApiComponent = namespace.startsWith('mybricks.taro._');
        
        if (isJsApiComponent) {
          // 转换为导入名：mybricks.taro._showToast -> mybricks_taro__showToast
          const importName = convertNamespaceToImportName(namespace);
          return {
            importInfo: {
              name: importName,
              from: '../../core/comlib',
              type: 'named' as const,
            },
            name: importName,
            callName: importName,
          };
        }
        
        // 普通组件：从 namespace 中提取组件名（取最后一部分）
        const componentName = namespace.split('.').pop() || 'Component';
        
        // 创建组件元数据对象
        const createMeta = (name: string) => ({
          importInfo: {
            name,
            from: '../../components',
            type: 'named' as const,
          },
          name,
          callName: name,
        });
        
        // 以下划线开头的组件（如 _muilt-inputJs）在 handleProcess 中会有特殊处理
        return createMeta(componentName);
      },
      getComponentPackageName: () => '../../core/utils/ComContext',
      getUtilsPackageName: () => '../../core/utils/index',
      getPageId: (id: string) => id,
      getModuleApi: () => ({
        dependencyImport: {
          packageName: '@mybricks/taro-api-todo',
          dependencyNames: ['api'],
          importType: 'named' as const,
        },
        componentName: 'api',
      }),
      codeStyle: {
        indent: 2,
      },
    };

    // 确保测试数据符合 ToJSON 类型要求
    const testDataWithModules = {
      ...testData,
      modules: (testData as any).modules || {},
      frames: (testData as any).frames || [],
    } as any;

    const result = toCodeTaro(testDataWithModules, config);

    // console.log(result);
    // console.log(JSON.stringify(result, null, 2));

    // // 输出生成的代码
    result.forEach((file) => {
      // console.log(`\n=== ${file.name} (${file.type}) ===`);
      // console.log('==== Import Manager ====');
      // console.log(file.importManager.toCode());
      
      // 如果是 jsModules 类型，打印其内容
      // if (file.type === 'jsModules') {
      //   console.log('\n==== JSModules Content ====');
      //   console.log(file.content);
      // } else {
      //   console.log('file.content====',file.content);
      // }
      
      // if (file.cssContent) {
      //   console.log('\n--- CSS Content ---');
      //   console.log(file.cssContent);
      // }
    });
    return result;
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCode();
}

export { runCode };

