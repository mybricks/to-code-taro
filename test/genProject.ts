import { generateTaroProjectJson } from '../src/index';
import genFile from './utils/genFile';
import { runCode } from './runCode';
import testData from './test-data.json';

async function genProjectDir() {
  // 运行代码
  const testDataWithModules = {
    ...testData,
    modules: (testData as any).modules || {},
    frames: (testData as any).frames || [],
  } as any;
  
  const result = await runCode();
  const projectJson = generateTaroProjectJson(result);
  genFile(projectJson);
}
// 如果直接运行此文件，执行测试
if (require.main === module) {
  genProjectDir();
}

export { genProjectDir };

