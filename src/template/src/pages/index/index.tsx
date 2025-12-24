import { View, Text , Button } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.less'

export default function Index () {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View>
      <Text>Hello world</Text>
    </View>
  )
}
