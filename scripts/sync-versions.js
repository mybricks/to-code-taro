/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

/**
 * 同步 core / components 的版本号到 _template/package.json
 *
 * pnpm sync-versions
 */

const ROOT = path.resolve(__dirname, '..')

const PACKAGES = [
  { name: '@mybricks/taro-core', dir: 'packages/core' },
  { name: '@mybricks/taro-components', dir: 'packages/components' },
]

const TEMPLATE_PATH = path.join(
  ROOT,
  'packages/to-code-taro/src/_template/package.json'
)

function readVersion(dir) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, dir, 'package.json'), 'utf-8')
  )
  return pkg.version
}

function main() {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'))

  let changed = false

  for (const { name, dir } of PACKAGES) {
    const version = readVersion(dir)
    const current = template.dependencies?.[name]
    const next = `^${version}`

    if (current !== next) {
      template.dependencies[name] = next
      console.log(chalk.green(`${name}: ${current} → ${next}`))
      changed = true
    } else {
      console.log(chalk.gray(`${name}: ${current} (无变化)`))
    }
  }

  if (changed) {
    fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2) + '\n')
    console.log(chalk.green('\n✔ _template/package.json 已更新'))
  } else {
    console.log(chalk.gray('\n无需更新'))
  }
}

main()
