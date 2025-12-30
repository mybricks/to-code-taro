import React, { useState, useRef, useMemo } from 'react';

export function useModel(rawData: any) {
  const [, forceUpdate] = useState({});
  const dataRef = useRef(rawData || {});
  
  return useMemo(() => {
    return new Proxy(dataRef.current, {
      get(target, key) {
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        const result = Reflect.set(target, key, value);
        forceUpdate({});
        return result;
      }
    });
  }, []);
}

export function useBindInputs(scope: any, id: string) {
  return useMemo(() => {
    const controller = scope[id] = scope[id] || {};
    return new Proxy({}, {
      get: (_target, pin: string) => {
        return (arg: any) => {
          if (typeof arg === 'function') {
            controller[pin] = arg;
          } else {
            const callback = controller[pin];
            if (typeof callback === 'function') {
              callback(arg);
            }
          }
        };
      }
    });
  }, [scope, id]);
}

export function useBindEvents(props: any) {
  return useMemo(() => {
    const _events: Record<string, any> = {};
    Object.keys(props).forEach(key => {
      if (key.startsWith('on')) {
        const handler = props[key];
        if (typeof handler === 'function') {
          _events[key] = handler;
          _events[key].getConnections = () => [1];
        }
      }
    });
    return _events;
  }, [props]);
}

export { WithCom, WithWrapper } from './with';
