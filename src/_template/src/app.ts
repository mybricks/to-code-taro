import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import '@mybricks/taro-components/dist/index.css';
import './app.global.less'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}
  


export default App
