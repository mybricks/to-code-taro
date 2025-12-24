import React, { useEffect , useState } from 'react';
import { View } from '@tarojs/components';
import { useModel, useBindInputs, useBindEvents } from './index';
import { useAppCreateContext } from './useContext';
import ComContext, { useAppContext } from './ComContext';

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
  const { comRefs } = useAppContext();
  const [show, setShow] = useState(true);

  // 创建一个模拟的 env 对象，包含组件所需的所有属性
const env = {
  canvas: {
    id: "u_7VvVn", // 使用 data 中的 id
  },
  runtime: {
    debug: false,
  },
  edit: false,
  isH5: false,
  isDesigner: false,
  isPreview: false,
  isRelease: false,
  isDebug: false,
  isLocal: false,
  isTest: false,
};
  
  //默认事件注册
  useEffect(() => {
    comRefs.current[id].hide(()=>{
      setShow(false);
    });
    comRefs.current[id].show(()=>{
      setShow(true);
    });
    comRefs.current[id].showOrHide(()=>{
      setShow((prev: boolean)=>!prev);
    });
  }, [comRefs]);

  //数据模型
  const _data = useModel(data || {});
  const inputProxy = useBindInputs(comRefs, id);
  const eventProxy = useBindEvents(rest);
  
  comRefs.current[id] = inputProxy;

  return (
    show ? (
      <View className={className} style={style} >
        <Component
          {...rest}
          inputs={inputProxy}
          outputs={eventProxy}
          data={_data}
          env={env}
          id={id}
          style={style}
        />
      </View>
    ) : null
  );
};

export const WithWrapper = (Component: React.ComponentType<any>) => {
  return function WrappedComponent(props: any) {
    const contextStore = useAppCreateContext();
    return (
      <ComContext.Provider value={contextStore}>
        <Component {...props} />
      </ComContext.Provider>
    );
  };
};
