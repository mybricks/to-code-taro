/**
 * 构建 frames 映射表
 * 参考鸿蒙实现 handleFrame.ts
 * 用于快速查找 frame 和对应的组件信息
 */

export interface FrameMapItem {
  frame: any;
  meta: any;
}

export type FrameMap = Record<string, FrameMapItem>;

/**
 * 递归构建 frameMap
 * @param frames - 要处理的 frames 数组
 * @param frameMap - 目标 frameMap 对象
 * @param tojson - 完整的 tojson 数据，用于查找组件信息
 */
const buildFrameMapRecursive = (
  frames: any[],
  frameMap: FrameMap,
  tojson: any,
  config?: {
    getComInfo?: (comId: string) => any;
  },
) => {
  frames.forEach((frame) => {
    frameMap[frame.id] = {
      frame,
      meta: config?.getComInfo?.("") || undefined,
    };

    // 递归处理子 frames（frame.frames）
    if (frame.frames && frame.frames.length > 0) {
      buildFrameMapRecursive(frame.frames, frameMap, tojson, config);
    }

    // 递归处理组件内的 frames（frame.coms）
    if (frame.coms) {
      Object.entries(frame.coms).forEach(([comId, comFrame]: [string, any]) => {
        if (comFrame.frames && comFrame.frames.length > 0) {
          buildFrameMapRecursive(
            comFrame.frames,
            frameMap,
            tojson,
            {
              getComInfo: (id) => {
                // 查找对应的组件信息
                for (const scene of tojson.scenes) {
                  const comInfo = scene.coms?.[comId || id];
                  if (comInfo) {
                    return comInfo;
                  }
                }
                return undefined;
              },
            },
          );
        }
      });
    }
  });
};

/**
 * 构建完整的 frameMap
 * @param tojson - 完整的 tojson 数据
 * @returns frameMap 对象
 */
export const buildFrameMap = (tojson: any): FrameMap => {
  const frameMap: FrameMap = {};

  // 处理所有场景的 frames
  tojson.frames.forEach((frame: any) => {
    // 处理场景级别的 frame
    if (frame.id && !frameMap[frame.id]) {
      frameMap[frame.id] = {
        frame,
        meta: undefined,
      };
    }

    // 递归处理 frame 的子 frames
    if (frame.frames && frame.frames.length > 0) {
      buildFrameMapRecursive(frame.frames, frameMap, tojson);
    }

    // 递归处理 frame 内组件的 frames
    if (frame.coms) {
      Object.entries(frame.coms).forEach(([comId, comFrame]: [string, any]) => {
        if (comFrame.frames && comFrame.frames.length > 0) {
          buildFrameMapRecursive(comFrame.frames, frameMap, tojson, {
            getComInfo: (id) => {
              for (const scene of tojson.scenes) {
                const comInfo = scene.coms?.[comId || id];
                if (comInfo) {
                  return comInfo;
                }
              }
              return undefined;
            },
          });
        }
      });
    }
  });

  // 处理全局 FX frames
  if (tojson.global.fxFrames && tojson.global.fxFrames.length > 0) {
    tojson.global.fxFrames.forEach((fxFrame: any) => {
      if (!frameMap[fxFrame.id]) {
        frameMap[fxFrame.id] = {
          frame: fxFrame,
          meta: undefined,
        };
      }
    });
  }

  return frameMap;
};

