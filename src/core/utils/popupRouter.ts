import { Page } from '../mybricks';

/**
 * 弹窗在 Taro 中被视为组件 兼容APP TODO
 */
class PopupStore {
  private activePopup: any = null;
  private listeners: Set<(state: any) => void> = new Set();

  /** 订阅弹窗状态变化 */
  subscribe(listener: (state: any) => void) {
    this.listeners.add(listener);
    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) =>
      l(
        this.activePopup || {
          visible: false,
          name: '',
          value: null,
          controller: null,
        },
      ),
    );
  }

  /** 获取弹窗参数 */
  getParams(name: string) {
    if (this.activePopup && this.activePopup.name === name) {
      return {
        value: this.activePopup.value,
        controller: this.activePopup.controller,
      };
    }
    return { value: null };
  }

  /** 获取当前激活的弹窗名称 */
  getActiveName(): string | undefined {
    return this.activePopup?.name;
  }

  /** 打开弹窗 */
  push(name: string, { value, controller }: any) {
    this.activePopup = { visible: true, name, value, controller };
    this.notify();
  }

  /** 行为同 push */
  replace(name: string, params: any) {
    this.push(name, params);
  }

  /** 关闭弹窗 */
  pop() {
    this.activePopup = null;
    this.notify();
  }
}

const popupStore = new PopupStore();

/**
 * 订阅弹窗状态变化（统一入口，避免外部依赖内部实现细节）
 */
export const subscribePopupRouter = (listener: (state: any) => void) => {
  return popupStore.subscribe(listener);
};

/** 弹窗控制器（命名与文件名保持一致） */
export const popupRouter = new Page(popupStore);

/**
 * 关闭当前激活的弹窗（用于 TabBar 点击等场景）
 * 不需要知道弹窗 id
 */
export const closeActivePopupRouter = () => {
  const name = popupStore.getActiveName();
  if (!name) return;
  // 走 Page.close，保证 close/commit/cancel 等控制器语义保持一致
  popupRouter.close(name);
};


