/**
 * 待执行指令池
 * 结构：Map<组件ID, Map<索引, Record<方法名, 参数数组>>>
 */
export class TodoPool {
  private pool = new Map<string, Map<number, Record<string, any[]>>>();

  /** 存：记录待执行指令 */
  push(id: string, index: number, method: string, args: any[]) {
    if (!this.pool.has(id)) {
      this.pool.set(id, new Map());
    }
    const instances = this.pool.get(id)!;
    if (!instances.has(index)) {
      instances.set(index, {});
    }
    instances.get(index)![method] = args;
  }

  /** 取：获取并物理删除指令 */
  pop(id: string, index: number, method: string): any[] | undefined {
    const instances = this.pool.get(id);
    if (!instances) return undefined;

    const todo = instances.get(index);
    if (todo && todo[method]) {
      const args = todo[method];
      delete todo[method];

      // 自动清理：如果当前索引下没指令了，删掉索引容器
      if (Object.keys(todo).length === 0) {
        instances.delete(index);
      }
      // 如果当前组件下没索引了，删掉整个 ID
      if (instances.size === 0) {
        this.pool.delete(id);
      }
      return args;
    }
    return undefined;
  }
}
