import { indentation } from "../index";

/** 生成响应式 data 管理器 */
export const genReactiveDataManager = (indent: string, utilsPackageName: string) => {
  return ``;
};

/** 生成根组件定义代码 (useAppContext) */
export const genRootDefineCode = (indent: string, utilsPackageName: string, hasJsModules: boolean = false, isModule: boolean = false) => {
  // 使用 useAppContext 获取 comRefs / $vars / $fxs / appContext
  let code = isModule
    ? `${indent}const {comRefs, $vars, $fxs, appContext, moduleOutputs} = useAppContext();\n`
    : `${indent}const {comRefs, $vars, $fxs, appContext} = useAppContext();\n`;
  if (!isModule) {
    code += `${indent}usePageLife();\n`;
  }
  // 如果有 JS 计算组件，需要初始化 comModules
  if (hasJsModules) {
    code += `${indent}const comModules = jsModules({ createJSHandle });\n`;
  }
  return code;
};

/** 生成普通插槽定义代码 */
export const genSlotDefineCode = (indent: string) => {
  return `${indent}const { comRefs, $vars, $fxs, appContext, moduleOutputs } = useAppContext();\n`;
};

/** 生成控制器初始化代码 */
export const genControllerInitCode = (indent: string, providerName: string) => {
  return `${indent}if (!controllers.current.${providerName}) controllers.current.${providerName} = {};\n`;
};

/** 生成完整的函数组件模板 */
export const genComponentTemplate = ({
  componentId,
  componentName,
  combinedJsCode,
  renderDefinitions = "", // 新增：外部定义的渲染函数
  uiResult,
  outputsConfig,
  scopeName,
  utilsPackageName,
  isPopup = false,
  hasPopups = false,
}: {
  componentId: string;
  componentName: string;
  combinedJsCode: string;
  renderDefinitions?: string;
  uiResult: string;
  outputsConfig?: Record<string, Record<string, any>>;
  scopeName?: string;
  utilsPackageName?: string;
  isPopup?: boolean;
  hasPopups?: boolean;
}) => {
  // 页面级 scope：用于让插槽读取页面 hooks/state（通过 usePageScope）
  // - value 默认传 ref（稳定引用，不触发额外重渲染）
  // - slot 内可直接 usePageScope() 访问
  const pageScopeCode =
    `const PageScopeContext = createContext<any>(null);\n` +
    `function usePageScope<T = any>() {\n` +
    `  return useContext(PageScopeContext) as T;\n` +
    `}\n\n`;

  // 渲染定义放在组件外部，保持引用稳定
  let code = `${pageScopeCode}${renderDefinitions}\n` +
         `function ${componentName}() {\n` +
         `  // 页面级 scope：你可以把 useState/useMemo 的结果放到这个 ref 上，让插槽读取\n` +
         `  const pageScopeRef = useRef<any>({});\n` +
         `${combinedJsCode}\n` +
         `  return (\n` +
         `    <PageScopeContext.Provider value={pageScopeRef}>\n` +
         (hasPopups ? `    <>\n` : "") +
         `${uiResult.split('\n').map(line => `      ${line}`).join('\n')}\n` +
         (hasPopups ? `      <PopupRenderer popupMap={POPUP_MAP} />\n` : "") +
         (hasPopups ? `    </>\n` : "") +
         `    </PageScopeContext.Provider>\n` +
         `  );\n` +
         `}\n\n`;
  
  if (isPopup) {
    code += `(${componentName} as any).isPopup = true;\n\n`;
  }
  
  code += `export default WithWrapper("${componentId}", ${componentName})`;
  return code;
};

/** 生成 useEffect 包装代码 */
export const wrapInEffect = (indent: string, effectCode: string) => {
  return `\n${indent}useEffect(() => {\n${indent}  /** 场景/组件初始化逻辑 */${effectCode}\n${indent}}, []);\n`;
};

