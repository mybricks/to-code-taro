// Runtime configuration
export { configureCoreRuntime, getCoreRuntime } from './src/runtime';
export type { CoreRuntimeConfig } from './src/runtime';

// Utils (hooks, components, routing, slots, mybricks re-exports)
export * from './src/utils/index';

// Comlib (JS API components)
export * from './src/comlib/Index';

// MyBricks core — additional exports not covered by utils/index
export { createJSHandle } from './src/mybricks';
