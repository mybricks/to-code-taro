import { TodoPool } from './pool';

/**
 * 组件引用解析器
 *
 * 职责单一：管理组件引用的查找、创建和注册
 *
 * 核心机制：
 * 1. 查找真实引用时，优先本地，再查父级
 * 2. 未找到时创建影子对象，影子对象调用时会动态查找真实引用
 * 3. 注册真实引用时，向上渗透到父级
 */
export class ComRefResolver {
  constructor(
    private registry: Record<string, any>,
    private parent?: ComRefResolver,
    private todoPool?: TodoPool,
    private scopeIndex: number = 0
  ) {}

  /**
   * 获取组件引用
   * @returns 真实引用或影子对象
   */
  get(id: string): any {
    // 1. 优先检查本地是否有真实引用
    if (this.registry[id] && !this.registry[id].__isShadow) {
      return this.registry[id];
    }

    // 2. 检查父级是否有真实引用
    const parentRef = this.parent?.findRealRef(id);
    if (parentRef) {
      return parentRef;
    }

    // 3. 如果已有影子对象，直接返回
    if (this.registry[id]?.__isShadow) {
      return this.registry[id];
    }

    // 4. 创建影子对象
    return this.createShadowProxy(id);
  }

  /** 注册真实引用，并向上渗透 */
  set(id: string, ref: any): void {
    this.registry[id] = ref;
    this.parent?.set(id, ref);
  }

  /** 删除引用 */
  delete(id: string): void {
    delete this.registry[id];
    this.parent?.delete(id);
  }

  /** 在本地查找真实引用（不创建影子） */
  findRealRef(id: string): any | undefined {
    if (this.registry[id] && !this.registry[id].__isShadow) {
      return this.registry[id];
    }
    return this.parent?.findRealRef(id);
  }

  /**
   * 创建影子代理对象
   * 调用时动态检查真实引用，未找到则缓冲到 TodoPool
   */
  private createShadowProxy(id: string): any {
    const registry = this.registry;
    const todoPool = this.todoPool;
    const scopeIndex = this.scopeIndex;

    const shadow = new Proxy({ __isShadow: true }, {
      get(_, method: string) {
        if (method === '__isShadow') return true;

        return (...args: any[]) => {
          // 动态检查是否已有真实引用
          const realRef = registry[id];
          if (realRef && !realRef.__isShadow) {
            if (typeof realRef[method] === 'function') {
              return realRef[method](...args);
            }
            return;
          }

          // 未找到真实引用，缓冲到 TodoPool
          if (todoPool instanceof TodoPool) {
            todoPool.push(id, scopeIndex, method, args);
          }
        };
      }
    });

    // 存储影子对象
    this.registry[id] = shadow;
    return shadow;
  }
}
