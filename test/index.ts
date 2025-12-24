import toCodeTaro, { generateTaroProjectJson, generateTaroTempalteJson, generateTaroProject } from '../src/index';
import { runCode } from './runCode';

async function runTest() {
  // 生成模板json文件
  // generateTaroTempalteJson();
  // return

  // 运行代码
  const result = await runCode();
  const projectJson = generateTaroProjectJson(result);
  generateTaroProject(projectJson);
}
// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTest();
}

export { runTest };

