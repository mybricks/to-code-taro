import { Subject } from "./Subject"
import { context } from "./context"
import { safeSetByPath, safeGetByPath } from "./utils"
import { SUBJECT_NEXT, SUBJECT_SUBSCRIBE, SUBJECT_VALUE, SUBJECT_EMPTY, SUBJECT_SETVALUE } from "./constant"

/** 创建变量 */
export const createVariable = (...args) => {
  const hasDefaultValue = args.length > 0
  const initValue = args[0]
  const value = new Subject()
  if (hasDefaultValue) {
    value[SUBJECT_NEXT](initValue)
  }
  const ref = {
    value,
    callBacksMap: new Map(),

    // 注册change后，设置一个subject，用于触发change
    changeValues: new Set(),
    // change到上述subject的映射
    changeValuesMap: new Map(),
  }

  const variable = {
    /** 读取 */
    get(value, path) {
      const nextValue = new Subject()
      const next = () => {
        nextValue[SUBJECT_NEXT](path ? safeGetByPath({
          data: ref.value[SUBJECT_VALUE],
          path: path.split(".")
        }) : ref.value[SUBJECT_VALUE])
      }
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE](() => {
          next()
        })
      } else {
        next()
      }
      return nextValue
    },
    /** 赋值 */
    set(value, path) {
      const nextValue = new Subject()
      const next = (value, extra) => {
        if (path) {
          const isEmpty = ref.value[SUBJECT_EMPTY]
          if (isEmpty) {
            ref.value[SUBJECT_SETVALUE]({})
          }
          safeSetByPath({
            data: ref.value[SUBJECT_VALUE],
            path: path.split("."),
            value: value
          })

          value = ref.value[SUBJECT_VALUE]
        }

        ref.value[SUBJECT_NEXT](value, extra)
        ref.changeValues.forEach((changeValue) => {
          changeValue[SUBJECT_NEXT](value, extra)
        })
        nextValue[SUBJECT_NEXT](value, extra)
      }
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE]((value, extra) => {
          next(value, extra)
        })
      } else {
        next(value)
      }
      return nextValue
    },
    /** 重置 */
    reset(value) {
      const nextValue = new Subject()
      const next = () => {
        ref.value[SUBJECT_NEXT](initValue)
        ref.changeValues.forEach((changeValue) => {
          changeValue[SUBJECT_NEXT](initValue)
        })
        nextValue[SUBJECT_NEXT](initValue)
      }
      if (value?.[SUBJECT_SUBSCRIBE]) {
        value[SUBJECT_SUBSCRIBE](() => {
          next()
        })
      } else {
        next()
      }
      return nextValue
    },
    /** 值变更监听 */
    changed() {
      const changeValue = new Subject();
      ref.changeValues.add(changeValue);

      const result = {
        destroy() {
          ref.changeValues.delete(changeValue)
        },
        [SUBJECT_SUBSCRIBE](next) {
          changeValue[SUBJECT_SUBSCRIBE](next)
        }
      }

      if (context.apiRun) {
        if (!context.apiRunVariablesSubject[context.apiRun]) {
          context.apiRunVariablesSubject[context.apiRun] = [result]
        } else {
          context.apiRunVariablesSubject[context.apiRun].push(result)
        }
      }

      return result
    },
    bind(callBack) {
      if (!ref.callBacksMap.has("")) {
        ref.callBacksMap.set("", new Set())
      }
      const callBacks = ref.callBacksMap.get("")
      callBacks.add(callBack)
      // 默认触发一次
      callBack(ref.value[SUBJECT_VALUE])
    },
    ext() {
      return {
        setValue(value) {
          variable.set(value)
        },
        getValue() {
          return ref.value[SUBJECT_VALUE]
        }
      }
    },
    registerChange(change) {
      const changeValue = new Subject()
      // 默认执行，进行初始化动作
      change(changeValue)

      ref.changeValues.add(changeValue)
      ref.changeValuesMap.set(change, changeValue)

      if (!ref.value[SUBJECT_EMPTY]) {
        // 有值就默认执行
        changeValue[SUBJECT_NEXT](ref.value[SUBJECT_VALUE])
      }
    },
    unregisterChange(change) {
      const changeValue = ref.changeValuesMap.get(change)
      ref.changeValues.delete(changeValue)
      ref.changeValuesMap.delete(change)
    },
    // 内置的赋值操作
    setTrue() {
      return variable.set(true)
    },
    setFalse() {
      return variable.set(false)
    },
    setAryAdd(value) {
      const nextValue = new Subject()

      if (Array.isArray(ref.value[SUBJECT_VALUE])) {
        const next = (value) => {
          const arrayValue = ref.value[SUBJECT_VALUE].concat(value)
          ref.value[SUBJECT_NEXT](arrayValue)
          ref.changeValues.forEach((changeValue) => {
            changeValue[SUBJECT_NEXT](value)
          })
          nextValue[SUBJECT_NEXT](arrayValue)
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            next(value)
          })
        } else {
          next(value)
        }
      }

      return nextValue
    }
  }

  return new Proxy({}, {
    get(_, key) {
      return variable[key]
    }
  })
}

/** 创建变量map */
export const createVars = (vars) => {
  return new Proxy(vars, {
    get(target, key) {
      const value = target[key]
      if (value) {
        return value.get()[SUBJECT_VALUE]
      }
      return value
    }
  })
}

