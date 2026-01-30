import React, { useMemo, useRef, useState, useCallback } from "react";
import ComContext, { SlotProvider, useAppContext, useParentSlot } from "./ComContext";
import { createReactiveInputHandler } from "../mybricks/createReactiveInputHandler";
import { proxyRefs } from "./hooks";
import { TodoPool } from "./pool";

type AnyRecord = Record<string, any>;

type SlotState = {
  inputs: any;
  outputs: any;
  _inputs: any;
  /** scopeId -> scoped comRefs（每个 scope 一套，避免列表多实例覆盖） */
  _scopedComRefs?: Record<string, any>;
  _render?: any;
  /** 存储 inputValues，当 inputs 被调用时更新 */
  _inputValues?: Record<string, any>;
  /** 触发重渲染的回调 */
  _triggerUpdate?: () => void;
  render: (params?: any) => any;
};

/**
 * 创建一个具有"向上渗透"和"隔离 Todo 池"能力的 comRefs 对象
 */
function createPenetratingComRefs(parentComRefs: any, todoPool?: TodoPool, index: number = 0) {
  const localTarget = { $inputs: {}, $outputs: {}, $index: index };
  return { current: proxyRefs(localTarget, parentComRefs, todoPool) };
}

function SlotParamsBridge(props: {
  state: SlotState;
  params: any;
  render?: any;
  children?: React.ReactNode;
}) {
  const parentSlot = useParentSlot<any>();
  const mergedParams =
    props.params?.inputValues === undefined && parentSlot?.params?.inputValues
      ? { ...(props.params || {}), inputValues: parentSlot.params.inputValues }
      : props.params;

  const SlotComp = props.render;
  const content = SlotComp ? <SlotComp {...(mergedParams || {})} /> : props.children ?? null;

  return <SlotProvider value={{ ...props.state, params: mergedParams }}>{content}</SlotProvider>;
}

function createChannelProxy(title: string, onInputCall?: (pin: string, value: any) => void) {
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
          // 通知外部有输入调用（用于 scope 插槽的 inputValues 更新）
          onInputCall?.(pin, arg);
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

export function useEnhancedSlots(rawSlots: any, id: string) {
  const { comRefs: parentComRefs, todoPool } = useAppContext();
  const slotStoreRef = useRef<Record<string, SlotState>>({});
  // 用于触发重渲染的状态
  const [, forceUpdate] = useState({});

  return useMemo(() => {
    if (!rawSlots) return {};
    const nextSlots: AnyRecord = {};

    Object.entries(rawSlots).forEach(([slotKey, slotDef]: any) => {
      // 创建输入回调，当 inputs 被调用时更新 inputValues 并触发重渲染
      const onInputCall = (pin: string, value: any) => {
        const state = slotStoreRef.current[slotKey];
        if (state) {
          if (!state._inputValues) state._inputValues = {};
          state._inputValues[pin] = value;
          // 触发重渲染
          forceUpdate({});
        }
      };

      const state =
        slotStoreRef.current[slotKey] ||
        (slotStoreRef.current[slotKey] = {
          inputs: createChannelProxy(`${id}.${slotKey}.inputs`, onInputCall),
          outputs: createChannelProxy(`${id}.${slotKey}.outputs`),
          _inputs: createChannelProxy(`${id}.${slotKey}._inputs`),
          _scopedComRefs: {},
          _inputValues: {},
          _render: undefined,
          render: (params?: any) => {
            const r = state._render;
            // 只有当有实际的 inputValues 时才合并，否则保持 undefined 以便从父级继承
            const hasStateInputValues = state._inputValues && Object.keys(state._inputValues).length > 0;
            const hasParamsInputValues = params?.inputValues && Object.keys(params.inputValues).length > 0;

            const mergedParams = hasStateInputValues || hasParamsInputValues
              ? {
                  ...(params || {}),
                  inputValues: {
                    ...(state._inputValues || {}),
                    ...(params?.inputValues || {}),
                  },
                }
              : params || {};

            // 只有存在 key 或 index 时才认为是"多实例作用域插槽"，需要实例隔离
            const rawScope = mergedParams?.inputValues?.index ?? params?.key;
            if (rawScope === undefined || rawScope === null) {
              return (
                <SlotParamsBridge state={state} params={mergedParams} render={r} />
              );
            }

            const scopeId = `${id}.${slotKey}::${String(rawScope)}`;
            const index = mergedParams?.inputValues?.index ?? 0;
            const scopedComRefs =
              (state._scopedComRefs![scopeId] ||= createPenetratingComRefs(parentComRefs, todoPool, index));

            return (
              <ScopedComContextProvider comRefs={scopedComRefs} scopeId={scopeId}>
                <SlotParamsBridge state={state} params={mergedParams} render={r} />
              </ScopedComContextProvider>
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
  }, [rawSlots, id, parentComRefs, todoPool]);
}

export function ScopedComContextProvider(props: {
  comRefs?: any;
  scopeId: string;
  children: React.ReactNode;
}) {
  const parent = useAppContext();
  const value = useMemo(() => {
    return {
      ...parent,
      comRefs: props.comRefs || parent.comRefs,
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
