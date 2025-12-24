# toCodeTaro vs toHarmonyCode 核心差异对比

## 概述

`toCodeTaro` 是基于 `toHarmonyCode` 的核心逻辑改造而来，主要将鸿蒙（HarmonyOS）代码生成改为 Taro/React 代码生成。

## 文件路径对照

### toCodeTaro 文件结构
```
to-code-taro/
├── src/
│   ├── index.ts                    # 主入口文件
│   ├── handleCom.ts                # 组件处理
│   ├── handleDom.ts                # DOM 节点处理
│   ├── handleSlot.ts               # 插槽处理
│   ├── handleModule.ts             # 模块处理
│   ├── handleGlobal.ts             # 全局变量/Fx 处理
│   ├── handleExtension.ts          # Extension 事件处理
│   ├── abstractEventTypeDef.ts     # 抽象事件类型定义
│   └── utils/
│       └── index.ts                # 工具函数（样式转换、代码生成等）
└── test/
    └── index.ts                    # 测试文件
```

### toHarmonyCode 文件结构（参考）
```
render-web/packages/code-next/src/toHarmonyCode/
├── index.ts                        # 主入口文件
├── handleCom.ts                    # 组件处理
├── handleDom.ts                    # DOM 节点处理
├── handleSlot.ts                   # 插槽处理
├── handleModule.ts                 # 模块处理
├── handleGlobal.ts                 # 全局变量/Fx 处理
├── handleExtension.ts              # Extension 事件处理
├── abstractEventTypeDef.ts         # 抽象事件类型定义
└── utils/
    ├── index.ts                    # 工具函数入口
    ├── code/
    │   └── index.ts                # 代码生成工具
    └── string.ts                   # 字符串工具
```

## 核心差异点

### 1. **样式转换系统** ⭐⭐⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/index.ts`

```typescript
// 第 33-78 行：convertHMFlexStyle
// 第 81-114 行：convertHMStyle
// 将 CSS 样式转换为鸿蒙 Flex 组件样式
export const convertHMFlexStyle = (style: Style) => {
  // 转换为 FlexDirection.Column/Row
  // 转换为 FlexAlign.Start/Center/End
  // 转换为 ItemAlign.Start/Center/End
  // 生成: Flex({ direction: FlexDirection.Column, ... })
}

// 第 135-239 行：convertComponentStyle
// 组件样式转换(风格化、root根节点)
export const convertComponentStyle = (style: Style) => {
  // 处理鸿蒙特有的样式转换
}
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/utils/index.ts`

```typescript
// 第 115-164 行：convertComponentStyle
// 直接使用 React 内联样式
export const convertComponentStyle = (style: Style) => {
  // 保持 CSS 属性不变
  // 生成: <View style={{ width: '100%', height: '100%' }}>
}
```

**关键差异：**
- 鸿蒙：需要将 CSS 属性映射到鸿蒙 Flex 组件的枚举值
- Taro：直接使用标准 CSS 属性，通过 `style` prop 传递

---

### 2. **组件代码生成** ⭐⭐⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/code/index.ts`

```typescript
// 第 283-351 行：getUiComponentCode
// 生成鸿蒙组件代码
export const getUiComponentCode = (params: any, config: any) => {
  // ...
  let ui =
    `${indent}/** ${meta.title} */` +
    `\n${indent}${componentName}({` +
    `\n${indent2}uid: "${meta.id}",` +
    `\n${indent2}controller: this.${currentProvider.name}.${componentController},` +
    `\n${indent2}data: ${genObjectCode(...)},` +
    `\n${indent2}styles: ${genObjectCode(...)},` +
    `\n${indent2}events: { ... },` +
    `\n${indent}})`;
  // ...
}
```

**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleCom.ts`

```typescript
// 第 403-415 行：调用 getUiComponentCode
const uiComponentCode = getUiComponentCode(
  {
    componentName,
    meta,
    currentProvider,
    componentController,
    props,
    resultStyle,
    slotsName,
    comEventCode,
  },
  config,
);
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleCom.ts`

```typescript
// 第 136-179 行：直接生成 JSX 代码
// 生成 React/JSX 组件代码
let uiComponentCode = `${indent}<${componentName}`;
uiComponentCode += `\n${indent2}uid="${meta.id}"`;
if (config.verbose) {
  uiComponentCode += `\n${indent2}title="${meta.title}"`;
}
uiComponentCode += `\n${indent2}data={${JSON.stringify(props.data || {})}}`;
uiComponentCode += `\n${indent2}style={${JSON.stringify(resultStyle.root)}}`;

