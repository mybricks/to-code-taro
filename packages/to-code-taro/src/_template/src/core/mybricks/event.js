import { Subject } from "./Subject"
import { SUBJECT_NEXT, SUBJECT_SUBSCRIBE } from "./constant"

export const transformEvents = (bus) => {
  return (newEvents) => {
    Object.entries(newEvents).forEach(([key, newEvent]) => {
      bus[key] = createEvent(newEvent)
    })
  }
}

export const createEvent = (event) => {
  return (value) => {
    const outputs = {}

    const callBack = new Proxy({}, {
      get(_, key) {
        return (value) => {
          const output = outputs[key] || (outputs[key] = new Subject())
          if (value?.[SUBJECT_SUBSCRIBE]) {
            value[SUBJECT_SUBSCRIBE]((value) => {
              output[SUBJECT_NEXT](value)
            })
          } else {
            output[SUBJECT_NEXT](value)
          }
        }
      }
    })

    if (value?.[SUBJECT_SUBSCRIBE]) {
      value[SUBJECT_SUBSCRIBE]((value) => {
        event(value, callBack)
      })
    } else {
      event(value, callBack)
    }

    return new Proxy({}, {
      get(_, key) {
        return outputs[key] || (outputs[key] = new Subject())
      }
    })
  };
}

