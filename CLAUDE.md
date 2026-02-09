# CLAUDE.md

## 角色 
- 你是一位架构师 所有的修改尽量从架构的方向考虑 改动较大的时候 先问我的建议 要求代码优雅

## 项目概述

`@mybricks/to-code-taro` — MyBricks DSL (JSON) 转 Taro 项目代码的生成器。将 MyBricks 协议转换为完整的 Taro TSX/Less 项目。

## 技术栈

- TypeScript (target ES2017, JSX react)
- father (构建工具，输出 CJS + ESM 到 `dist/`)
- tsx (测试运行器)
- 依赖: `@mybricks/to-code-react`, `crypto-js`
- Peer 依赖: `@mybricks/code-next`, `@tarojs/components`, `@tarojs/taro`, `react`

## 常用命令

- `npm run dev` — 开发模式 (father dev)
- `npm run build` — 生产构建
- `npm run test` — 运行核心转换测试 (不输出文件)
- `npm run test:project` — 根据 `test/test-data.json` 生成完整 Taro 项目到 `src/_output/project`
- `npm run test:template` — 修改 `src/_template` 后**必须运行**，同步更新 `src/taro-template.json`

## 项目结构

```
src/
├── index.ts              # 入口，导出 toCodeTaro / generateTaroProjectJson / generateTaroTempalteJson
├── toCodeTaro.ts         # 核心转换逻辑
├── handleCom.ts          # 组件处理
├── handleDom.ts          # DOM 节点处理
├── handleSlot.ts         # 插槽处理
├── handleModule.ts       # 模块处理
├── handleGlobal.ts       # 全局变量和 Fx 处理
├── processors/           # 场景、模块、事件等处理器
├── utils/                # 生成器内部工具 (ImportManager, 样式转换, 上下文构建, 逻辑处理)
├── core/                 # 运行时核心工具库 (由生成的项目引用，不参与编译)
├── _template/            # 项目生成骨架模板 (不参与编译)
├── _output/              # 生成产物输出目录 (不应提交)
└── generate/             # 项目/模板 JSON 生成逻辑
test/
├── test-data.json        # 测试用 DSL 数据
├── index.ts              # 核心测试
├── genProject.ts         # 生成完整项目
└── genTemplate.ts        # 生成模板 JSON
```

## 重要约定
- src/core 的代码 要和 src/_template/src/core保持一致 修改任何一方都要同步
- 有文件修改之后运行 `npm run test:template` 和`npm run test:project`  会在 _output 输出产物，这里的内容就是测试内容
- 所有的回答使用中文
