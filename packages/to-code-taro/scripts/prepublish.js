/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const inquirer = require('inquirer').default || require('inquirer')
const chalk = require('chalk')

const PKG_ROOT = path.resolve(__dirname, '..')
const MONO_ROOT = path.resolve(PKG_ROOT, '../..')

const PACKAGES = [
  { name: '@mybricks/taro-core', dir: 'packages/core' },
  { name: '@mybricks/taro-components', dir: 'packages/components' },
]

const TEMPLATE_PATH = path.join(PKG_ROOT, 'src/_template/package.json')

function syncVersions() {
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf-8'))
  let changed = false

  for (const { name, dir } of PACKAGES) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(MONO_ROOT, dir, 'package.json'), 'utf-8')
    )
    const current = template.dependencies?.[name]
    const next = `^${pkg.version}`

    if (current !== next) {
      template.dependencies[name] = next
      console.log(chalk.green(`  ${name}: ${current} → ${next}`))
      changed = true
    } else {
      console.log(chalk.gray(`  ${name}: ${current} (无变化)`))
    }
  }

  if (changed) {
    fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2) + '\n')
    console.log(chalk.green('  ✔ _template/package.json 已更新\n'))
  } else {
    console.log(chalk.gray('  无需更新\n'))
  }
}

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: PKG_ROOT })
}

async function main() {
  try {
    const { shouldSync, shouldGen, shouldBuild } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldSync',
        message: '是否同步版本号？',
        default: true,
      },
      {
        type: 'confirm',
        name: 'shouldGen',
        message: '是否生成新模板？',
        default: true,
      },
      {
        type: 'confirm',
        name: 'shouldBuild',
        message: '是否构建？',
        default: true,
      },
    ])

    if (shouldSync) {
      console.log(chalk.cyan('\n正在同步版本号...'))
      syncVersions()
    } else {
      console.log(chalk.gray('\n跳过版本号同步'))
    }

    if (shouldGen) {
      console.log(chalk.cyan('正在生成模板...'))
      run('npx tsx scripts/gen-template.ts')
      console.log(chalk.green('  ✔ 模板 JSON 已生成\n'))
    } else {
      console.log(chalk.gray('跳过模板生成\n'))
    }

    if (shouldBuild) {
      console.log(chalk.cyan('正在构建...'))
      run('father doctor && npm run build')
      console.log(chalk.green('  ✔ 构建完成\n'))
    } else {
      console.log(chalk.gray('跳过构建\n'))
    }

    const { shouldPublish } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldPublish',
        message: '是否继续发布到 npm？',
        default: true,
      },
    ])

    if (shouldPublish) {
      run('npm publish')
      console.log(chalk.green('\n发布完成'))
    } else {
      console.log(chalk.yellow('\n已取消发布'))
    }
  } catch (e) {
    console.error('发布流程失败:', e.message)
    process.exit(1)
  }
}

main()
