/**
 * API配置开关
 * 用于控制各个外部API的启用状态
 */

export const API_CONFIG = {
  // ModelScope API配置
  modelScope: {
    enabled: false, // 🔴 关闭：使用本地服务
    baseURL: 'http://localhost:8080', // 本地服务地址
    apiKey: '', // 本地服务可能不需要
  },

  // 魔珐星云配置
  xingyun: {
    enabled: false, // 🔴 关闭：使用本地服务
    baseURL: 'http://localhost:8081', // 本地服务地址
  },

  // 向量存储配置
  vectorStore: {
    enabled: false, // 🔴 关闭：不使用向量化
  },

  // 故事生成配置
  storyGenerator: {
    enabled: false, // 🔴 关闭：使用本地服务或mock数据
  },
} as const;

/**
 * 获取ModelScope API基础URL
 */
export function getModelScopeBaseURL(): string {
  return API_CONFIG.modelScope.enabled
    ? API_CONFIG.modelScope.baseURL
    : 'http://localhost:8080'; // 默认本地服务
}

/**
 * 获取星云API基础URL
 */
export function getXingyunBaseURL(): string {
  return API_CONFIG.xingyun.enabled
    ? API_CONFIG.xingyun.baseURL
    : 'http://localhost:8081'; // 默认本地服务
}

/**
 * 检查API是否启用
 */
export function isModelScopeEnabled(): boolean {
  return API_CONFIG.modelScope.enabled;
}

export function isXingyunEnabled(): boolean {
  return API_CONFIG.xingyun.enabled;
}

export function isVectorStoreEnabled(): boolean {
  return API_CONFIG.vectorStore.enabled;
}

export function isStoryGeneratorEnabled(): boolean {
  return API_CONFIG.storyGenerator.enabled;
}
