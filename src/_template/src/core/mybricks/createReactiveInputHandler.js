import { EXE_TITLE_MAP, SUBJECT_NEXT, SUBJECT_SUBSCRIBE } from "./constant"
import { Subject } from "./Subject"

/** 组件的输入 */
export const createReactiveInputHandler = (params) => {
  const { input, value, rels, title } = params;
  if (value?.[SUBJECT_SUBSCRIBE]) {
    value[SUBJECT_SUBSCRIBE]((value) => {
      input(value, new Proxy({}, {
        get(_, key) {
          return (value) => {
            (rels[key] ||
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` })))[SUBJECT_NEXT](value)
          }
        }
      }))
    })
  } else {
    input(value, new Proxy({},
      {
        get(_, key) {
          return (value) => {
            (rels[key] ||
              (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` })))[SUBJECT_NEXT](value)
          }
        }
      }
    ))
  }

  return new Proxy({},
    {
      get(_, key) {
        return rels[key] || (rels[key] = new Subject({ log: `${EXE_TITLE_MAP["output"]} ${title} | ${key}` }))
      }
    }
  )
}

