import { log } from "./log"
import {
  SUBJECT_NEXT,
  SUBJECT_VALUE,
  SUBJECT_EMPTY,
  SUBJECT_SETVALUE,
  SUBJECT_SUBSCRIBE,
  SUBJECT_UNSUBSCRIBE
} from "./constant"

/** 数据流 */
export class Subject {
  _values = []
  _observers = new Set()
  _log = undefined
  _empty = true;

  constructor(params = {}) {
    this._log = params.log
    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        const subjectNext = new SubjectNext(prop)

        target[SUBJECT_SUBSCRIBE]((value, extra) => {
          subjectNext[SUBJECT_NEXT](value, extra)
        })

        return subjectNext
      }
    })
  }

  get [SUBJECT_VALUE]() {
    return this._values[0]
  }

  get [SUBJECT_EMPTY]() {
    return this._empty;
  }

  [SUBJECT_SETVALUE](value) {
    this._values[0] = value;
    this._empty = false;
  }

  [SUBJECT_NEXT](value, extra) {
    log(this._log, JSON.stringify(value))
    this._values[0] = value
    this._empty = false
    this._observers.forEach((observer) => observer(value, extra))
  }

  [SUBJECT_SUBSCRIBE](observer) {
    if (this._values.length) {
      observer(this._values[0])
    }
    this._observers.add(observer)
  }

  [SUBJECT_UNSUBSCRIBE](observer) {
    this._observers.delete(observer)
  }
}

function getValueNextByPath(params) {
  const { value, path } = params
  let current = value
  for (const key of path) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[key]
  }
  return current
}

class SubjectNext extends Subject {
  _path = []

  constructor(path) {
    super()

    this._path.push(path)

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }

        target._path.push(prop)

        return target;
      }
    })
  }

  [SUBJECT_NEXT](value, extra) {
    this._values[0] = value
    this._empty = false
    const nextValue = getValueNextByPath({ value, path: this._path })
    this._observers.forEach((observer) => observer(nextValue, extra))
  }

  [SUBJECT_SUBSCRIBE](observer) {
    if (this._values.length) {
      observer(getValueNextByPath({ value: this._values[0], path: this._path }))
    }
    this._observers.add(observer)
  }
}
