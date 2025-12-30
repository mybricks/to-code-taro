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
  const { comRefs, appContext } = useAppContext();
  const env = appContext; //TODO: 需要根据实际情况修改

  const [show, setShow] = useState(true);
  
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
