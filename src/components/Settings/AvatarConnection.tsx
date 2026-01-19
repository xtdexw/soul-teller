import { useState, useEffect } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { secureStorage } from '../../utils/secureStorage';
import type { XingyunConfig } from '../../types';
import type { XingyunConfig as StorageXingyunConfig } from '../../utils/secureStorage';

function AvatarConnection() {
  const { isConnected, isConnecting, connectionError, connect, disconnect } =
    useAvatar();
  const [maskedConfig, setMaskedConfig] = useState<{
    appId: string;
    appSecret: string;
    isDefault: boolean;
  }>({
    appId: '',
    appSecret: '',
    isDefault: true,
  });
  const [config, setConfig] = useState<StorageXingyunConfig>({
    appId: '',
    appSecret: '',
    gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // 获取当前配置和掩码信息
    const currentConfig = secureStorage.getXingyunConfig();
    const masked = secureStorage.getMaskedXingyunConfig();
    setConfig(currentConfig);
    setMaskedConfig(masked);
  }, []);

  const handleConnect = async () => {
    // 使用默认配置或存储的配置
    const storageConfig = secureStorage.getXingyunConfig();
    // containerId 由 useAvatar hook 内部处理，这里传空字符串
    const config: XingyunConfig = {
      containerId: '', // useAvatar hook 会设置这个值
      appId: storageConfig.appId,
      appSecret: storageConfig.appSecret,
      gatewayServer: storageConfig.gatewayServer,
    };
    await connect(config);
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleSaveConfig = () => {
    secureStorage.setXingyunConfig(config);
    setMaskedConfig(secureStorage.getMaskedXingyunConfig());
    setIsEditingConfig(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleResetToDefault = () => {
    secureStorage.resetToDefaultXingyunConfig();
    const defaultConfig = secureStorage.getXingyunConfig();
    setConfig(defaultConfig);
    setMaskedConfig(secureStorage.getMaskedXingyunConfig());
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const getStatusDisplay = (): { text: string; className: string } => {
    if (connectionError) {
      return { text: '连接失败', className: 'error' };
    }
    if (isConnecting) {
      return { text: '连接中...', className: 'connecting' };
    }
    if (isConnected) {
      return { text: '已连接', className: 'connected' };
    }
    return { text: '未连接', className: 'disconnected' };
  };

  const status = getStatusDisplay();

  return (
    <div className="avatar-connection p-6">
      <h3 className="text-xl font-semibold mb-4">数字人连接</h3>

      {/* 连接状态 */}
      <div
        className={`connection-status flex items-center gap-2 mb-4 p-3 rounded ${
          status.className === 'connected'
            ? 'bg-green-100 text-green-700'
            : status.className === 'connecting'
            ? 'bg-yellow-100 text-yellow-700'
            : status.className === 'error'
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700'
        }`}
      >
        <span
          className={`status-indicator w-3 h-3 rounded-full ${
            status.className === 'connected'
              ? 'bg-green-500'
              : status.className === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : status.className === 'error'
              ? 'bg-red-500'
              : 'bg-gray-500'
          }`}
        />
        <span className="font-medium">{status.text}</span>
      </div>

      {connectionError && (
        <div className="error-message mb-4 p-3 bg-red-100 text-red-700 rounded">
          错误：{connectionError}
        </div>
      )}

      {/* 当前配置信息 */}
      {!isEditingConfig && (
        <div className="current-config mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
          <h4 className="font-medium text-gray-700 mb-2">当前配置</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">App ID：</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {maskedConfig.appId}
              </span>
            </div>
            <div>
              <span className="text-gray-500">App Secret：</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {maskedConfig.appSecret}
              </span>
            </div>
          </div>
          {maskedConfig.isDefault && (
            <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              使用默认测试配置
            </div>
          )}
        </div>
      )}

      {/* 连接控制按钮 */}
      {!isEditingConfig ? (
        <div className="connection-actions flex flex-wrap gap-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isConnecting ? '连接中...' : '连接数字人'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              断开连接
            </button>
          )}
          <button
            onClick={() => setIsEditingConfig(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            修改配置
          </button>
          {!maskedConfig.isDefault && (
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              恢复默认
            </button>
          )}
        </div>
      ) : (
        <div className="config-edit space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              应用ID (App ID)
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              placeholder="输入魔珐星云应用的App ID"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              应用密钥 (App Secret)
            </label>
            <input
              type="password"
              value={config.appSecret}
              onChange={(e) =>
                setConfig({ ...config, appSecret: e.target.value })
              }
              placeholder="输入魔珐星云应用的App Secret"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              网关地址 (Gateway Server)
            </label>
            <input
              type="text"
              value={config.gatewayServer}
              onChange={(e) =>
                setConfig({ ...config, gatewayServer: e.target.value })
              }
              placeholder="默认：https://nebula-agent.xingyun3d.com/user/v1/ttsa/session"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="edit-actions flex gap-2">
            <button
              onClick={handleSaveConfig}
              disabled={!config.appId || !config.appSecret}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              保存配置
            </button>
            <button
              onClick={() => setIsEditingConfig(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="success-message mt-4 p-3 bg-green-100 text-green-700 rounded">
          ✓ 配置已更新
        </div>
      )}

      <div className="connection-info mt-6 text-sm text-gray-600">
        <p className="mb-2">
          💡 提示：默认使用测试配置进行开发调试。生产环境请使用自己的配置。
        </p>
        <p className="mb-2">
          📌 如需创建自己的应用，请前往魔珐星云平台注册。
        </p>
        <a
          href="https://xingyun3d.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          前往魔珐星云 →
        </a>
      </div>
    </div>
  );
}

export default AvatarConnection;
