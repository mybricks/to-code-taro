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

// 全局缓存，用于防抖/节流等需要保持状态的组件
const handleCache = new Map();

/** 尝试从缓存获取 exe，命中时重置输出 Subject 状态 */
const getFromCache = (handleKey) => {
  if (!handleKey || !handleCache.has(handleKey)) return null;
  const cached = handleCache.get(handleKey);
  if (cached._rels) {
    Object.values(cached._rels).forEach((subject) => {
      subject._observers?.clear?.();
      subject._values = [];
      subject._empty = true;
    });
  }
  return cached;
}

/** 将 exe 存入缓存 */
const setToCache = (handleKey, exe, rels, needsCache) => {
  exe._rels = rels;
  if (handleKey && needsCache) {
    handleCache.set(handleKey, exe);
  }
}

// JS
export const createJSHandle = (fn, options, handleKey) => {
  const { props, appContext } = options

  const cached = getFromCache(handleKey);
  if (cached) return cached;

  const needsCache = fn.__useCache === true
  let controller

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
    env: appContext?.env,
    appContext,
  })

  const isJsMultipleInputs = props.inputs[0]
    ? validateJsMultipleInputs(props.inputs[0])
    : false;

  // 缓存 exeOutputs 的属性访问结果，避免每次访问 .trigger 等属性时创建新的 SubjectNext
  const exeOutputsCache = {}
  const exeOutputs = new Proxy(
    {},
    {
      get(_, key) {
        if (!exeOutputsCache[key]) {
          const subject = rels[key] || (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${props.title} | ${key}` }))
          exeOutputsCache[key] = subject
        }
        return exeOutputsCache[key]
      },
    },
  )

  // 记录已订阅的 Subject，避免重复订阅
  const subscribedSubjects = new Set()

  const exe = (...args) => {
    if (args.length) {
      // 调用输入
      if (isJsMultipleInputs) {
        // 多输入模式
        const length = args.length;
        let valueAry = {};
        args.forEach((value, index) => {
          if (value?.[SUBJECT_SUBSCRIBE]) {
            // 如果已经订阅过这个 Subject，跳过
            if (subscribedSubjects.has(value)) {
              return
            }
            subscribedSubjects.add(value)
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
          // 如果已经订阅过这个 Subject，跳过
          if (subscribedSubjects.has(value)) {
            return exeOutputs
          }
          subscribedSubjects.add(value)
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

  setToCache(handleKey, exe, rels, needsCache);

  return exe;
}

