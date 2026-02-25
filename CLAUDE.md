# CLAUDE.md

## 角色 
- 你是一位架构师 所有的修改尽量从架构的方向考虑 改动较大的时候 先问我的建议 要求代码优雅

## 项目概述

pnpm monorepo，包含代码生成器和运行时包。

## 技术栈

- pnpm workspace (monorepo)
- TypeScript
- father (生成器构建)、rollup (core/components 构建)
- tsx (测试运行器)

## 常用命令

- `pnpm build` — 构建所有包
- `pnpm build:core` — 构建 @mybricks/taro-core
- `pnpm build:components` — 构建 @mybricks/taro-components
- `pnpm build:generator` — 构建 @mybricks/to-code-taro
- `pnpm example` — 运行核心转换测试（不输出文件）
- `pnpm example:project` — 生成模板 + 完整 Taro 项目到 `example/_output/project`

## 项目结构

```
packages/
├── to-code-taro/           # @mybricks/to-code-taro（代码生成器）
│   └── src/
│       ├── index.ts        # 入口
│       ├── toCodeTaro.ts   # 核心转换逻辑
│       ├── processors/     # 场景、模块、事件等处理器
│       ├── utils/          # 生成器内部工具
│       ├── generate/       # 项目/模板 JSON 生成逻辑
│       └── _template/      # 项目生成骨架模板
├── core/                   # @mybricks/taro-core（运行时核心）
│   ├── index.ts            # barrel export
│   └── src/
│       ├── runtime.ts      # configureCoreRuntime / getCoreRuntime
│       ├── utils/          # hooks, slots, routing, context
│       ├── mybricks/       # MyBricks 核心逻辑
│       ├── comlib/         # JS API 组件
│       └── tools/          # 通用工具
└── components/             # @mybricks/taro-components（UI 组件库）
    ├── index.ts
    └── src/                # 所有 UI 组件
example/                    # 示例 & 测试脚本
├── test-data.json          # 测试用 DSL 数据
├── runCode.ts              # 转换配置
├── genProject.ts           # 生成完整项目
├── genTemplate.ts          # 生成模板 JSON
└── _output/                # 生成产物（不提交）
```

## $outputs 与帧输出(frameOutput)代码生成

### 运行时 $outputs 机制 (src/core/utils/hooks.ts - useBindOutputs)
- 每个 `WithCom` 实例通过 `useBindOutputs` 注册 `comRefs.current.$outputs[id]`
- 当组件有 slots 时，`$outputs[id]` 是一个 Proxy，优先查找 slot outputs，再 fallback 到 event proxy
- slot outputs 由 `useEnhancedSlots` 中的 `createChannelProxy` 创建，每个 slot 独立隔离

### 代码生成阶段 (src/utils/logic/handleProcess.ts)
- `nodesInvocation` 中 `type === "frameOutput"` 的节点表示插槽的 output pin 调用
- `props.meta` 中 **不包含** `parentComId` / `frameId`（`@mybricks/to-code-react` 未传递）
- 需要通过 `scene.cons` 反查 `comId`，匹配条件必须包含 `event.comId`（父组件 ID）来消歧义
- `event.comId` 在 slot 类型事件中可用，`event.meta?.parentComId` 在 com 类型事件中可用

### 已修复的 Bug
- **多组件帧输出指向错误**: 当多个相同组件（如两个 FormImageUploader）有相同 pinId 时，`.find()` 必须用 `event.comId` 匹配 `con.comId`，否则始终返回第一个组件的连接

## 重要约定
- 有文件修改之后运行 `pnpm example:project` 会在 `example/_output` 输出产物，这里的内容就是测试内容
- 所有的回答使用中文
