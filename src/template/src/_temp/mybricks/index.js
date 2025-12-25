import {
  SUBJECT_NEXT,
  SUBJECT_VALUE,
  VARS_MARK,
  BASECONTROLLER_MARK,
  EXE_TITLE_MAP,
  CONTROLLER_CONTEXT,
  EXCUTE_TYPE_KEY,
  EXCUTE_TYPE_VALUE
} from "./constant"
import { log } from "./log"
import { Subject } from "./Subject"
import { context } from "./context"
import { safeSetByPath, isObject } from "./utils"
import { createReactiveInputHandler } from "./createReactiveInputHandler"

/** 合并数据流 */
export const merge = (...subjects) => {
  const merge = new Subject()

  subjects.forEach((subject) => {
    if (subject?.[SUBJECT_SUBSCRIBE]) {
      subject[SUBJECT_SUBSCRIBE]((value) => {
        merge[SUBJECT_NEXT](value)
      })
    } else {
      merge[SUBJECT_NEXT](subject)
    }
  })

  return merge
}


// UI
export const createInputsHandle = (params, init = false) => {
  if (init) {
    /** 注册的输入 */
    const _inputEvents = {}
    /** 输入未完成注册，写入todo列表 */
    const _inputEventsTodo = {}
    /** 组件基础信息 */
    const _comInfo = {}
    /** 全局 */
    const controllerContext = {
      initStyles: {},
      initData: {},
      dataChangedSubjects: {},
      // 唯一标记
      mark: {}
    }

    const proxy = new Proxy({}, {
      get(_, key) {
        // 内置关键字
        if (key === "_inputEvents") {
          return _inputEvents;
        } else if (key === "_inputEventsTodo") {
          return _inputEventsTodo
        } else if (key === "_comInfo") {
          return _comInfo
        } else if (key === CONTROLLER_CONTEXT) {
          return controllerContext
        } else if (key === "_setStyle") {
          return (value0, value1) => {
            const next = (value) => {
              if (Object.prototype.toString.call(value) === "[object Object]") {
                Object.entries(value).forEach(([selector, nextStyle]) => {
                  if (!controllerContext.styles) {
                    const { initStyles } = controllerContext
                    if (!initStyles[selector]) {
                      initStyles[selector] = nextStyle
                    } else {
                      const initStyle = initStyles[selector]
                      Object.entries(nextStyle).forEach(([key, value]) => {
                        initStyle[key] = value
                      })
                    }
                    return
                  }
                  const { style } = controllerContext.styles.getStyle(selector)
                  const updators = controllerContext.styles.getUpdators(selector)

                  Object.entries(nextStyle).forEach(([key, value]) => {
                    style[key] = value
                  })

                  if (updators) {
                    updators.forEach((updator) => {
                      updator(selector, style)
                    })
                  }
                })
              }
            }

            if (typeof value0 === "string" && value1) {
              if (value1?.[SUBJECT_SUBSCRIBE]) {
                value1[SUBJECT_SUBSCRIBE]((value) => {
                  next({
                    [value0]: value
                  })
                })
              } else {
                next({
                  [value0]: value1
                })
              }
            } else {
              if (value0?.[SUBJECT_SUBSCRIBE]) {
                value0[SUBJECT_SUBSCRIBE]((value) => {
                  next(value)
                })
              } else {
                next(value0)
              }
            }
          }
        } else if (key === "_setData") {
          return (...args) => {
            if (args.length === 2) {
              const [path, value] = args

              const next = (params) => {
                const { path, value } = params
                if (!controllerContext.data) {
                  const { initData } = controllerContext
                  initData[path] = value
                  return
                }

                safeSetByPath({
                  data: controllerContext.data,
                  path: path.split("."),
                  value: {
                    value,
                    [EXCUTE_TYPE_KEY]: EXCUTE_TYPE_VALUE.DATACHANGED
                  }
                })
              }

              if (value?.[SUBJECT_SUBSCRIBE]) {
                value[SUBJECT_SUBSCRIBE]((value, extra) => {
                  if (extra?.[EXCUTE_TYPE_KEY] === EXCUTE_TYPE_VALUE.DATACHANGED && extra?.controllerMark === controllerContext.mark) {
                    // 数据流来自「EXCUTE_TYPE_VALUE.DATACHANGED」且来自自身，不再继续执行，避免死循环
                    return
                  }
                  next({ value, path })
                })
              } else {
                next({ value, path })
              }
            }
          }
        } else if (key === "_dataChanged") {
          return (path) => {
            const subject = new Subject();
            controllerContext.dataChangedSubjects[path] = subject;

            return subject;
          }
        }

        return (value) => {
          if (!_inputEvents[key]) {
            // 组件未完成输入注册
            if (!_inputEventsTodo[key]) {
              _inputEventsTodo[key] = []
            }

            const rels = {}

            _inputEventsTodo[key].push({
              value,
              rels,
            });

            return new Proxy({}, {
              get(_, key) {
                return rels[key] || (rels[key] = new Subject())
              }
            })
          }

          return createReactiveInputHandler({
            input(value, proxy) {
              log(`${EXE_TITLE_MAP["input"]} ${_comInfo.title} | ${key}`, JSON.stringify(value))
              return _inputEvents[key](value, proxy)
            },
            title: _comInfo.title,
            value,
            rels: {}
          })
        }
      }
    })

    return proxy;
  } else {
    if (!params.controller[CONTROLLER_CONTEXT].inputs) {
      const { controller, title, styles } = params
      const { _inputEvents, _comInfo, _inputEventsTodo, [CONTROLLER_CONTEXT]: controllerContext } = controller
      _comInfo.title = title;
      controllerContext.initModifier = {
        visibility: styles?.root?.display === "none" ? Visibility.None : Visibility.Visible
      }

      const createVisibilityHandler = (visibilityState) => {
        return (value) => {
          const setVisibility = () => {
            if (!controllerContext.modifier?.attribute) {
              controllerContext.initModifier.visibility = visibilityState
            } else {
              controllerContext.modifier.attribute?.visibility(visibilityState)
            }
          }
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE](setVisibility);
          } else {
            setVisibility()
          }
        };
      };

      // 内置显示隐藏逻辑
      _inputEvents.show = createVisibilityHandler(Visibility.Visible)
      _inputEvents.hide = createVisibilityHandler(Visibility.None)
      _inputEvents.showOrHide = (value) => {
        const setVisibility = (value) => {
          if (!controllerContext.modifier?.attribute) {
            controllerContext.initModifier.visibility = !!value ? Visibility.Visible : Visibility.None
          } else {
            controllerContext.modifier.attribute?.visibility(!!value ? Visibility.Visible : Visibility.None)
          }
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE](setVisibility)
        } else {
          setVisibility(value)
        }
      }
      // 处理显示隐藏todo项
      ["show", "hide", "showOrHide"].forEach((key) => {
        const todo = _inputEventsTodo[key]
        if (todo) {
          Reflect.deleteProperty(_inputEventsTodo, key)

          todo.forEach(({ value }) => {
            _inputEvents[key](value)
          })
        }
      })

      const proxy = new Proxy(controller, {
        get(_, key) {
          return (input) => {
            if (!_inputEvents[key]) {
              // 第一次注册，处理TODO
              if (_inputEventsTodo[key]) {
                _inputEventsTodo[key].forEach(({ value, rels }) => {
                  createReactiveInputHandler({
                    input(value, proxy) {
                      log(`${EXE_TITLE_MAP["input"]} ${title} | ${key}`, JSON.stringify(value))
                      return input(value, proxy)
                    },
                    title,
                    value,
                    rels
                  })
                })
                Reflect.deleteProperty(_inputEventsTodo, key)
              }
            }

            _inputEvents[key] = input
          }
        }
      })

      params.controller[CONTROLLER_CONTEXT].inputs = proxy;
    }

    return params.controller[CONTROLLER_CONTEXT].inputs
  }
}

