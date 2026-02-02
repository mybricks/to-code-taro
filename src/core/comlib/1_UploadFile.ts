export type DataType = {};

export interface Inputs {
  upload?: (fn: (config: any, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
};
