/**
 * 创建事件查询函数
 * 用于从事件列表中查询特定类型的事件
 */

import type { BaseConfig } from "../../toCodeTaro";

type Event = ReturnType<BaseConfig["getEventByDiagramId"]>;

/**
 * 创建变量事件查询函数
 */
export const createGetVarEvents = (events: any[]) => {
  return (params?: { comId?: string; slotId?: string }) => {
    if (!params) {
      return events.filter((event) => {
        return (
          (event.type === "var" && !event.meta.parentComId) ||
          (event.type === "listener" && !event.meta.proxy.parentComId)
        );
      });
    }
    return events.filter((event) => {
      return (
        (event.type === "var" &&
          params.comId === event.meta.parentComId &&
          params.slotId === event.meta.frameId) ||
        (event.type === "listener" &&
          params.comId === event.meta.proxy.parentComId &&
          params.slotId === event.meta.proxy.frameId)
      );
    });
  };
};

/**
 * 创建 FX 事件查询函数
 */
export const createGetFxEvents = (events: any[]) => {
  return (params?: { comId?: string; slotId?: string }) => {
    if (!params) {
      return events.filter((event) => {
        return event.type === "fx" && !event.parentComId;
      });
    }
    return events.filter((event) => {
      return (
        event.type === "fx" &&
        params.comId === event.parentComId &&
        params.slotId === event.parentSlotId
      );
    });
  };
};

/**
 * 创建生命周期事件查询函数
 */
export const createGetEffectEvent = (events: any[]) => {
  return (params?: { comId: string; slotId: string }) => {
    if (!params) {
      // 主场景
      return events.find((event) => {
        return !event.slotId; // 没有slotId，认为是主场景
      })!;
    } else {
      // 作用域插槽
      const { comId, slotId } = params;
      return events.find((event) => {
        return event.slotId === slotId && event.comId === comId;
      })!;
    }
  };
};

/**
 * 创建事件查询函数集合
 */
export const createEventQueries = (events: any[]) => {
  return {
    getVarEvents: createGetVarEvents(events),
    getFxEvents: createGetFxEvents(events),
    getEffectEvent: createGetEffectEvent(events),
    getEventByDiagramId: (diagramId: string) => {
      // 兼容：部分 event 没有 diagramId 字段，而是直接用 id 存储 diagramId
      return events.find((event) => event.diagramId === diagramId || event.id === diagramId)!;
    },
    /** 获取场景/区块的输入项事件 */
    getFrameInputEvent: (pinId: string, frameId?: string) => {
      return events.find((event) => {
        const starter = event.starter;

        if (starter && starter.type === "frame") {
          // 如果提供了 frameId，则必须匹配
          if (frameId && starter.frameId && starter.frameId !== frameId) {
            return false;
          }

          return (
            starter.pinId === pinId ||
            starter.pinAry?.some((p: any) => p.id === pinId || p.pinId === pinId)
          );
        }

        // 兼容 toCode 输出中没有 starter 但有 paramPins 的情况
        if (event.paramPins?.some((p: any) => p.id === pinId)) {
          return true;
        }

        return false;
      });
    },
  };
};