if (comEventCode) {
  uiComponentCode += `\n${indent2}onEvents={{${comEventCode.replace(/\n/g, "\n" + indent2)}}}`;
}
```

**关键差异：**
- 鸿蒙：函数式调用语法 `Component({ ... })`
- Taro：JSX 语法 `<Component {...props} />`

---

### 3. **DOM/容器组件** ⭐⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/index.ts`

```typescript
// 第 242-296 行：convertHarmonyFlexComponent
// 生成鸿蒙 Flex 组件
export const convertHarmonyFlexComponent = (
  style: Style,
  config: { scope: boolean; child: string; ... }
) => {
  const hmStyle = convertHMFlexStyle(style);
  const { direction, justifyContent, alignItems } = hmStyle;
  
  return (
    `${indentation(initialIndent)}Flex({\n` +
    `${indentation(initialIndent + indentSize)}direction: ${direction},\n` +
    `${indentation(initialIndent + indentSize)}justifyContent: ${justifyContent},\n` +
    `${indentation(initialIndent + indentSize)}alignItems: ${alignItems},\n` +
    `${indentation(initialIndent)}}) {\n` +
    `${child}\n` +
    `${indentation(initialIndent)}}`
  );
}
```

**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleSlot.ts`

```typescript
// 第 225-233 行：使用 convertHarmonyFlexComponent
ui: !props.style.layout
  ? `${indent2}Column() {\n` + uiCode + `\n${indent2}}`
  : convertHarmonyFlexComponent(props.style, {
      scope: true,
      child: uiCode,
      useExtraFlex: true,
      indentSize: config.codeStyle!.indent,
      initialIndent: config.codeStyle!.indent * 2,
    }),
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleSlot.ts`

```typescript
// 第 51-55 行：生成 React View 组件
const indent = indentation(config.codeStyle!.indent * config.depth);

// 生成 Taro View 组件
const styleCode = JSON.stringify(props.style || {});
const uiResult = `${indent}<View style={${styleCode}}>\n${uiCode}\n${indent}</View>`;
```

**文件位置：** `to-code-taro/src/handleDom.ts`

```typescript
// 第 67-69 行：生成 View 组件
const indent = indentation(config.codeStyle!.indent * config.depth);
const styleCode = JSON.stringify(props.style || {});

const ui = `${indent}<View style={${styleCode}}>\n${uiCode}\n${indent}</View>`;
```

**关键差异：**
- 鸿蒙：使用 `Flex()` 组件，需要配置 direction、justifyContent 等
- Taro：使用 `<View>` 组件，通过 style 属性设置布局

---

### 4. **插槽处理** ⭐⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/code/index.ts`

```typescript
// 第 390-402 行：getBuilderCode
// 使用 @Builder 装饰器
export const getBuilderCode = (params: any, config: any) => {
  const { meta, slotsName, currentSlotsCode } = params;
  const indent = indentation(config.codeStyle!.indent);

  return (
    `${indent}/** ${meta.title}插槽 */\n` +
    `${indent}@Builder\n` +
    `${indent}${slotsName}(params: MyBricks.SlotParams) {\n` +
    currentSlotsCode +
    `\n${indent}}`
  );
}
```

**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleCom.ts`

```typescript
// 第 418-428 行：使用 getBuilderCode
return {
  slots: [
    getBuilderCode(
      {
        meta,
        slotsName,
        currentSlotsCode,
      },
      config,
    ),
    ...level0Slots,
  ],
  // ...
};
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleCom.ts`

```typescript
// 第 152-174 行：使用 JSX children
if (slots) {
  // 处理插槽
  let slotsCode = "";
  Object.entries(slots).forEach(([slotId, slot]: [string, any]) => {
    if (!slot.meta.scope) {
      const { js, ui } = handleSlot(slot, {
        ...config,
        checkIsRoot: () => false,
        depth: config.depth + 1,
      });
      eventCode += js;
      slotsCode += `\n${indent2}<View slot="${slotId}">${ui}</View>`;
    } else {
      // 作用域插槽处理
      const { js, ui } = handleSlot(slot, {
        ...config,
        checkIsRoot: () => false,
        depth: config.depth + 1,
      });
      eventCode += js;
      slotsCode += `\n${indent2}<View slot="${slotId}">${ui}</View>`;
    }
  });
}
```

**关键差异：**
- 鸿蒙：使用装饰器 `@Builder` 定义插槽函数
- Taro：使用 JSX children 和 slot 属性

---

### 5. **组件结构/类定义** ⭐⭐⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/code/index.ts`

