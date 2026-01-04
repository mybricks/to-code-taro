import { useState, useRef, useMemo } from 'react';
import { SUBJECT_SUBSCRIBE } from '../mybricks/constant';

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
      
      // 只有在访问不存在的对象属性时，才自动创建（实现类似 ensure 的效果）
      // 特意排除 MyBricks 内置的方法名，以便在生成代码中进行初始化判断
      const mybricksMethods = ['get', 'set', 'changed', 'reset', 'registerChange', 'call', 'apply', 'bind', 'push', 'pop'];
      if (value === undefined && typeof prop === 'string' && !mybricksMethods.includes(prop)) {
        value = obj[prop] = {};
      }
      
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

export function useBindInputs(scope: any, id: string) {
  const handlersRef = useRef<Record<string, any>>({});

  return useMemo(() => {
    const proxy = new Proxy({}, {
      get: (_target, pin: string) => {
        return (arg: any) => {
          if (typeof arg === 'function') {
            // 组件注册回调
            handlersRef.current[pin] = arg;
          } else {
            // 逻辑流触发输入
            const handler = handlersRef.current[pin];
            if (typeof handler === 'function') {
              if (arg && arg[SUBJECT_SUBSCRIBE]) {
                // 如果传入的是 Subject，自动订阅并触发回调
                arg[SUBJECT_SUBSCRIBE]((val: any) => {
                  handler(val);
                });
              } else {
                handler(arg);
              }
            }
          }
        };
      }
    });

    // 将代理对象挂载到作用域，供外部 comRefs.current.id.pin() 调用
    scope[id] = proxy;
    return proxy;
  }, [scope, id]);
}

export function useBindEvents(props: any) {
  return useMemo(() => {
    const _events: Record<string, any> = {};
    
    // 预处理已存在的事件
    Object.keys(props).forEach(key => {
      if (key.startsWith('on') && typeof props[key] === 'function') {
        const handler = props[key];
        const wrapped = (...args: any[]) => handler(...args);
        wrapped.getConnections = () => [{ id: 'default' }];
        _events[key] = wrapped;
      }
    });

    return new Proxy(_events, {
      get(target, key: string) {
        if (typeof key === 'string' && key.startsWith('on')) {
          if (target[key]) {
            return target[key];
          }
          // 对未连接的事件返回兜底函数
          const emptyFn = () => {};
          emptyFn.getConnections = () => [];
          return emptyFn;
        }
        return target[key];
      }
    });
  }, [props]);
}
