import toCodeTaro, { generateTaroProjectJson, generateTaroTempalteJson, generateTaroProject } from '../src/index';
import { runCode } from './runCode';
import testData from './test-data.json';

async function genTemplate() {
  generateTaroTempalteJson();
}
// 如果直接运行此文件，执行测试
if (require.main === module) {
  genTemplate();
}

export { genTemplate };

