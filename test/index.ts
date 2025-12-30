import { generateTaroProjectJson } from '../src/index';
import { runCode } from './runCode';
import testData from './test-data.json';

async function runTest() {
  const result = await runCode();
  const projectJson = generateTaroProjectJson(result);
}
// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTest();
}

export { runTest };

