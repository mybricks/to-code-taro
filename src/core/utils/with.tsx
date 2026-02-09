import React, { useState, useEffect } from 'react';
// @ts-ignore 运行时由宿主项目提供 @tarojs/components
import { View } from '@tarojs/components';
import { useModel, useBindInputs, useBindEvents, useBuiltinHandlers, useRegisterOutputs, subscribePopupRouter, closeActivePopupRouter } from './index';
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
  [key: string]: any;
}

export const WithCom: React.FC<WithComProps> = (props) => {
  const { component: Component, id = '', data, className, style, ...rest } = props;
  const { comRefs, appContext } = useAppContext();
  const env = appContext; //TODO: 需要根据实际情况修改

  const isPopup = (Component as any).isPopup;
  const [show, setShow] = useState(true);
  const [dynamicStyle, setDynamicStyle] = useState({});


  //数据模型
  const _data = useModel(data || {});

  const handlers = useBuiltinHandlers({ data: _data, setDynamicStyle, setShow, isPopup });

  // 绑定输入，传入初始 handlers
  const inputProxy = useBindInputs(comRefs, id, handlers);

  const { slots: rawSlots, parentSlot: parentSlotProp, ...restProps } = rest as any;
  const parentSlot = useResolvedParentSlot(parentSlotProp);

  // 绑定事件，带上上下文（用于事件流自动封装 id/name）
  const eventProxy = useBindEvents(restProps, {
    id,
    name: props.name || id,
    parentSlot
  });

  // 鸿蒙规范：确保 comRefs 中挂载的是最新的 inputProxy
  comRefs.current[id] = inputProxy;

  const enhancedSlots = useEnhancedSlots(rawSlots, id);

  useRegisterOutputs(comRefs, id, eventProxy, enhancedSlots);

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
      <View  id={id} className={className} style={{ ...style, ...dynamicStyle }} >
        {jsx}
        {props.children}
      </View>
    ) : null
  );
};

export const WithWrapper = (id: string, Component: React.ComponentType<any>) => {
  return function WrappedComponent(props: any) {
    const contextStore = useAppCreateContext(id);
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
