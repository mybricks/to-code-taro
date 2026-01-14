export const log = (...args) => {
  // console.log("[MyBricks]", ...args)
}

export const logger = {
  info: log,
  warn: log,
  error: log,
}