// 事件
export const createEventsHandle = (params) => {
  if (!params.controller[CONTROLLER_CONTEXT].outputs) {
    params.controller[CONTROLLER_CONTEXT].outputs = new Proxy(params.events || {}, {
      get(target, key) {
        const event = params.controller[CONTROLLER_CONTEXT].appContext?.comEvent?.[params.uid]?.[key]
        if (event) {
          const { getVar, getOutput, getInput } = params.controller[CONTROLLER_CONTEXT]
          return (value) => {
            event(value, {
              getVar,
              getOutput,
              getInput
            })
          }
        }

        return target[key] || (() => {
        })
      }
    })
  }

  return params.controller[CONTROLLER_CONTEXT].outputs
}

// 场景打开、输出
export const pageController = () => {
  return new Proxy({
    commit: new Subject(),
    cancel: new Subject(),
    apply: new Subject(),
    close: new Subject(),
  }, {
    get(target, key) {
      return target[key]
    }
  })
}

export class Page {
  appRouter

  constructor(appRouter) {
    this.appRouter = appRouter
  }

  /** 获取当前页面入参 */
  getParams(name) {
    const params = this.appRouter.getParams(name)
    const subject = new Subject()
    subject[SUBJECT_NEXT](params?.value)
    return subject
  }

  /** 打开 */
  open(name, value) {
    const controller = pageController()

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.push(name, { value, controller })
      })
    } else {
      this.appRouter.push(name, { value, controller })
    }

    return controller
  }

  /** 打开 */
  replace(name, value) {
    const controller = pageController()

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.replace(name, { value, controller })
      })
    } else {
      this.appRouter.replace(name, { value, controller })
    }

    return controller
  }

  /** 确定 */
  commit(name, value) {
    const params = this.appRouter.getParams(name)

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.pop()
        setTimeout(() => {
          params.controller.commit[SUBJECT_NEXT](value)
        }, 100)
      })
    } else {
      this.appRouter.pop()
      setTimeout(() => {
        params.controller.commit[SUBJECT_NEXT](value)
      }, 100)
    }
  }

  /** 取消 */
  cancel(name, value) {
    const params = this.appRouter.getParams(name)
    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.pop()
        setTimeout(() => {
          params.controller.cancel[SUBJECT_NEXT](value)
        }, 100)
      })
    } else {
      this.appRouter.pop()
      setTimeout(() => {
        params.controller.cancel[SUBJECT_NEXT](value)
      }, 100)
    }
  }

  /** 应用，不关闭 */
  apply(name, value) {
    const params = this.appRouter.getParams(name)
    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        params.controller.apply[SUBJECT_NEXT](value)
      })
    } else {
      params.controller.apply[SUBJECT_NEXT](value)
    }
  }

  /** 关闭 */
  close(name, value) {
    const params = this.appRouter.getParams(name)
    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        this.appRouter.pop()
        setTimeout(() => {
          params.controller.close[SUBJECT_NEXT](value)
        }, 100)
      })
    } else {
      this.appRouter.pop()
      setTimeout(() => {
        params.controller.close[SUBJECT_NEXT](value)
      }, 100)
    }
  }
}

