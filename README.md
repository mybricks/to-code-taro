# MyBricks To Code Taro

MyBricks Taro 代码生成器 monorepo，将 MyBricks DSL (JSON) 转换为完整的 Taro 项目代码。

## 包结构

| 包名 | 路径 | 说明 |
|------|------|------|
| `@mybricks/to-code-taro` | `packages/to-code-taro` | 核心代码生成器 |
| `@mybricks/taro-core` | `packages/core` | 运行时核心工具库 (hooks, routing, context) |
| `@mybricks/taro-components` | `packages/components` | UI 组件库 |

## 核心功能

- **DSL 转换**: 解析 MyBricks 协议，生成符合 Taro 规范的 TSX、Less 和配置
- **项目组装**: 基于内置模板，自动生成完整的 Taro 项目文件结构
- **依赖管理**: 自动分析并注入页面所需的组件和工具库依赖
- **响应式支持**: 深度集成 MyBricks 逻辑流，支持变量、Fx、事件流与页面生命周期的自动绑定

## 开发指南

### 环境准备

```bash
pnpm install
```

### 构建

```bash
# 构建所有包
pnpm build

# 单独构建
pnpm build:core
pnpm build:components
pnpm build:generator
```

### 示例 / 测试

```bash
# 运行核心转换（不输出物理文件）
pnpm example

# 生成模板 + 完整 Taro 项目到 example/_output/project/
pnpm example:project
```

> 修改 `packages/to-code-taro/src/_template` 后，需要先运行 `example:project`（内含 genTemplate），以同步更新 `taro-template.json`。

### 开发模式

```bash
pnpm dev:core
pnpm dev:components
```

## 项目结构

```
├── packages/
│   ├── to-code-taro/       # 代码生成器
│   │   └── src/
│   │       ├── toCodeTaro.ts    # 核心转换逻辑
│   │       ├── processors/      # 场景、模块、事件处理器
│   │       ├── utils/           # 内部工具
│   │       ├── generate/        # 项目/模板 JSON 生成
│   │       └── _template/       # 项目骨架模板
│   ├── core/               # 运行时核心
│   │   └── src/
│   │       ├── runtime.ts       # configureCoreRuntime / getCoreRuntime
│   │       ├── utils/           # hooks, slots, routing, context
│   │       └── comlib/          # JS API 组件
│   └── components/         # UI 组件库
├── example/                # 示例 & 测试脚本
│   ├── test-data.json      # 测试用 DSL 数据
│   ├── index.ts            # 核心测试入口
│   ├── runCode.ts          # 转换配置
│   ├── genProject.ts       # 生成完整项目
│   ├── genTemplate.ts      # 生成模板 JSON
│   └── _output/            # 生成产物（不提交）
```

---

MyBricks Team
