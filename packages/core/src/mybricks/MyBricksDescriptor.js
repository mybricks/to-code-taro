import {
  VARS_MARK,
  SUBJECT_VALUE,
  BASECONTROLLER_MARK,
  MYBRICKS_DESCRIPTOR,
  CONTROLLER_CONTEXT
} from "./constant"
import { createModuleEventsHandle } from "./createModuleEventsHandle"
import { log } from "./log"

const DEFAULT_GETVAR_RESULT = {
  setValue(value) {
    log("setValue - 变量未定义，请检查")
  },
  getValue() {
    log("getValue - 变量未定义，请检查")
    return
  }
}
const getVar = ({ that, varName }) => {
  const myBricksDescriptor = that[MYBRICKS_DESCRIPTOR]
  if (!myBricksDescriptor) {
    return DEFAULT_GETVAR_RESULT
  }
  const { vars, params, parent } = myBricksDescriptor
  const var0 = vars?.[varName]
  if (var0) {
    return var0.ext()
  }

  if (["page", "popup", "module"].includes(params.type)) {
    // 模块、页面、弹窗是最上层，不再继续向上查
    const var0 = params.appContext?.globalVars?.[varName]

    if (var0) {
      return var0.ext()
    }

    return DEFAULT_GETVAR_RESULT
  }
  return getVar({ that: parent, varName })
}

const DEFAULT_GETOUTPUT_RESULT = {
  setValue(value) {
    log("setValue - 输出未定义，请检查")
  },
}
const getOutput = ({ that, outputName }) => {
  const myBricksDescriptor = that[MYBRICKS_DESCRIPTOR]
  if (!myBricksDescriptor) {
    return DEFAULT_GETOUTPUT_RESULT
  }

  const { params, controller, parent } = myBricksDescriptor
  const { type, outputNameMap, pageId } = params
  const outputKey = outputNameMap ? (outputNameMap[outputName] || outputName) : outputName

  if (type === "module") {
    if (controller.events?.[outputKey]) {
      return {
        setValue(value) {
          controller.events?.[outputKey](value)
        },
      }
    }
  } else if (type === "popup") {
    if (["commit", "apply", "cancel", "close"].includes(outputKey)) {
      return {
        setValue(value) {
          params.appContext?.page?.[outputKey](pageId, value)
        },
      }
    }
  } else if (type === "slot") {
    if (that.params.outputs && outputKey in that.params.outputs) {
      return {
        setValue(value) {
          that.params.outputs[outputKey](value)
        },
      }
    }
  }

  if (["page", "popup", "module"].includes(type)) {
    // 模块、页面、弹窗是最上层，不再继续向上查
    return DEFAULT_GETOUTPUT_RESULT
  }

  return getOutput({ that: parent, outputName })
}

const DEFAULT_GETINPUT_RESULT = {
  getValue(value) {
    log("getValue - 输入未定义，请检查")
  },
}
const getInput = ({ that, inputName }) => {
  const myBricksDescriptor = that[MYBRICKS_DESCRIPTOR]
  if (!myBricksDescriptor) {
    return DEFAULT_GETINPUT_RESULT
  }

  const { params, controller, parent } = myBricksDescriptor
  const { type, inputNameMap, pageId } = params
  const inputKey = (inputNameMap ? inputNameMap[inputName] : inputName) || inputName

  if (type === "slot") {
    if (inputKey in that.params.inputValues) {
      return {
        getValue() {
          return that.params.inputValues[inputKey]
        }
      }
    }
  } else if (type === "page" || type === "popup") {
    if (inputKey === "open") {
      return {
        getValue() {
          return params.appContext?.page?.getParams(pageId)?.[SUBJECT_VALUE]
        }
      }
    }

    return DEFAULT_GETINPUT_RESULT
  } else if (type === "module") {
    return {
      getValue() {
        if (inputKey in controller.data) {
          return controller.data[inputKey]
        }
        return controller.controller?.[inputKey]?.[SUBJECT_VALUE]
      }
    }
  }

  if (["page", "popup", "module"].includes(type)) {
    // 模块、页面、弹窗是最上层，不再继续向上查
    return DEFAULT_GETINPUT_RESULT
  }

  return getInput({ that: parent, inputName })
}

export function MyBricksDescriptor(params) {
  return (target, key, descriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = function (...args) {
      let controller = null
      let vars = null

      Object.keys(this.__proto__).filter((key) => !key.startsWith("__ob_")).forEach((key) => {
        // 过滤出当前组件自身声明的Provider
        const value = this[key]

        if (value?.[BASECONTROLLER_MARK]) {
          const descriptor = Object.getOwnPropertyDescriptor(this, key)
          if (!descriptor?.get) {
            controller = value
          }
        } else if (value?.[VARS_MARK]) {
          const descriptor = Object.getOwnPropertyDescriptor(this, key)
          if (!descriptor?.get) {
            vars = value
          }
        }
      })

      this[MYBRICKS_DESCRIPTOR] = {
        controller,
        vars,
        params,
        parent: this.getParent()
      }

      if (controller) {
        if (this.events) {
          controller.events = createModuleEventsHandle({ that: this, appContext: params.appContext });
        }
        if (this.data) {
          controller.data = this.data;
        }
        if (this.controller) {
          controller.controller = this.controller;
        }

        const classController = controller

        Object.getOwnPropertyNames(classController).forEach((key) => {
          const controllerContext = classController[key][CONTROLLER_CONTEXT]
          if (controllerContext) {
            controllerContext["this"] = this
            controllerContext['getVar'] = (varName) => {
              return getVar({ that: this, varName })
            }
            controllerContext['getOutput'] = (outputName) => {
              return getOutput({ that: this, outputName })
            }
            controllerContext['getInput'] = (inputName) => {
              return getInput({ that: this, inputName })
            }
            controllerContext['appContext'] = params.appContext
          }
        })
      }

      const result = originalMethod.apply(this, args);
      return result
    }
    return descriptor
  }
}

