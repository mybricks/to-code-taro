import Taro from '@tarojs/taro';

export type DataType = {
  accept?: string; // 文件类型，如 'image/*', 'video/*', 'audio/*', '.pdf,.doc,.docx'
  multiple?: boolean; // 是否支持多选
  capture?: 'camera' | 'album' | 'both'; // 拍摄来源
  compressed?: boolean; // 是否压缩
  maxDuration?: number; // 视频最大时长（秒）
  camera?: 'back' | 'front'; // 摄像头方向
};

export interface Inputs {
  chooseFile?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.chooseFile?.((val: DataType) => {
    try {
      const config = {
        accept: val?.accept || data.accept || 'image/*',
        multiple: val?.multiple !== undefined ? val.multiple : data.multiple || false,
        capture: val?.capture || data.capture,
        compressed: val?.compressed !== undefined ? val.compressed : data.compressed,
        maxDuration: val?.maxDuration || data.maxDuration,
        camera: val?.camera || data.camera,
      };

      // 根据文件类型选择不同的API
      if (config.accept?.startsWith('image/')) {
        // 选择图片
        Taro.chooseImage({
          count: config.multiple ? 9 : 1,
          sourceType: config.capture === 'album' ? ['album'] : config.capture === 'camera' ? ['camera'] : ['album', 'camera'],
          success: (res) => {
            outputs.onSuccess({
              type: 'image',
              files: res.tempFiles,
              tempFilePaths: res.tempFilePaths,
            });
          },
          fail: (err) => outputs.onFail(err.errMsg || '选择图片失败'),
        });
      } else if (config.accept?.startsWith('video/')) {
        // 选择视频
        Taro.chooseVideo({
          sourceType: config.capture === 'album' ? ['album'] : config.capture === 'camera' ? ['camera'] : ['album', 'camera'],
          compressed: config.compressed,
          maxDuration: config.maxDuration,
          camera: config.camera,
          success: (res) => {
            outputs.onSuccess({
              type: 'video',
              file: res,
            });
          },
          fail: (err) => outputs.onFail(err.errMsg || '选择视频失败'),
        });
      } else if (config.accept?.startsWith('audio/')) {
        // 选择音频（小程序暂不支持直接选择音频文件，这里返回提示）
        outputs.onFail('小程序暂不支持直接选择音频文件');
      } else {
        // 其他文件类型，使用文件选择器（如果支持）
        if (Taro.chooseMessageFile) {
          Taro.chooseMessageFile({
            count: config.multiple ? 10 : 1,
            type: 'file',
            success: (res) => {
              outputs.onSuccess({
                type: 'file',
                files: res.tempFiles,
              });
            },
            fail: (err) => outputs.onFail(err.errMsg || '选择文件失败'),
          });
        } else {
          outputs.onFail('当前环境不支持文件选择');
        }
      }
    } catch (error: any) {
      console.error('文件选择失败:', error);
      outputs.onFail(error?.message || '文件选择失败');
    }
  });
};
