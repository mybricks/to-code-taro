import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import 'brickd-mobile/lib/index.css' 
import "@taroify/icons/style"
import './app.less'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}
  


export default App
