import React, { useMemo, useRef } from "react";
import ComContext, { SlotProvider, useAppContext, useParentSlot } from "./ComContext";
import { createReactiveInputHandler } from "../mybricks/createReactiveInputHandler";

type AnyRecord = Record<string, any>;

type SlotState = {
  inputs: any;
  outputs: any;
  _inputs: any;
  /** scopeId -> scoped comRefs（每个 scope 一套，避免列表多实例覆盖） */
  _scopedComRefs?: Record<string, any>;
  _render?: any;
  render: (params?: any) => any;
};

function createChannelProxy(title: string) {
  const handlersMap: Record<string, any> = {};
  return new Proxy(
    {},
    {
      get: (_t, pin: string) => {
          return (arg: any) => {
          if (typeof arg === "function") {
            handlersMap[pin] = arg;
            return;
          }
          const handler = handlersMap[pin];
          if (typeof handler === "function") {
            return createReactiveInputHandler({
              input: handler,
              value: arg,
              rels: {},
              title,
            });
          }
        };
      },
    },
  );
}

/**
 * 参考鸿蒙的 createSlotsIO：
 * - 确保每个 slot 都具备 inputs / outputs / _inputs 三套通道，避免 runtime 访问时报 undefined
 * - render 时通过 SlotProvider 注入 parentSlot（slot 内子组件可 useParentSlot 获取）
 */
export function useEnhancedSlots(rawSlots: any, id: string) {
  // 让 React 在 classic JSX 下被视为“使用”，避免 TS/编辑器告警
  void React;
  const slotStoreRef = useRef<Record<string, SlotState>>({});

  return useMemo(() => {
    if (!rawSlots) return rawSlots;
    const nextSlots: AnyRecord = {};

    Object.entries(rawSlots).forEach(([slotKey, slotDef]: any) => {
      const state =
        slotStoreRef.current[slotKey] ||
        (slotStoreRef.current[slotKey] = {
          inputs: createChannelProxy(`${id}.${slotKey}.inputs`),
          outputs: createChannelProxy(`${id}.${slotKey}.outputs`),
          _inputs: createChannelProxy(`${id}.${slotKey}._inputs`),
          _scopedComRefs: {},
          _render: undefined,
          render: (params?: any) => {
            const r = state._render;
            // 只有存在 key 或 index 时才认为是“多实例作用域插槽”，需要实例隔离
            const rawScope = params?.key ?? params?.inputValues?.index ?? params?.inputValues?.itemData?.id;
            
            if (rawScope === undefined || rawScope === null) {
              return (
                <SlotProvider value={state}>
                  {typeof r === "function" ? r(params) : null}
                </SlotProvider>
              );
            }

            const scopeId = `${id}.${slotKey}::${String(rawScope)}`;
            const scopedComRefs =
              (state._scopedComRefs![scopeId] ||= { current: { $inputs: {} } });
            return (
              <SlotProvider value={state}>
                <ScopedComContextProvider comRefs={scopedComRefs} scopeId={scopeId}>
                  {typeof r === "function" ? r(params) : null}
                </ScopedComContextProvider>
              </SlotProvider>
            );
          },
        });

      state._render = slotDef?.render;
      nextSlots[slotKey] = {
        ...(slotDef || {}),
        render: state.render,
        inputs: state.inputs,
        outputs: state.outputs,
        _inputs: state._inputs,
      };
    });

    return nextSlots;
  }, [rawSlots, id]);
}

function ScopedComContextProvider(props: {
  comRefs: any;
  scopeId: string;
  children: React.ReactNode;
}) {
  const parent = useAppContext();
  const value = useMemo(() => {
    return {
      ...parent,
      comRefs: props.comRefs,
      $scopeId: props.scopeId,
    } as any;
  }, [parent, props.comRefs, props.scopeId]);

  return <ComContext.Provider value={value}>{props.children}</ComContext.Provider>;
}

/** parentSlot 解析：props 优先，其次用 SlotProvider 注入的 context */
export function useResolvedParentSlot(parentSlotProp: any) {
  const parentSlotFromCtx = useParentSlot();
  return parentSlotProp ?? parentSlotFromCtx;
}