// api
export const emit = (fn, value) => {
  const subject = new Subject()

  if (!fn) {
    return subject
  }

  if (value?.[SUBJECT_SUBSCRIBE]) {
    value[SUBJECT_SUBSCRIBE]((value) => {
      const res = fn(value)

      if (res instanceof Promise) {
        res.then((value) => {
          subject[SUBJECT_NEXT](value)
        })
      } else {
        subject[SUBJECT_NEXT](res)
      }
    })
  } else {
    const res = fn(value)

    if (res instanceof Promise) {
      res.then((value) => {
        subject[SUBJECT_NEXT](value)
      })
    } else {
      subject[SUBJECT_NEXT](res)
    }
  }

  return subject;
}

/** 创建fx */
export const createFx = (fx) => {
  return (value, ...args) => {
    const outputs = {}

    const proxy = new Proxy({}, {
      get(_, key) {
        return outputs[key] || (outputs[key] = new Subject())
      }
    })

    const next = (value) => {
      const res = fx(value, ...args)
      if (res) {
        Object.entries(res).forEach(([key, value]) => {
          if (!outputs[key]) {
            outputs[key] = new Subject()
          }
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              outputs[key][SUBJECT_NEXT](value)
            })
          } else {
            outputs[key][SUBJECT_NEXT](value)
          }
        })
      }
    }

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        next(value)
      })
    } else {
      next(value)
    }

    return proxy
  }
}

/** 创建插槽IO */
export const createSlotsIO = (params) => {
  if (!params.controller[CONTROLLER_CONTEXT].slotsIO) {
    const slotsIOMap = {}
    params.controller[CONTROLLER_CONTEXT].slotsIO = new Proxy({}, {
      get(_, key) {
        if (!slotsIOMap[key]) {
          const inputsMap = {}
          slotsIOMap[key] = {
            inputs: new Proxy({}, {
              get(_, key) {
                if (!inputsMap[key]) {
                  inputsMap[key] = new Subject()
                }

                const next = (value) => {
                  inputsMap[key][SUBJECT_NEXT](value)
                }

                next[SUBJECT_SUBSCRIBE] = (next) => {
                  inputsMap[key][SUBJECT_SUBSCRIBE](next)
                }

                return next
              }
            }),
            outputs: new Proxy({}, {
              get(_, key) {
                return (next) => {
                  return (value) => {
                    if (value?.[SUBJECT_SUBSCRIBE]) {
                      value[SUBJECT_SUBSCRIBE]((value) => {
                        next(value)
                      })
                    } else {
                      next(value)
                    }
                  }
                }
              }
            })
          }
        }

        return slotsIOMap[key]
      }
    })
  }

  return params.controller[CONTROLLER_CONTEXT].slotsIO
}

