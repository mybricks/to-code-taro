import { defineConfig } from "father";

export default defineConfig({
  esm: {
    ignores: [
      "src/_output/**",
      "src/_template/**",
    ],
  },
  cjs: {
    ignores: [
      "src/_output/**",
      "src/_template/**",
    ],
  },
});

