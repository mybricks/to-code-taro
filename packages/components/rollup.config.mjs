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

export default [
  {
    input,
    output: [
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        interop: 'auto',
      },
    ],
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
        autoModules: false, // isAutoModule 检查的是文件名是否包含 .module.。我们的文件是 style.less、index.less，不含 .module.，所以 isAutoModule = false，CSS Modules 根本没启用
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