/**
 * 模块
 * [TODO] 暂时无法在多处使用关联输出项
 */
export const createModuleInputsHandle = () => {
  const inputsMap = {}
  const outputsMap = {}

  return new Proxy({}, {
    get(_, key) {
      if (key === "outputs") {
        return new Proxy({}, {
          get(_, key) {
            if (!outputsMap[key]) {
              outputsMap[key] = new Subject()
            }
            return (value) => {
              if (value?.[SUBJECT_SUBSCRIBE]) {
                value[SUBJECT_SUBSCRIBE]((value) => {
                  outputsMap[key][SUBJECT_NEXT](value)
                });
              } else {
                outputsMap[key][SUBJECT_NEXT](value)
              }
            }
          }
        })
      }

      if (!inputsMap[key]) {
        inputsMap[key] = new Subject()
      }

      const next = (value) => {
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            inputsMap[key][SUBJECT_NEXT](value)
          });
        } else {
          inputsMap[key][SUBJECT_NEXT](value)
        }

        return new Proxy({}, {
          get(_, key) {
            return outputsMap[key] || (outputsMap[key] = new Subject())
          }
        })
      }

      return new Proxy(next, {
        get(_, proxyKey) {
          if (proxyKey === "subscribe" || proxyKey === SUBJECT_SUBSCRIBE) {
            return (next) => {
              inputsMap[key][SUBJECT_SUBSCRIBE](next)
            }
          } else if (proxyKey === "value" || proxyKey === SUBJECT_VALUE) {
            return inputsMap[key][SUBJECT_VALUE]
          }
        }
      })
    }
  })
}

class Styles {
  styles = {}
  map = new Map()

  constructor(styles) {
    this.styles = styles
  }

  getStyle(selector) {
    let style = this.styles[selector]
    if (!style) {
      this.styles[selector] = {}
      style = this.styles[selector]
    }
    return {
      selector,
      style,
      setUpdator: (updator, uid) => {
        if (!this.map.has(selector)) {
          this.map.set(selector, new Map())
        }
        const selectorMap = this.map.get(selector)
        selectorMap.set(uid, updator)
      },
      ...style
    }
  }

  getUpdators(selector) {
    return this.map.get(selector)
  }
}

/**
 * 组件样式
 */
export const createStyles = (params) => {
  if (!params.controller[CONTROLLER_CONTEXT].styles) {
    const initStyles = params.controller[CONTROLLER_CONTEXT].initStyles
    const { styles, parentSlot } = params;
    Object.entries(initStyles).forEach(([selector, initStyle]) => {
      if (!styles[selector]) {
        styles[selector] = initStyle
      } else {
        const style = styles[selector]
        Object.entries(initStyle).forEach(([key, value]) => {
          style[key] = value
        })
      }
    })
    if (parentSlot?.itemWrap) {
      const { root, ...other } = styles
      params.controller[CONTROLLER_CONTEXT].styles = new Styles(other)
    } else {
      params.controller[CONTROLLER_CONTEXT].styles = new Styles(styles)
    }
  }

  return new Proxy({}, {
    ownKeys() {
      return Object.keys(params.styles)
    },
    getOwnPropertyDescriptor(k) {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    get(_, key) {
      return params.controller[CONTROLLER_CONTEXT].styles.getStyle(key)
    }
  })
}

/**
 * @returns {any}
 */
export const transformApi = (api) => {
  return (value, cb) => {
    const id = `${Math.random()}_${new Date().getTime()}`
    const outputs = {}
    const dispose = () => {

    }
    const proxy = new Proxy(dispose, {
      get(_, key) {
        return outputs[key] || (outputs[key] = new Subject())
      }
    })
    let isDispose = false;

    context.apiRun = id;

    const res = api(value)

    context.apiRun = null;

    if (res) {
      Object.entries(res).forEach(([key, value]) => {
        if (!outputs[key]) {
          outputs[key] = new Subject()
        }
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            if (isDispose) {
              return
            }
            isDispose = true
            outputs[key][SUBJECT_NEXT](value)
            cb?.[key]?.(value)
            context.apiRunVariablesSubject[id]?.forEach((subject) => {
              subject.destroy()
            })
          })
        } else {
          if (isDispose) {
            return
          }
          isDispose = true
          outputs[key][SUBJECT_NEXT](value)
          cb?.[key]?.(value)
          context.apiRunVariablesSubject[id]?.forEach((subject) => {
            subject.destroy()
          })
        }
      })
    }

    return proxy
  }
}

