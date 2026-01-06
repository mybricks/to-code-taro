import Taro from '@tarojs/taro';

export type DataType = {
  mediaType?: ('image' | 'video')[];
  sourceType?: ('album' | 'camera')[];
  count?: number;
  sizeType?: ('original' | 'compressed')[];
  maxDuration?: number;
  camera?: 'back' | 'front';
};

export interface Inputs {
  chooseMedia?: (fn: (config: DataType, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  inputs.chooseMedia?.((val: DataType) => {
    try {
      const config = {
        mediaType: val?.mediaType || data.mediaType || ['image', 'video'],
        sourceType: val?.sourceType || data.sourceType || ['album', 'camera'],
        count: val?.count || data.count || 9,
        sizeType: val?.sizeType || data.sizeType || ['original', 'compressed'],
        maxDuration: val?.maxDuration || data.maxDuration || 10,
        camera: val?.camera || data.camera,
      };

      Taro.chooseMedia({
        ...config,
        success: (res) => {
          outputs.onSuccess({
            type: res.type,
            tempFiles: res.tempFiles,
            tempFilePaths: res.tempFilePaths || res.tempFiles?.map(file => file.tempFilePath),
          });
        },
        fail: (err) => {
          outputs.onFail(err.errMsg || '选择媒体失败');
        },
      });
    } catch (error: any) {
      console.error('选择媒体失败:', error);
      outputs.onFail(error?.message || '选择媒体失败');
    }
  });
};
