import { defineConfig } from "father";

export default defineConfig({
  esm: {
    // 排除不打包的目录
    ignores: [
      "test/**",
      "src/_output/**",
      "src/_template/**",
    ],
  },
  cjs: {
    // 排除不打包的目录
    ignores: [
      "test/**",
      "src/_output/**",
      "src/_template/**",
    ],
  },
});

