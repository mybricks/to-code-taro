/* eslint-disable no-console */
const { exec } = require('child_process')
const concurrently = require('concurrently')
const minimist = require('minimist')
const chalk = require('chalk')

/**
 * pnpm run link
 * --projectPath /Users/xxx/Desktop/taro-project
 * --packages @mybricks/taro-core,@mybricks/taro-components
 * --unlink
 *
 * projectPath: 调试的目标项目路径
 * packages: 调试的包（默认 core + components）
 * unlink: 是否进行 unlink，默认为 link
 */

const args = minimist(process.argv.slice(2))
const {
  packages: packagesStr,
  projectPath,
  unlink,
} = args

const DEFAULT_PACKAGES = '@mybricks/taro-core,@mybricks/taro-components'
const packages = (packagesStr || DEFAULT_PACKAGES).split(',')
const linkType = unlink ? 'unlink' : 'link'

function execCommand(command, successMessage, errorMessage) {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        console.error(chalk.red(errorMessage), error)
        return reject(error)
      }
      console.log(chalk.green(successMessage))
      resolve()
    })
  })
}

function linkToGlobal() {
  return Promise.all(packages.map(pkg =>
    execCommand(
      `pnpm --filter ${pkg} exec yarn ${linkType}`,
      `已在全局将 ${pkg} ${linkType}`,
      `yarn ${linkType} ${pkg} 出错`
    )
  ))
}

function linkToLocal() {
  return Promise.all(packages.map(pkg =>
    execCommand(
      `cd ${projectPath} && yarn ${linkType} ${pkg}`,
      `已在项目中将 ${pkg} ${linkType}`,
      `yarn ${linkType} ${pkg} 出错`
    )
  ))
}

function forceInstall() {
  console.log(chalk.green('正在项目中为您安装 unlink 的包...'))
  return execCommand(
    `cd ${projectPath} && yarn install --force`,
    '已在项目中为您安装 unlink 的包',
    'yarn install --force 出错'
  )
}

function runDevConcurrently() {
  const devMap = {
    '@mybricks/taro-core': 'dev:core',
    '@mybricks/taro-components': 'dev:components',
  }

  const commands = packages
    .filter(pkg => devMap[pkg])
    .map(pkg => `pnpm run ${devMap[pkg]}`)

  if (!commands.length) return

  console.log(chalk.green('启动 watch 模式...'))

  const { result } = concurrently(commands, {
    prefix: 'name',
    killOthers: ['failure', 'success'],
  })

  return result.catch((error) => {
    console.error(chalk.red('自动编译出错:'), error)
  })
}

async function main() {
  if (!projectPath) {
    console.error(chalk.red('请指定 --projectPath 参数'))
    return
  }

  try {

    if (unlink) {
      await linkToLocal()
      await linkToGlobal()
      await forceInstall()
    } else {
      await linkToGlobal()
      await linkToLocal()
      await runDevConcurrently()
    }
  } catch (error) {
    console.error(chalk.red('工作流执行出错:'), error)
  }
}

main()
