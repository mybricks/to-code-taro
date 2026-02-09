import React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { createReactiveInputHandler } from '../mybricks/createReactiveInputHandler';
import { useAppContext, useParentSlot } from './ComContext';
import { TodoPool } from './pool';
import { ComRefResolver } from './comRefResolver';

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
 *
 * 使用 ComRefResolver 统一处理引用解析逻辑
 */
export function proxyRefs(target: any, parentComRefs?: any, todoPool?: TodoPool): any {
  // 创建解析器，链接父级解析器
  const parentResolver = parentComRefs?.current?.__resolver as ComRefResolver | undefined;
  const scopeIndex = target.$index ?? 0;
  const resolver = new ComRefResolver(target, parentResolver, todoPool, scopeIndex);

  // 存储解析器引用，供子级使用
  target.__resolver = resolver;

  return new Proxy(target, {
    get(obj, prop) {
      if (prop === '__isProxy') return true;
      if (prop === '__resolver') return resolver;
      if (prop === 'toJSON') return () => obj;

      // u_ 开头的组件引用，统一由解析器处理
      if (typeof prop === 'string' && prop.startsWith('u_')) {
        return resolver.get(prop);
      }
      return obj[prop];
    },

    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);

      // 真实引用注册时，同步到解析器
      const isRealRef = typeof prop === 'string'
        && !prop.startsWith('$')
        && value?.__isShadow !== true;

      if (isRealRef && typeof prop === 'string' && prop.startsWith('u_')) {
        resolver.set(prop, value);
      } else if (isRealRef && parentComRefs?.current) {
        // 非 u_ 开头的属性，保持原有的父级渗透逻辑
        try { parentComRefs.current[prop] = value; } catch {}
      }
      return result;
    },

    deleteProperty(obj, prop) {
      const result = Reflect.deleteProperty(obj, prop);

      if (typeof prop === 'string' && prop.startsWith('u_')) {
        resolver.delete(prop);
      } else if (typeof prop === 'string' && !prop.startsWith('$') && parentComRefs?.current) {
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
        if (pin === '__isLazyProxy') return false;
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

/** 内置通用能力 Hook：_setStyle / _setData / show / hide / showOrHide */
export function useBuiltinHandlers(opts: {
  data: any;
  setDynamicStyle: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  isPopup: boolean;
}) {
  const { data, setDynamicStyle, setShow, isPopup } = opts;
  return useMemo(() => {
    const handlers: Record<string, any> = {
      _setStyle: (style: any) => {
        setDynamicStyle((prev) => ({ ...prev, ...style }));
      },
      _setData: (path: string, value: any) => {
        const paths = path.split('.');
        let current = data;
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
    return handlers;
  }, [data, setDynamicStyle, setShow, isPopup]);
}

/**
 * 组件输出绑定 Hook（与 useBindInputs 对称）
 * - 从 props 提取事件函数，创建 eventProxy
 * - 合并 slot outputs，注册到 comRefs.current.$outputs[id]
 */
export function useBindOutputs(
  comRefs: any,
  id: string,
  props: any,
  enhancedSlots: any,
  context?: { id: string; name: string; parentSlot?: any }
) {
  const eventProxy = useMemo(() => {
    const events: Record<string, any> = {};
    Object.keys(props).forEach(key => {
      if (typeof props[key] === 'function') {
        const handler = props[key];
        const wrapped = (original: any) => handler(original);
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

  if (comRefs?.current?.$outputs) {
    const slotOutputsList = Object.values(enhancedSlots || {})
      .map((slot: any) => slot?.outputs)
      .filter(Boolean);

    if (slotOutputsList.length > 0) {
      comRefs.current.$outputs[id] = new Proxy({}, {
        get(_, prop: string) {
          for (const outputs of slotOutputsList) {
            const fn = outputs[prop];
            if (fn) return fn;
          }
          return eventProxy[prop];
        }
      });
    } else {
      comRefs.current.$outputs[id] = eventProxy;
    }
  }

  return eventProxy;
}
