import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { configureCoreRuntime } from '@mybricks/taro-core'
// @ts-ignore
import { request } from '@/common/request'
// @ts-ignore
import rootConfig from '@/common/rootConfig'
// @ts-ignore
import tabBarConfig from '@/custom-tab-bar/tabBar.json'
import 'brickd-mobile/lib/index.css'
import '@mybricks/taro-components/dist/index.css'
import "@taroify/icons/style"
import './app.less'

configureCoreRuntime({ request, rootConfig, tabBarConfig })

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}


export default App
