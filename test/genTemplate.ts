import { generateTaroTempalteJson } from '../src/index';

async function genTemplate() {
  generateTaroTempalteJson();
}
// 如果直接运行此文件，执行测试
if (require.main === module) {
  genTemplate();
}

export { genTemplate };

