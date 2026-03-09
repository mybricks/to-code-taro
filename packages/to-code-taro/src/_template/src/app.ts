import {Component, PropsWithChildren} from 'react';
import {configureCoreRuntime} from '@mybricks/taro-core';
// @ts-ignore
import {request} from '@/common/request';
// @ts-ignore
import rootConfig from '@/common/rootConfig';
// @ts-ignore
import tabBarConfig from '@/custom-tab-bar/tabBar.json';
import 'brickd-mobile/lib/index.css';
import '@mybricks/taro-components/dist/index.css';
import '@taroify/icons/style';
import './app.less';

configureCoreRuntime({request, rootConfig, tabBarConfig});

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  // this.props.children 是将要会渲染的页面
  render() {
    return this.props.children;
  }
}
export default App;