```typescript
// 第 181-226 行：getSlotComponentCode
// 生成鸿蒙 @ComponentV2 结构体
export const getSlotComponentCode = (params: any, config: any) => {
  const {
    scene,
    isModule,
    providerCode,
    effectEventCode,
    jsCode,
    level0SlotsCode,
    uiCode,
    level1Slots,
  } = params;
  
  let slotComponentCode = "";
  slotComponentCode += `${isModule ? "export default " : ""}struct Index {`;
  slotComponentCode += `${isModule ? `\n${indent2}@Param uid: string = ""` : ""}`;
  slotComponentCode += providerCode ? `\n${providerCode}` : "";
  slotComponentCode += effectEventCode ? `\n\n${effectEventCode}` : "";
  
  return (
    (isModule ? "@Builder\nfunction empty() {\n}\n\n" : "") +
    `/** ${scene.title} */\n@ComponentV2\n` +
    (slotComponentCode ? `${slotComponentCode}\n\n` : "") +
    `${indentation2}build() {\n` +
    `${indentation4}Column() {\n${uiCode}\n${indentation4}}\n` +
    `${indentation2}}\n}` +
    level1Slots.join("\n")
  );
}
```

**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleSlot.ts`

```typescript
// 第 536-555 行：调用 getSlotComponentCode
const slotComponentCode = getSlotComponentCode(
  {
    scene,
    isModule,
    providerCode,
    effectEventCode,
    jsCode,
    level0SlotsCode,
    level1Slots,
    uiCode: isModule
      ? convertHarmonyFlexComponent(ui.props.style, {...})
      : uiCode,
  },
  config,
);
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleSlot.ts`

```typescript
// 第 17-62 行：生成 React 函数组件（简化版）
// 当前实现中，主要生成 JSX 代码片段
// 完整的组件结构需要外部包装
const handleSlot = (ui: UI, config: HandleSlotConfig) => {
  // ...
  // 生成 Taro View 组件
  const styleCode = JSON.stringify(props.style || {});
  const uiResult = `${indent}<View style={${styleCode}}>\n${uiCode}\n${indent}</View>`;

  return {
    js: jsCode,
    ui: uiResult,
    slots: [],
    scopeSlots: [],
  };
}
```

**关键差异：**
- 鸿蒙：生成完整的类结构体，包含生命周期方法
- Taro：生成 JSX 代码片段，需要外部包装成 React 组件

---

### 6. **事件处理** ⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleCom.ts`

```typescript
// 第 58-147 行：事件处理
// 事件作为对象属性
Object.entries(events).forEach(
  ([eventId, { type, isAbstract, diagramId, schema }]) => {
    // ...
    comEventCode +=
      `${indent}${eventId}: (${defaultValue}: MyBricks.EventValue) => {\n` +
      process +
      `\n${indent}},\n`;
  },
);

// 第 322-325 行：在组件代码中使用
(comEventCode
  ? `\n${indent2}events: {\n` + comEventCode + `${indent2}},`
  : "")
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleCom.ts`

```typescript
// 第 58-129 行：事件处理
// 事件作为 JSX 属性
Object.entries(events).forEach(
  ([eventId, { type, isAbstract, diagramId, schema }]: any) => {
    // ...
    comEventCode +=
      `${indent}${eventId}: (${defaultValue}: any) => {\n` +
      process +
      `\n${indent}},\n`;
  },
);

// 第 148-150 行：在组件代码中使用
if (comEventCode) {
  uiComponentCode += `\n${indent2}onEvents={{${comEventCode.replace(/\n/g, "\n" + indent2)}}}`;
}
```

**关键差异：**
- 鸿蒙：事件作为配置对象传递
- Taro：事件作为 JSX props 传递（命名可能不同）

---

### 7. **类型系统** ⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleCom.ts`

```typescript
// 第 112 行、125 行等：使用鸿蒙类型
const defaultValue = "value";
// ...
comEventCode +=
  `${indent}${eventId}: (${defaultValue}: MyBricks.EventValue) => {\n` +
  process +
  `\n${indent}},\n`;

// 第 547 行：类型定义
`\n${indent}const ${componentNameWithId} = ${callName || componentName}({` +
// ...
`\n${indent}}, appContext)\n`;
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleCom.ts`

```typescript
// 第 112 行、125 行等：使用 any 或通用类型（简化版）
const defaultValue = "value";
// ...
comEventCode +=
  `${indent}${eventId}: (${defaultValue}: any) => {\n` +
  process +
  `\n${indent}},\n`;

// 第 547 行：类型定义（使用 any）
`\n${indent}const ${componentNameWithId} = ${callName || componentName}({` +
// ...
`\n${indent}}, appContext)\n`;
```

