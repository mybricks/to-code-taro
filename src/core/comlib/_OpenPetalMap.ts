export type DataType = {
  latitude?: number;
  longitude?: number;
  scale?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    iconPath?: string;
  }>;
  showLocation?: boolean;
};

export interface Inputs {
  openMap?: (fn: (config: DataType, relOutputs?: any) => void) => void;
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

  inputs.openMap?.((val: DataType) => {
    try {
      const config = {
        latitude: val?.latitude || data.latitude || 39.9093,
        longitude: val?.longitude || data.longitude || 116.3974,
        scale: val?.scale || data.scale || 16,
        markers: val?.markers || data.markers || [],
        showLocation: val?.showLocation !== undefined ? val.showLocation : data.showLocation || true,
      };

      // 小程序环境下，使用Taro的地图组件
      // 这里可以导航到地图页面或直接显示地图
      outputs.onSuccess({
        type: 'map',
        config,
        message: '地图配置已准备就绪，请在页面中使用Map组件显示',
      });
    } catch (error: any) {
      console.error('打开地图失败:', error);
      outputs.onFail(error?.message || '打开地图失败');
    }
  });
};
