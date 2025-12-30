import { EXE_TITLE_MAP, SUBJECT_NEXT, SUBJECT_SUBSCRIBE } from "./constant"
import { Subject } from "./Subject"
import { log, logger } from "./log"
import { createReactiveInputHandler } from "./createReactiveInputHandler"

/** utils */
/**
 * 判断是否js多输入
 */
export const validateJsMultipleInputs = (input) => {
  return input.match(/\./); // input.xxx 为多输入模式
}

// JS
export const createJSHandle = (fn, options) => {
  let controller

  const { props, appContext } = options

  const inputs = new Proxy({}, {
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    ownKeys() {
      return props.inputs
    },
    get() {
      return (input) => {
        // 约定只有一个输入
        controller = input
      }
    }
  })

  const rels = {}

  const outputs = new Proxy({}, {
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      }
    },
    ownKeys() {
      return props.outputs
    },
    get(_, key) {
      return (value) => {
        (rels[key] ||
          (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` })))[SUBJECT_NEXT](value)
      }
    }
  })

  fn({
    data: props.data,
    inputs,
    outputs,
    logger,
    env: appContext?.env
  })

  const isJsMultipleInputs = props.inputs[0]
    ? validateJsMultipleInputs(props.inputs[0])
    : false;

  const exeOutputs = new Proxy(
    {},
    {
      get(_, key) {
        return rels[key] || (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` }))
      },
    },
  )

  const exe = (...args) => {
    if (args.length) {
      // 调用输入
      if (isJsMultipleInputs) {
        // 多输入模式
        const length = args.length;
        let valueAry = {};
        args.forEach((value, index) => {
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[index]}`, JSON.stringify(value));
              valueAry[props.inputs[index]] = value
              if (Object.keys(valueAry).length === length) {
                createReactiveInputHandler({
                  input: controller,
                  value: valueAry,
                  rels,
                  title: props.title
                })
                // 触发输入后清除
                valueAry = {}
              }
            })
          } else {
            log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[index]}`, JSON.stringify(value));
            valueAry[props.inputs[index]] = value

            if (Object.keys(valueAry).length === length) {
              createReactiveInputHandler({
                input: controller,
                value: valueAry,
                rels,
                title: props.title
              })
              // 触发输入后清除
              valueAry = {}
            }
          }
        })
      } else {
        // 非多输入
        const value = args[0]
        if (value?.[SUBJECT_SUBSCRIBE]) {
          value[SUBJECT_SUBSCRIBE]((value) => {
            log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[0]}`, JSON.stringify(value));
            createReactiveInputHandler({
              input: controller,
              value,
              rels,
              title: props.title
            })
          })
        } else {
          log(`${EXE_TITLE_MAP["input"]} ${props.title} | ${props.inputs[0]}`, JSON.stringify(value));
          createReactiveInputHandler({
            input: controller,
            value,
            rels,
            title: props.title
          })
        }
      }
    }

    return exeOutputs;
  }

  return exe;
}

