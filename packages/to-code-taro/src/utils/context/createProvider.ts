/**
 * 创建 Provider 相关工具
 */

import { firstCharToLowerCase, firstCharToUpperCase } from "../common/string";
import type { BaseConfig } from "../../toCodeTaro";

export interface Provider {
  name: string;
  class: string;
  controllers: Set<string>;
  useParams: boolean;
  useEvents: boolean;
  coms: Set<string>;
  useController: boolean;
  useData: boolean;
}

/**
 * 创建 Provider
 */
export const createProvider = (
  fileName: string | undefined,
  isRoot: boolean = true,
): Provider => {
  // 保持与 handleProcess.ts 中的逻辑一致
  // 如果是 root 场景，默认为 slot_Index
  // 如果是子场景，暂时也默认为 slot_Index（或者根据 meta 信息生成）
  const providerName = isRoot ? "slot_Index" : (fileName ? `${fileName}Provider` : "slot_Index");
  return {
    name: firstCharToLowerCase(providerName),
    class: firstCharToUpperCase(providerName),
    controllers: new Set(),
    useParams: false,
    useEvents: false,
    coms: new Set(),
    useController: false,
    useData: false,
  };
};

/**
 * 创建 Provider Map
 */
export const createProviderMap = (
  provider: Provider,
): Record<string, Provider> => {
  return {
    [provider.name]: provider,
  };
};

