/**
 * 由于本仓库以生成代码为主，运行时依赖由宿主项目提供，
 * 这里补充最小化的模块声明以避免编辑器/类型检查报错。
 */

declare module '@tarojs/taro' {
  const Taro: any;
  export default Taro;
}

declare module '@tarojs/components' {
  export const View: any;
  export const Text: any;
  export const Image: any;
  export const Button: any;
  const components: any;
  export default components;
}


