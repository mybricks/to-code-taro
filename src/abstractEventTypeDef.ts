/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ToTaroCodeConfig } from "./toCodeTaro";
import { indentation } from "./utils";

type AbstractEventTypeDefMap = Record<
  string,
  {
    eventIds: Set<string>;
    typeDef: {
      var: Record<string, any>;
      input: Record<string, any>;
      output: Record<string, any>;
    };
  }
>;

const abstractEventTypeDef = (
  abstractEventTypeDefMap: AbstractEventTypeDefMap,
  config: ToTaroCodeConfig,
) => {
  const indent = indentation(config.codeStyle!.indent);
  const interfaceCode: string[] = [];
  const comEvent: string[] = [];

  Object.entries(abstractEventTypeDefMap).forEach(
    ([comId, { typeDef, eventIdMap }]: any) => {
      const { vars, inputs, outputs } = typeDef;
      const statementCode: string[] = [];
      const getCode: string[] = [];
      const eventCode: string[] = [];
      const eventCtxTypeName = `I${comId}_comEventCtx`;
      const comEventTypeName = `I${comId}_comEvent`;

      Object.entries(vars).forEach(([, { title, schema }]: any) => {
        const typeName = `I${comId}_var_${title}`;
        statementCode.push(`type ${typeName} = any;`);
        getCode.push(
          `${indent}getVar<T = ${typeName}>(value: "${title}"): GetVarResult<T>`,
        );
      });

      Object.entries(inputs).forEach(([, { title, schema }]: any) => {
        const typeName = `I${comId}_input_${title}`;
        statementCode.push(`type ${typeName} = any;`);
        getCode.push(
          `${indent}getInput<T = ${typeName}>(value: "${title}"): GetInputResult<T>`,
        );
      });

      Object.entries(outputs).forEach(([, { title, schema }]: any) => {
        const typeName = `I${comId}_output_${title}`;
        statementCode.push(`type ${typeName} = any;`);
        getCode.push(
          `${indent}getOutput<T = ${typeName}>(value: "${title}"): GetOutputResult<T>`,
        );
      });

      Object.entries(eventIdMap).forEach(([eventId, schema]) => {
        const typeName = `I${comId}_${eventId}_value`;
        statementCode.push(`type ${typeName} = any;`);
        eventCode.push(
          `${indent}${eventId}?: (value: ${typeName}, ctx: ${eventCtxTypeName}) => void`,
        );
      });

      interfaceCode.push(
        statementCode.join("\n") +
          `\ninterface ${eventCtxTypeName} {` +
          `\n${getCode.join("\n")}` +
          `\n}` +
          `\ninterface ${comEventTypeName} {` +
          `\n${eventCode.join("\n")}` +
          `\n}`,
      );

      comEvent.push(`${indent}${comId}?: ${comEventTypeName}`);
    },
  );

  return (
    `interface GetVarResult<T> {
  getValue: () => T
  setValue: (value: T) => void
}
interface GetOutputResult<T> {
  setValue: (value: T) => void
}
interface GetInputResult<T> {
  getValue: () => T
}` +
    (interfaceCode ? `\n${interfaceCode.join("\n")}` : "") +
    `\ninterface ComEvent {` +
    `\n${comEvent.join("\n")}` +
    `\n}`
  );
};

export default abstractEventTypeDef;

