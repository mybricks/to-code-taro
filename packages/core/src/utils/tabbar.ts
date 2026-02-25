import { EventEmitter } from './event'

const isDefine = (val) => val !== undefined && val !== null && val !== ''

class TabbarInstance {
  list: any = []

  eventEmitter = new EventEmitter()

  setTabBarBadge = ({ index, text }) => new Promise((resolve, reject) => {
    if (isDefine(index)) {
      this.list[index].active = true
      this.list[index].activeText = text

      console.log('change', this.list)
      this.eventEmitter.dispatch('change', this.list)
    }
    
  })

  hideTabBarRedDot = ({ index }) => new Promise((resolve, reject) => {
    if (isDefine(index)) {
      this.list[index].active = false
      this.list[index].activeText = 0

      this.eventEmitter.dispatch('change', this.list)
    }
  })

  removeTabBarBadge = this.hideTabBarRedDot

  initWithLength = len => {
    this.list = new Array(len).fill(t => null).map(() => ({ active: false, activeText: '' }))
  }
}

export const tabbarIns = new TabbarInstance()