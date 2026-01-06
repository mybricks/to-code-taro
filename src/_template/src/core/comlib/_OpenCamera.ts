import Taro from '@tarojs/taro';

export type DataType = {
  camera?: 'back' | 'front';
  flash?: 'auto' | 'on' | 'off';
  quality?: 'high' | 'normal' | 'low';
};

export interface Inputs {
  openCamera?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.openCamera?.((val: DataType) => {
    try {
      const config = {
        camera: val?.camera || data.camera || 'back',
        flash: val?.flash || data.flash || 'auto',
        quality: val?.quality || data.quality || 'normal',
      };

      // Taro没有直接的打开相机API，我们可以：
      // 1. 使用chooseImage并设置sourceType为camera
      // 2. 或者提示用户使用系统相机

      Taro.chooseImage({
        count: 1,
        sourceType: ['camera'],
        success: (res) => {
          outputs.onSuccess({
            type: 'camera',
            tempFilePath: res.tempFilePaths[0],
            tempFile: res.tempFiles[0],
            config,
          });
        },
        fail: (err) => {
          if (err.errMsg?.includes('cancel')) {
            outputs.onFail('用户取消拍照');
          } else {
            outputs.onFail(err.errMsg || '打开相机失败');
          }
        },
      });
    } catch (error: any) {
      console.error('打开相机失败:', error);
      outputs.onFail(error?.message || '打开相机失败');
    }
  });
};