**注意：** 实际应该使用 Taro 的类型定义，当前为简化实现

**关键差异：**
- 鸿蒙：有完整的类型定义系统
- Taro：当前使用 any，后续需要补充 Taro 类型定义

---

### 8. **导入语句** ⭐

#### toHarmonyCode (鸿蒙)
**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/handleSlot.ts`

```typescript
// 第 127-133 行：导入鸿蒙相关包
if (props.style.layout) {
  importManager.addImport({
    dependencyNames: ["LengthMetrics"],
    packageName: "@kit.ArkUI",
    importType: "named",
  });
}
```

**文件位置：** `render-web/packages/code-next/src/toHarmonyCode/utils/index.ts`

```typescript
// 第 242-296 行：convertHarmonyFlexComponent 中使用
// FlexDirection, FlexAlign, ItemAlign 等鸿蒙枚举
```

#### toCodeTaro (Taro/React)
**文件位置：** `to-code-taro/src/handleSlot.ts`

```typescript
// 当前实现中，导入语句由外部配置决定
// 应该导入 Taro/React 相关包，例如：
// import { View } from "@tarojs/components";
// import React from "react";
```

**注意：** 当前实现中，导入管理逻辑保留，但具体导入的包名由配置决定

**关键差异：**
- 鸿蒙：导入 ArkUI 相关组件和工具
- Taro：导入 Taro 组件和 React

---

## 保留的核心逻辑

以下核心逻辑在两个实现中**保持一致**：

1. ✅ **事件处理流程** (`handleProcess`)
   - **文件位置：** 
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/handleCom.ts` 第 504-971 行
     - toCodeTaro: `to-code-taro/src/handleCom.ts` 第 198-313 行
   - 节点声明逻辑
   - 节点调用逻辑
   - 参数传递机制

2. ✅ **组件元数据获取**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/index.ts` 第 16-34 行（接口定义）
     - toCodeTaro: `to-code-taro/src/index.ts` 第 16-34 行（接口定义）
   - `getComponentMeta` 接口
   - 组件导入管理

3. ✅ **Provider/Controller 系统**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/utils/code/index.ts` 第 105-179 行
     - toCodeTaro: `to-code-taro/src/index.ts` 第 320-334 行（Provider 接口定义）
   - Provider 管理逻辑
   - Controller 生成逻辑
   - 作用域管理

4. ✅ **变量和 Fx 处理**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/handleGlobal.ts`
     - toCodeTaro: `to-code-taro/src/handleGlobal.ts`
   - 全局变量处理
   - 全局 Fx 处理
   - 作用域变量处理

5. ✅ **Extension 事件处理**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/handleExtension.ts`
     - toCodeTaro: `to-code-taro/src/handleExtension.ts`
   - Extension API
   - Extension Bus
   - Extension Event

6. ✅ **抽象事件类型定义**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/abstractEventTypeDef.ts`
     - toCodeTaro: `to-code-taro/src/abstractEventTypeDef.ts`
   - 类型定义生成逻辑

7. ✅ **主入口逻辑**
   - **文件位置：**
     - toHarmonyCode: `render-web/packages/code-next/src/toHarmonyCode/index.ts` 第 89-576 行
     - toCodeTaro: `to-code-taro/src/index.ts` 第 105-443 行
   - 场景处理流程
   - 模块处理流程
   - 结果组装逻辑

---

## 总结

| 维度 | toHarmonyCode | toCodeTaro | 差异程度 |
|------|--------------|------------|---------|
| 样式系统 | 鸿蒙 Flex 组件 | React 内联样式 | ⭐⭐⭐ 高 |
| 组件语法 | 函数调用 | JSX 语法 | ⭐⭐⭐ 高 |
| DOM 容器 | Flex() | View | ⭐⭐ 中 |
| 插槽系统 | @Builder | JSX children | ⭐⭐ 中 |
| 组件结构 | @ComponentV2 | React 组件 | ⭐⭐⭐ 高 |
| 事件处理 | 配置对象 | JSX props | ⭐ 低 |
| 类型系统 | 完整类型 | any（待完善） | ⭐⭐ 中 |
| 核心逻辑 | - | - | ✅ 一致 |

**核心改动：**
- **输出格式**：从鸿蒙语法改为 JSX/React 语法
- **样式处理**：从鸿蒙 Flex 组件改为标准 CSS
- **组件调用**：从函数调用改为 JSX 标签

**保持不变：**
- **业务逻辑**：事件处理、数据流、作用域管理等核心逻辑完全保留

