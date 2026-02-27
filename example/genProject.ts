import { generateTaroProjectJson, compressImages } from '../packages/to-code-taro/src/index';
import genFile from './utils/genFile';
import { runCode } from './runCode';

async function genProjectDir() {
  const result = await runCode();
  const compressed = await compressImages(result, {
    png: { compressionLevel: 9, palette: true, effort: 10 },
    jpeg: { quality: 80 },
  });

  const projectJson = generateTaroProjectJson(compressed);
  genFile(projectJson);
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  genProjectDir();
}

export { genProjectDir };

