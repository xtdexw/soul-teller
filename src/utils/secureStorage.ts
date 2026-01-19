/**
 * 安全存储工具类
 * 用于管理API密钥和敏感配置
 */

const STORAGE_KEYS = {
  API_KEYS: 'soul-teller-api-keys',
  XINGYUN_CONFIG: 'soul-teller-xingyun-config',
} as const;

// 默认测试密钥（仅用于开发测试）
const DEFAULT_API_KEY = 'ms-400ccec2-1d3b-4837-ae5b-57cc43eadfe1';

// 默认星云配置（仅用于开发测试）
const DEFAULT_XINGYUN_CONFIG: XingyunConfig = {
  appId: 'cc36cf95b26844039fa0f49f9a3b2a22',
  appSecret: 'fbb35216a10247038c7e80d2dbf66bb0',
  gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
};

export interface ApiKeys {
  modelScopeApiKey: string;
  customKey?: string;
}

export interface XingyunConfig {
  appId: string;
  appSecret: string;
  gatewayServer: string;
}

class SecureStorage {
  /**
   * 获取ModelScope API密钥
   */
  getModelScopeApiKey(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      if (stored) {
        const keys: ApiKeys = JSON.parse(stored);
        return keys.customKey || keys.modelScopeApiKey || DEFAULT_API_KEY;
      }
      // 默认返回测试密钥
      return DEFAULT_API_KEY;
    } catch (error) {
      console.error('Error reading API key from storage:', error);
      return DEFAULT_API_KEY;
    }
  }

  /**
   * 设置ModelScope API密钥
   */
  setModelScopeApiKey(apiKey: string): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      const keys: ApiKeys = stored ? JSON.parse(stored) : { modelScopeApiKey: '' };

      keys.customKey = apiKey;
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving API key to storage:', error);
    }
  }

  /**
   * 重置为默认测试密钥
   */
  resetToDefaultApiKey(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      const keys: ApiKeys = stored ? JSON.parse(stored) : { modelScopeApiKey: '' };

      delete keys.customKey;
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
    } catch (error) {
      console.error('Error resetting API key:', error);
    }
  }

  /**
   * 获取密钥的掩码显示（用于UI）
   */
  getMaskedApiKey(): string {
    const apiKey = this.getModelScopeApiKey();
    if (apiKey === DEFAULT_API_KEY) {
      return '默认测试密钥';
    }
    // 只显示前4位和后4位
    if (apiKey.length > 8) {
      return `${apiKey.slice(0, 4)}***${apiKey.slice(-4)}`;
    }
    return '***';
  }

  /**
   * 获取星云配置
   */
  getXingyunConfig(): XingyunConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.XINGYUN_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
      // 默认返回测试配置
      return DEFAULT_XINGYUN_CONFIG;
    } catch (error) {
      console.error('Error reading Xingyun config from storage:', error);
      return DEFAULT_XINGYUN_CONFIG;
    }
  }

  /**
   * 检查是否使用的是默认星云配置
   */
  isUsingDefaultXingyunConfig(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.XINGYUN_CONFIG);

      // 如果没有存储配置，说明使用的是默认配置
      if (!stored) {
        return true;
      }

      // 如果有存储配置，检查是否与默认配置相同
      try {
        const storedConfig = JSON.parse(stored) as XingyunConfig;
        return (
          storedConfig.appId === DEFAULT_XINGYUN_CONFIG.appId &&
          storedConfig.appSecret === DEFAULT_XINGYUN_CONFIG.appSecret &&
          storedConfig.gatewayServer === DEFAULT_XINGYUN_CONFIG.gatewayServer
        );
      } catch {
        // 解析失败，认为是自定义配置
        return false;
      }
    } catch (error) {
      return true;
    }
  }

  /**
   * 获取星云配置的掩码显示（用于UI）
   */
  getMaskedXingyunConfig(): { appId: string; appSecret: string; isDefault: boolean } {
    const config = this.getXingyunConfig();
    const isDefault = this.isUsingDefaultXingyunConfig();

    // 掩码App ID
    const maskedAppId = isDefault
      ? '默认测试App ID'
      : config.appId.length > 8
      ? `${config.appId.slice(0, 4)}***${config.appId.slice(-4)}`
      : '***';

    // 掩码App Secret
    const maskedAppSecret = isDefault
      ? '默认测试App Secret'
      : config.appSecret.length > 8
      ? `${config.appSecret.slice(0, 4)}***${config.appSecret.slice(-4)}`
      : '***';

    return {
      appId: maskedAppId,
      appSecret: maskedAppSecret,
      isDefault,
    };
  }

  /**
   * 设置星云配置
   */
  setXingyunConfig(config: XingyunConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.XINGYUN_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving Xingyun config to storage:', error);
    }
  }

  /**
   * 重置为默认测试配置
   */
  resetToDefaultXingyunConfig(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.XINGYUN_CONFIG);
    } catch (error) {
      console.error('Error resetting Xingyun config:', error);
    }
  }

  /**
   * 清除所有敏感数据
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.API_KEYS);
      localStorage.removeItem(STORAGE_KEYS.XINGYUN_CONFIG);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

export const secureStorage = new SecureStorage();
