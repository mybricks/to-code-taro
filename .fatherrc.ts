import { defineConfig } from "father";

export default defineConfig({
  esm: {
    // 排除不打包的目录
    ignores: [
      "test/**",
      "src/_output/**",
      "src/_template/**",
      "src/core/comlib/**",
      "src/core/tools/**"
    ],
  },
  cjs: {
    // 排除不打包的目录
    ignores: [
      "test/**",
      "src/_output/**",
      "src/_template/**",
      "src/core/comlib/**",
      "src/core/tools/**"
    ],
  },
});

