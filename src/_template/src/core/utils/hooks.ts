import { useState, useRef, useMemo } from 'react';
import { createReactiveInputHandler } from '../mybricks/createReactiveInputHandler';

/**
 * 深度代理，支持自动路径初始化和响应式更新（鸿蒙化处理方案）
 */
export function deepProxy(target: any, onSet?: () => void): any {
  if (target === null || typeof target !== 'object' || target.__isProxy) {
    return target;
  }

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === '__isProxy') return true;
      if (prop === 'toJSON') return () => obj;

      let value = obj[prop];

      // 只代理已存在的对象属性，不自动创建空对象
      // 避免访问不存在的属性（如 disabled）时污染原始数据
      if (typeof value === 'object' && value !== null && !value.__isProxy) {
        obj[prop] = deepProxy(value, onSet);
      }

      return obj[prop];
    },
    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      if (onSet) onSet();
      return result;
    }
  });
}

export function useModel(rawData: any) {
  const [, forceUpdate] = useState({});
  const dataRef = useRef(rawData || {});

  return useMemo(() => {
    return deepProxy(dataRef.current, () => forceUpdate({}));
  }, []);
}

export function useBindInputs(scope: any, id: string, initialHandlers?: Record<string, any>) {
  const handlersRef = useRef<Record<string, any>>({ ...initialHandlers });

  // 同步最新的 initialHandlers
  if (initialHandlers) {
    Object.assign(handlersRef.current, initialHandlers);
  }

  return useMemo(() => {
    const proxy = new Proxy({}, {
      get: (_target, pin: string) => {
        return (arg: any, ...args: any[]) => {
          if (typeof arg === 'function') {
            // 组件注册回调
            handlersRef.current[pin] = arg;
          } else {
            // 逻辑流触发输入
            const handler = handlersRef.current[pin];

            if (typeof handler === 'function') {
              if (pin === '_setData') {
                return handler(arg, ...args);
              }
              // 构造 createReactiveInputHandler 需要的参数
              return createReactiveInputHandler({
                input: handler,
                value: arg,
                rels: {}, // 这里可以扩展 output 关联
                title: id
              });
            }
          }
        };
      }
    });

    // 将代理对象挂载到作用域，供外部 comRefs.current.id.pin() 调用
    if (scope && scope.current) {
      scope.current[id] = proxy;
    }
    return proxy;
  }, [scope, id]);
}

export function useBindEvents(props: any, context?: { id: string, name: string, parentSlot?: any }) {
  return useMemo(() => {
    const _events: Record<string, any> = {};

    // 预处理已存在的事件
    Object.keys(props).forEach(key => {
      // 兼容：MyBricks 输出 pin 既可能是 onChange，也可能是 changeTab 这种非 on 前缀
      if (typeof props[key] === 'function') {
        const handler = props[key];
        const wrapped = (originalValue: any) => {
          // 鸿蒙/render-web 规范：如果是在插槽中触发事件，且存在父级协议，则自动封装元数据
          // 这解决了 FormContainer 等组件识别子项的需求
          // 注意：不要仅凭 parentSlot 存在就封装，否则会影响 Tabs2/changeTab 这类事件直接给 JS 计算组件传参
          // 仅在父级 slot 使用 itemWrap 协议时才需要这层元数据
          const value = context?.parentSlot?.params?.itemWrap ? {
            id: context.id,
            name: context.name,
            value: originalValue
          } : originalValue;
          
          return handler(value);
        };
        wrapped.getConnections = () => [{ id: 'default' }];
        _events[key] = wrapped;
      }
    });

    return new Proxy(_events, {
      get(target, key: string) {
        // 对 onXXX 事件（不少组件 runtime 直接 outputs["onChange"](...)）提供兜底函数，避免未连线时报错
        if (typeof key === 'string' && key.startsWith('on')) {
          if (target[key]) {
            return target[key];
          }
          // 对未连接的事件返回兜底函数
          const emptyFn = () => { };
          emptyFn.getConnections = () => [];
          return emptyFn;
        }
        return target[key];
      }
    });
  }, [props, context]);
}
