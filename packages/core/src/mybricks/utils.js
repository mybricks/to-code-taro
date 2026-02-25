export const safeSetByPath = (params) => {
  const { data, path, value } = params;
  const nextIndex = path.length - 1;
  let current = data;
  let errorFlag = false;
  for (let i = 0; i < nextIndex; i++) {
    try {
      current = current[path[i]];
    } catch (error) {
      errorFlag = true;
      break;
    }
  }

  if (!errorFlag) {
    current[path[nextIndex]] = value;
  }
}

export const safeGetByPath = (params) => {
  const { data, path } = params;
  let current = data;
  let errorFlag = false;
  for (let i = 0; i < path.length; i++) {
    try {
      current = current[path[i]];
    } catch (error) {
      errorFlag = true;
      break;
    }
  }

  if (!errorFlag) {
    return current;
  }

  return undefined;
}

export const isObject = (value) => {
  return value && typeof value === "object";
}

