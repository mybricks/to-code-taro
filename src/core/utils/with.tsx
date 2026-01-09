import React, { useState, useEffect } from 'react';
// @ts-ignore 运行时由宿主项目提供 @tarojs/components
import { View } from '@tarojs/components';
import { useModel, useBindInputs, useBindEvents, subscribePopupRouter, closeActivePopupRouter } from './index';
import { useAppCreateContext } from './useContext';
import ComContext, { useAppContext } from './ComContext';
import { useEnhancedSlots, useResolvedParentSlot } from './slots';
// @ts-ignore 运行时由宿主项目提供 @tarojs/taro
import { useTabItemTap } from '@tarojs/taro';

interface WithComProps {
  component: React.ComponentType<any>;
  intputRef?: any;
  id?: string;
  data?: any;
  className?: string;
  style?: any;
  /** 插槽传入的原始数据 */
  inputValues?: any;
  /** 插槽数据到组件输入的映射: { pinId: slotKey } */
  inputValuesMapping?: Record<string, string>;
  [key: string]: any;
}

export const WithCom: React.FC<WithComProps> = (props) => {
  const { component: Component, id = '', data, className, style, inputValues, inputValuesMapping, ...rest } = props;
  const { comRefs, appContext } = useAppContext();
  const env = appContext; //TODO: 需要根据实际情况修改

  const isPopup = (Component as any).isPopup;
  const [show, setShow] = useState(true);
  const [dynamicStyle, setDynamicStyle] = useState({});


  //数据模型
  const _data = useModel(data || {});

  // 内置通用能力
  const handlers = {
    _setStyle: (style: any) => {
      setDynamicStyle((prev) => ({ ...prev, ...style }));
    },
    _setData: (path: string, value: any) => {
      const paths = path.split('.');
      let current = _data;
      for (let i = 0; i < paths.length - 1; i++) {
        if (!current[paths[i]]) current[paths[i]] = {};
        current = current[paths[i]];
      }
      current[paths[paths.length - 1]] = value;
    }
  };

  if (!isPopup) {
    Object.assign(handlers, {
      show: () => setShow(true),
      hide: () => setShow(false),
      showOrHide: () => setShow((prev) => !prev),
    });
  }

  // 绑定输入，传入初始 handlers
  const inputProxy = useBindInputs(comRefs, id, handlers);

  const { slots: rawSlots, parentSlot: parentSlotProp, ...restProps } = rest as any;
  const { outputs: globalOutputs } = useAppContext();
  const parentSlot = useResolvedParentSlot(parentSlotProp);

  // 绑定事件，带上上下文（用于事件流自动封装 id/name）
  const eventProxy = useBindEvents(restProps, { 
    id, 
    name: props.name || id, 
    parentSlot 
  });

  // 注册到全局 IO 管理
  if (globalOutputs && globalOutputs.current) {
    globalOutputs.current[id] = eventProxy;
  }

  // 鸿蒙规范：确保 comRefs 中挂载的是最新的 inputProxy
  comRefs.current[id] = inputProxy;

  const enhancedSlots = useEnhancedSlots(rawSlots, id);

  const jsx = (
    <Component
      {...restProps}
      inputs={inputProxy}
      outputs={eventProxy}
      slots={enhancedSlots}
      parentSlot={parentSlot}
      data={_data}
      env={env}
      id={id}
      style={style}
    />
  );

  // 鸿蒙化处理：支持 itemWrap 协议
  if (parentSlot?.params?.itemWrap) {
    return parentSlot.params.itemWrap({
      id,
      name: props.name || id,
      jsx,
      def: (Component as any).def,
      inputs: inputProxy,
      outputs: eventProxy,
      style
    });
  }

  return (
    show || isPopup ? (
      <View className={className} style={{ ...style, ...dynamicStyle }} >
        {jsx}
      </View>
    ) : null
  );
};

export const WithWrapper = (Component: React.ComponentType<any>) => {
  return function WrappedComponent(props: any) {
    const contextStore = useAppCreateContext();
    const { setPopupState } = contextStore;
    const isPopup = (Component as any).isPopup;

    // 通过发布订阅模式解耦弹窗状态变化
    useEffect(() => {
      return subscribePopupRouter((state) => setPopupState(state));
    }, [setPopupState]);

    // 点击 TabBar 时自动关闭弹窗（自定义 TabBar 或原生 TabBar 点击均会触发）
    useTabItemTap(() => {
      if (isPopup) return;
      closeActivePopupRouter();
    });

    return (
      <ComContext.Provider value={contextStore}>
        <Component {...props} />
      </ComContext.Provider>
    );
  };
};
