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
        modules: true,
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
