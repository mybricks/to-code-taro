import { useState, useRef, useMemo, useEffect } from 'react';
import { createReactiveInputHandler } from '../mybricks/createReactiveInputHandler';
import { useAppContext, useParentSlot } from './ComContext';
import { TodoPool } from './pool';

/** 深度代理：支持响应式更新 */
export function deepProxy(target: any, onSet?: () => void): any {
  if (target === null || typeof target !== 'object' || target.__isProxy) return target;

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === '__isProxy') return true;
      if (prop === 'toJSON') return () => obj;

      const value = obj[prop];
      if (typeof value === 'object' && value !== null && !value.__isProxy) {
        obj[prop] = deepProxy(value, onSet);
      }
      return obj[prop];
    },
    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      onSet?.();
      return result;
    }
  });
}

/** 状态 Hook：提供响应式数据能力 */
export function useModel(rawData: any) {
  const [, forceUpdate] = useState({});
  const dataRef = useRef(rawData || {});

  return useMemo(() => deepProxy(dataRef.current, () => forceUpdate({})), []);
}

/** 
 * 组件引用代理：
 * 1. 自动缓冲：访问未渲染组件时返回影子对象，缓冲后续指令
 * 2. 引用渗透：子作用域注册的真实引用自动同步至父级
 * 3. 自动同步清理：卸载时从作用域链中彻底移除，防止僵尸引用
 */
export function proxyRefs(target: any, parentComRefs?: any, todoPool?: TodoPool): any {
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === '__isProxy') return true;
      if (prop === 'toJSON') return () => obj;

      if (typeof prop === 'string' && prop.startsWith('u_') && obj[prop] === undefined) {
        // 先检查父级是否有真实引用（非影子对象）
        if (parentComRefs?.current?.[prop] && !parentComRefs.current[prop].__isShadow) {
          return parentComRefs.current[prop];
        }
        // 在当前作用域创建影子对象，使用当前作用域的 $index
        const currentIndex = obj.$index ?? 0;
        return (obj[prop] = new Proxy({ __isShadow: true }, {
          get(_, method: string) {
            if (method === '__isShadow') return true;
            return (...args: any[]) => {
              if (!(todoPool instanceof TodoPool)) return;
              todoPool.push(prop, currentIndex, method, args);
            };
          }
        }));
      }
      return obj[prop];
    },
    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      const isRealRef = typeof prop === 'string' && !prop.startsWith('$') && value?.__isShadow !== true;

      if (isRealRef && parentComRefs?.current) {
        try { parentComRefs.current[prop] = value; } catch {}
      }
      return result;
    },
    deleteProperty(obj, prop) {
      const result = Reflect.deleteProperty(obj, prop);
      const isRealRef = typeof prop === 'string' && !prop.startsWith('$');

      if (isRealRef && parentComRefs?.current) {
        try { delete parentComRefs.current[prop]; } catch {}
      }
      return result;
    }
  });
}

/** 
 * 组件输入绑定 Hook：
 * 1. 注册输入执行器
 * 2. 自动重放缓冲指令（精准索引匹配）
 * 3. 生命周期自动化：卸载时自动注销引用渗透路径
 */
export function useBindInputs(scope: any, id: string, initialHandlers?: Record<string, any>) {
  const handlersRef = useRef<Record<string, any>>({ ...initialHandlers });
  const { todoPool } = useAppContext();
  const parentSlot = useParentSlot();
  const index = parentSlot?.params?.inputValues?.index ?? 0;

  useEffect(() => {
    return () => {
      if (scope?.current) {
        delete scope.current[id];
      }
    };
  }, [scope, id]);

  return useMemo(() => {
    const proxy = new Proxy({}, {
      get: (target, pin: string) => {
        if (pin === '__isShadow') return false;
        if (pin === 'toJSON') return () => target;

        return (arg: any, ...args: any[]) => {
          if (typeof arg === 'function') {
            handlersRef.current[pin] = arg;

            // 处理指令重放
            const pendingArgs = todoPool?.pop(id, index, pin);
            if (pendingArgs) {
              if (pin === '_setData') {
                arg(...pendingArgs);
              } else {
                createReactiveInputHandler({ input: arg, value: pendingArgs[0], rels: {}, title: id });
              }
            }
          } else {
            const handler = handlersRef.current[pin];
            if (typeof handler === 'function') {
              return pin === '_setData' 
                ? handler(arg, ...args) 
                : createReactiveInputHandler({ input: handler, value: arg, rels: {}, title: id });
            }
          }
        };
      }
    });

    if (scope?.current) scope.current[id] = proxy;
    if (initialHandlers) {
      Object.keys(initialHandlers).forEach(pin => (proxy as any)[pin](initialHandlers[pin]));
    }

    return proxy;
  }, [scope, id, todoPool, index]);
}

/** 组件事件绑定 Hook */
export function useBindEvents(props: any, context?: { id: string, name: string, parentSlot?: any }) {
  return useMemo(() => {
    const events: Record<string, any> = {};

    Object.keys(props).forEach(key => {
      if (typeof props[key] === 'function') {
        const handler = props[key];
        const wrapped = (original: any) => {
          const value = context?.parentSlot?.params?.itemWrap 
            ? { id: context.id, name: context.name, value: original } 
            : original;
          return handler(value);
        };
        wrapped.getConnections = () => [{ id: 'default' }];
        events[key] = wrapped;
      }
    });

    return new Proxy(events, {
      get(target, key: string) {
        if (typeof key === 'string' && key.startsWith('on')) {
          if (target[key]) return target[key];
          const fn: any = () => {};
          fn.getConnections = () => [];
          return fn;
        }
        return target[key];
      }
    });
  }, [props, context]);
}
