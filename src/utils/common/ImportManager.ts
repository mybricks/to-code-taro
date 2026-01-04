import type { ToTaroCodeConfig } from "../../toCodeTaro";
import { indentation } from "./helper";

export type ImportType = "default" | "named" | "module";

export type DependencyImport = Record<
  string,
  Record<
    string,
    {
      importType: ImportType;
    }
  >
>;

/** 导入依赖收集、解析 */
export class ImportManager {
  private _imports: DependencyImport = {};

  constructor(private _config: ToTaroCodeConfig) {}

  /** 添加依赖 */
  addImport({
    packageName,
    dependencyNames,
    importType,
  }: {
    packageName: string;
    dependencyNames: string[];
    importType: ImportType;
  }) {
    if (!packageName) {
      return;
    }
    const { _imports } = this;
    if (!_imports[packageName]) {
      _imports[packageName] = {};
    }

    // 对于 module 类型且 dependencyNames 为空的情况，使用特殊标记
    if (importType === "module" && dependencyNames.length === 0) {
      _imports[packageName]["__module__"] = {
        importType: "module",
      };
    } else {
      dependencyNames.forEach((dependencyName) => {
        _imports[packageName][dependencyName] = {
          importType,
        };
      });
    }
  }

  /** 依赖解析为code */
  toCode() {
    const indent = indentation(this._config.codeStyle!.indent);
    return Object.entries(this._imports).reduce(
      (pre, [packageName, dependencies]) => {
        let defaultDependency = "";
        let namedDependencies = "";

        const dependencyEntries = Object.entries(dependencies);
        
        // 检查是否有 module 类型的导入（如 import './index.less'）
        const hasModuleType = dependencies["__module__"]?.importType === "module" ||
          dependencyEntries.some(([, { importType }]) => importType === "module");
        
        if (hasModuleType) {
          return pre + `import '${packageName}';\n`;
        }

        /** 超过三项换行 */
        const validEntries = dependencyEntries.filter(([key]) => key !== "__module__");
        const wrap = validEntries.length > 3;

        validEntries.forEach(([dependencyName, { importType }], index) => {
          if (importType === "default") {
            defaultDependency = dependencyName;
          } else if (importType === "named") {
            if (wrap) {
              namedDependencies += `${indent}${dependencyName},\n`;
            } else {
              namedDependencies += `${index ? ", " : ""}${dependencyName}`;
            }
          }
        });

        if (namedDependencies) {
          if (wrap) {
            namedDependencies = `{\n${namedDependencies}}`;
          } else {
            namedDependencies = `{ ${namedDependencies} }`;
          }

          if (defaultDependency) {
            defaultDependency += ", ";
          }
        }

        return (
          pre +
          `import ${defaultDependency}${namedDependencies} from '${packageName}';\n`
        );
      },
      "",
    );
  }
}

