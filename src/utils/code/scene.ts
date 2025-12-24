import { indentation } from "../index";

/** 生成响应式 data 管理器 */
export const genReactiveDataManager = (indent: string, utilsPackageName: string) => {
  return ``;
};

/** 生成根组件定义代码 (useAppContext) */
export const genRootDefineCode = (indent: string, utilsPackageName: string) => {
  // 使用 useAppContext 获取 comRefs，不再需要 controllers, inputs, outputs
  return `${indent}const {comRefs} = useAppContext();\n`;
};

/** 生成普通插槽定义代码 */
export const genSlotDefineCode = (indent: string) => {
  // 插槽内部也使用 useAppContext
  return `${indent}const {comRefs} = useAppContext();\n`;
};

/** 生成控制器初始化代码 */
export const genControllerInitCode = (indent: string, providerName: string) => {
  return `${indent}if (!controllers.current.${providerName}) controllers.current.${providerName} = {};\n`;
};

/** 生成完整的函数组件模板 */
export const genComponentTemplate = ({
  componentName,
  combinedJsCode,
  uiResult,
  outputsConfig,
  scopeName,
  utilsPackageName,
}: {
  componentName: string;
  combinedJsCode: string;
  uiResult: string;
  outputsConfig?: Record<string, Record<string, any>>;
  scopeName?: string;
  utilsPackageName?: string;
}) => {
  // 使用 WithWrapper 作为高阶组件包裹根组件
  // 格式：export default WithWrapper(ComponentName)
  return `function ${componentName}() {\n` +
         `${combinedJsCode}\n` +
         `  return (\n` +
         `${uiResult.split('\n').map(line => `    ${line}`).join('\n')}\n` +
         `  );\n` +
         `}\n\n` +
         `export default WithWrapper(${componentName})`;
};

/** 生成 useEffect 包装代码 */
export const wrapInEffect = (indent: string, effectCode: string) => {
  return `\n${indent}useEffect(() => {\n${indent}  /** 场景/组件初始化逻辑 */${effectCode}\n${indent}}, []);\n`;
};

