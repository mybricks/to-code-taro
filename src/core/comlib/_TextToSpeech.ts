export type DataType = {
  text?: string;
  lang?: string; // 语言，如 'zh-CN', 'en-US'
  rate?: number; // 语速，0.1-10
  pitch?: number; // 音调，0-2
  volume?: number; // 音量，0-1
};

export interface Inputs {
  speak?: (fn: (config: DataType, relOutputs?: any) => void) => void;
  stop?: (fn: (config: {}, relOutputs?: any) => void) => void;
  pause?: (fn: (config: {}, relOutputs?: any) => void) => void;
  resume?: (fn: (config: {}, relOutputs?: any) => void) => void;
}

export interface Outputs {
  onStart: (value?: any) => void;
  onEnd: (value?: any) => void;
  onError: (value?: any) => void;
  onSuccess: (value?: any) => void;
  onFail: (value?: any) => void;
}

interface IOContext {
  data: DataType;
  inputs: Inputs;
  outputs: Outputs;
}

// 检查浏览器是否支持Web Speech API
const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export default (context: IOContext) => {
  const data: DataType = context.data;
  const inputs: Inputs = context.inputs;
  const outputs: Outputs = context.outputs;

  if (!speechSupported) {
    console.warn('当前环境不支持语音合成功能');
  }

  inputs.speak?.((val: DataType) => {
    try {
      const text = val?.text || data.text;
      const lang = val?.lang || data.lang || 'zh-CN';
      const rate = val?.rate || data.rate || 1;
      const pitch = val?.pitch || data.pitch || 1;
      const volume = val?.volume || data.volume || 1;

      if (!text) {
        outputs.onFail('待合成的文本不能为空');
        return;
      }

      if (!speechSupported) {
        outputs.onFail('当前环境不支持语音合成功能');
        return;
      }

      // 如果有正在播放的语音，先停止
      if (currentUtterance && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      currentUtterance = new SpeechSynthesisUtterance(text);
      currentUtterance.lang = lang;
      currentUtterance.rate = Math.max(0.1, Math.min(10, rate));
      currentUtterance.pitch = Math.max(0, Math.min(2, pitch));
      currentUtterance.volume = Math.max(0, Math.min(1, volume));

      currentUtterance.onstart = () => {
        outputs.onStart({ text, lang, rate, pitch, volume });
      };

      currentUtterance.onend = () => {
        outputs.onEnd({ text, lang, rate, pitch, volume });
        currentUtterance = null;
      };

      currentUtterance.onerror = (event) => {
        outputs.onError({
          error: event.error,
          text,
          message: '语音合成失败',
        });
        currentUtterance = null;
      };

      window.speechSynthesis.speak(currentUtterance);
      outputs.onSuccess({ text, lang, rate, pitch, volume });
    } catch (error: any) {
      console.error('语音合成失败:', error);
      outputs.onFail(error?.message || '语音合成失败');
    }
  });

  inputs.stop?.(() => {
    try {
      if (speechSupported && currentUtterance) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
        outputs.onSuccess('已停止语音播放');
      } else {
        outputs.onFail('没有正在播放的语音');
      }
    } catch (error: any) {
      console.error('停止语音失败:', error);
      outputs.onFail(error?.message || '停止语音失败');
    }
  });

  inputs.pause?.(() => {
    try {
      if (speechSupported && window.speechSynthesis.pause) {
        window.speechSynthesis.pause();
        outputs.onSuccess('已暂停语音播放');
      } else {
        outputs.onFail('当前环境不支持暂停功能');
      }
    } catch (error: any) {
      console.error('暂停语音失败:', error);
      outputs.onFail(error?.message || '暂停语音失败');
    }
  });

  inputs.resume?.(() => {
    try {
      if (speechSupported && window.speechSynthesis.resume) {
        window.speechSynthesis.resume();
        outputs.onSuccess('已恢复语音播放');
      } else {
        outputs.onFail('当前环境不支持恢复功能');
      }
    } catch (error: any) {
      console.error('恢复语音失败:', error);
      outputs.onFail(error?.message || '恢复语音失败');
    }
  });
};
