# MyBricks To Code Taro

MyBricks Taro 代码生成插件，负责将 MyBricks 的 DSL (JSON) 转换为完整的 Taro 项目代码。

## 核心功能

- **DSL 转换**: 解析 MyBricks 协议，生成符合 Taro 规范的 TSX、Less 和配置。
- **项目组装**: 基于内置模板，自动生成完整的 Taro 项目文件结构。
- **依赖管理**: 自动分析并注入页面所需的组件和工具库依赖。
- **响应式支持**: 深度集成 MyBricks 逻辑流，支持变量、Fx、事件流与页面生命周期的自动绑定。

## 开发指南

### 常用命令

#### 1. 开发模式
```bash
npm run dev
```
启动 `father dev`，在开发过程中实时编译代码。

#### 2. 项目构建
```bash
npm run build
```
执行生产环境构建，生成 `dist` 目录下的产物。

#### 3. 运行通用测试
```bash
npm run test
```
运行 `test/index.ts`，验证核心转换逻辑是否正确（不输出物理文件）。

#### 4. 生成测试项目 (常用)
```bash
npm run test:project
```
执行 `test/genProject.ts`，根据 `test/test-data.json` 生成完整的物理 Taro 项目。
生成的产物将放在 `src/_output/project` 目录下，您可以直接将该目录拷贝到 Taro 开发环境中运行。

#### 5. 重新生成项目模板
```bash
npm run test:template
```
执行 `test/genTemplate.ts`。当您修改了 `src/_template` 目录下的基础模板文件后，**必须运行此命令**，以同步更新 `src/taro-template.json`。这个 JSON 文件是生成完整项目时的骨架。

## 项目结构

- `src/core`: 运行时核心工具库（由生成项目引用）。
- `src/utils`: 生成器内部使用的各种转换工具。
- `src/processors`: 场景、模块、事件等具体维度的处理逻辑。
- `src/_template`: 项目生成的基础骨架模板。
- `test/`: 包含测试数据和用于验证生成的脚本。

---

MyBricks Team

