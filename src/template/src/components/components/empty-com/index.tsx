import React from 'react';
import { View } from "@tarojs/components";
import css from './style.module.less';


export default ({ title = '暂无内容' }) => {
  return (
    <View className={css.emptyCom}>
      {title}
    </View>
  )
}