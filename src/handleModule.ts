import type { UI, BaseConfig } from "./toCodeTaro";
import { ImportManager, indentation, genObjectCode, convertComponentStyle, convertStyleAryToCss, firstCharToUpperCase } from "./utils";
import { handleProcess } from "./utils/handleProcess";

type Module = Extract<UI["children"][0], { type: "module" }>;

interface HandleModuleConfig extends BaseConfig {
  addParentDependencyImport: (typeof ImportManager)["prototype"]["addImport"];
  addConsumer: (provider: ReturnType<BaseConfig["getCurrentProvider"]>) => void;
  addComId: (comId: string) => void;
}

const handleModule = (module: Module, config: HandleModuleConfig) => {
  const { events, moduleId, props } = module;
  const moduleScene = config.getSceneById(moduleId);

  const rawName = config.getFileName?.(moduleId) || moduleScene.title;
  const name = firstCharToUpperCase(rawName);
  let comEventCode = "";

  const indent = indentation(config.codeStyle!.indent * (config.depth + 1));

  Object.entries(events).forEach(([eventId, { diagramId }]: any) => {
    if (!diagramId) {
      return;
    }

    const event = config.getEventByDiagramId(diagramId)!;

    if (!event) {
      return;
    }

    const defaultValue = "value";

    let process = handleProcess(event, {
      ...config,
      depth: config.depth + 2,
      addParentDependencyImport: config.addParentDependencyImport,
      getParams: () => {
        return {
          [eventId]: defaultValue,
        };
      },
    });

    if (process.includes("pageParams")) {
      config.addParentDependencyImport({
        packageName: config.getComponentPackageName(),
        dependencyNames: ["page"],
        importType: "named",
      });
      process =
        indentation(config.codeStyle!.indent * (config.depth + 2)) +
        `const pageParams: any = page.getParams("${config.getCurrentScene().id}");\n` +
        process;
    }

    comEventCode +=
      `${indent}${eventId}: (${defaultValue}: any) => {\n` +
      process +
      `\n${indent}},\n`;
  });

  config.addParentDependencyImport({
    packageName: "../sections/Index",
    dependencyNames: [name],
    importType: "named",
  });

  const configs = module.meta.model.data.configs;
  const currentProvider = config.getCurrentProvider();
  currentProvider.coms.add(module.meta.id);
  currentProvider.controllers.add(module.meta.id);
  const resultStyle = convertComponentStyle(module.props.style);
  const cssContent = convertStyleAryToCss(props.style?.styleAry, module.meta.id);
  const componentController =
    config.getComponentController?.({
      com: module.meta,
      scene: config.getCurrentScene(),
    }) || `controller_${module.meta.id}`;

  const initialIndent = config.codeStyle!.indent * config.depth;
  const indentView = indentation(initialIndent);
  const indent2 = indentation(initialIndent + config.codeStyle!.indent);
  const indent3 = indentation(initialIndent + config.codeStyle!.indent * 2);

  const moduleCode =
    `${indent2}<${name}` +
    (config.verbose ? `\n${indent3}title="${module.meta.title}"` : "") +
    (configs
      ? `\n${indent3}data={${genObjectCode(configs, {
          initialIndent: initialIndent + config.codeStyle!.indent * 2,
          indentSize: config.codeStyle!.indent,
        })}}`
      : "") +
    `\n${indent3}controller={this.${currentProvider.name}.${componentController}}` +
    (comEventCode
      ? `\n${indent3}onEvents={{${comEventCode.replace(/\n/g, "\n" + indent3)}}}`
      : "") +
    `\n${indent2}/>`;

  const ui = `${indentView}<View id="${module.meta.id}" className="${module.meta.id}" style={${JSON.stringify(resultStyle.root)}}>\n${moduleCode}\n${indentView}</View>`;

  return {
    ui,
    cssContent,
  };

  return {
    ui,
    cssContent,
  };
};

export default handleModule;

