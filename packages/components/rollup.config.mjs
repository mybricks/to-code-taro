import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import postcss from 'rollup-plugin-postcss'

const input = 'index.ts'

const external = (id) => {
  if (id === input) return false
  if (id.startsWith('.') || id.startsWith('/')) return false

  const externalLibs = [
    'react',
    'classnames',
    'dayjs',
    'brickd-mobile',
    '@tarojs/',
    '@taroify/icons',
    '@/',
    '@tarojs/components',
    '@tarojs/taro',
    '@antv/f2',
    'qrcode-generator',
    'lodash',
  ]

  return externalLibs.some((lib) => id.startsWith(lib))
}

const postcssPlugin = postcss({
  extract: 'index.css',
  minimize: true,
  autoModules: false,
  modules: {
    generateScopedName: 'mybricks_[local]__[hash:base64:5]',
  },
  use: ['less'],
})

const plugins = [
  nodeResolve({
    extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx'],
  }),
  commonjs(),
  json(),
  postcssPlugin,
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
  }),
]

export default [
  // ESM — preserveModules，保留模块结构，支持 tree-shaking
  {
    input,
    output: {
      dir: 'dist/es',
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: '.',
      sourcemap: true,
    },
    external,
    plugins,
  },
  // CJS — 单 bundle 兼容
  {
    input,
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'auto',
    },
    external,
    plugins: [
      nodeResolve({
        extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx'],
      }),
      commonjs(),
      json(),
      postcss({
        extract: 'index.css',
        minimize: true,
        autoModules: false,
        modules: {
          generateScopedName: 'mybricks_[local]__[hash:base64:5]',
        },
        use: ['less'],
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
  },
]