export const transformBus = (bus) => {
  return (newBus) => {
    Object.entries(newBus).forEach(([key, newBus]) => {
      bus[key] = (value) => {
        const outputs = {}

        const callBack = new Proxy({}, {
          get(_, key) {
            return (value) => {
              const output = outputs[key] || (outputs[key] = new Subject())
              output[SUBJECT_NEXT](value)
            }
          }
        })

        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            newBus(value, callBack)
          })
        } else {
          newBus(value, callBack)
        }

        return new Proxy({}, {
          get(_, key) {
            return outputs[key] || (outputs[key] = new Subject())
          }
        })
      };
    })
  }
}

export const createBus = (bus) => {
  return () => {
    return new Proxy({}, {
      get() {
        return new Subject()
      }
    })
  }
}

export const join = (lastSubject, nextSubject) => {
  const subject = new Subject();
  const next = () => {
    if (nextSubject?.[SUBJECT_SUBSCRIBE]) {
      subject[SUBJECT_NEXT](nextSubject[SUBJECT_VALUE]);
    } else {
      subject[SUBJECT_NEXT](nextSubject);
    }
  }

  if (lastSubject?.[SUBJECT_SUBSCRIBE]) {
    lastSubject[SUBJECT_SUBSCRIBE](() => {
      next()
    });
  } else {
    next()
  }

  return subject;
};

export const createModifier = (params, Modifier) => {
  if (!params.controller[CONTROLLER_CONTEXT].modifier) {
    params.controller[CONTROLLER_CONTEXT].modifier = new Modifier(params.controller[CONTROLLER_CONTEXT].initModifier);
  }
  return params.controller[CONTROLLER_CONTEXT].modifier
}

const DATA_PROXY = Symbol("DATA_PROXY");
const dataProxy = (params) => {
  const { data, path, config } = params;
  return new Proxy(data, {
    get(target, key, receiver) {
      if (key === DATA_PROXY) {
        return true;
      }
      const value = Reflect.get(target, key, receiver);
      if (typeof key !== "string" || target.hasOwnProperty(key)) {
        return value
      }
      if (isObject(value)) {
        if (value[DATA_PROXY]) {
          return value;
        }

        return dataProxy({
          data: value,
          path: path ? `${path}.${key}` : key,
          config
        });
      }
      return value;
    },
    set(target, key, value, receiver) {
      if (typeof key !== "string" || target.hasOwnProperty(key)) {
        Reflect.set(target, key, value, receiver);
      } else {
        if (!value?.[EXCUTE_TYPE_KEY]) {
          Reflect.set(target, key, value, receiver);
          // 目前只有「EXCUTE_TYPE_VALUE.DATACHANGED」，所以判断有「EXCUTE_TYPE_KEY」就行
          config?.set?.({
            value,
            path: path ? `${path}.${key}` : key,
          });
        } else {
          Reflect.set(target, key, value.value, receiver);
        }
      }
      return true;
    },
  });
}

export const createData = (params, Data) => {
  if (!params.controller[CONTROLLER_CONTEXT].data) {
    const { initData, dataChangedSubjects, mark } = params.controller[CONTROLLER_CONTEXT]
    const nextData = Object.assign({}, params.data)
    Object.entries(initData).forEach(([path, value]) => {
      safeSetByPath({
        data: nextData,
        path: path.split("."),
        value
      })
    })

    const data = new Data(nextData)
    const observeData = dataProxy({
      data,
      path: "",
      config: {
        set(params) {
          const dataChangedSubject = dataChangedSubjects[params.path];
          if (dataChangedSubject) {
            dataChangedSubject[SUBJECT_NEXT](params.value, {
              [EXCUTE_TYPE_KEY]: EXCUTE_TYPE_VALUE.DATACHANGED,
              controllerMark: mark,
            })
          }
        }
      }
    })

    params.controller[CONTROLLER_CONTEXT].data = observeData
  }

  return params.controller[CONTROLLER_CONTEXT].data
}

export class Vars {
  [VARS_MARK] = true
}

export class BaseController {
  [BASECONTROLLER_MARK] = true
}

export * from "./MyBricksDescriptor"

export * from "./createModuleEventsHandle"

export * from "./createJSHandle"

export * from "./Subject"

export * from "./createEnv"

export * from "./variables"

export * from "./event"

