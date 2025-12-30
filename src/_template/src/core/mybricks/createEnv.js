import { CONTROLLER_CONTEXT } from "./constant"

export const createEnv = (params) => {
  return params.controller[CONTROLLER_CONTEXT].appContext?.env
}

export const _createEnv = (params) => {
  return params.controller[CONTROLLER_CONTEXT].appContext?._env
}

