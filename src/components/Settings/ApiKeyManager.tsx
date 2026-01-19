import { useState, useEffect } from 'react';
import { secureStorage } from '../../utils/secureStorage';
import type { XingyunConfig } from '../../utils/secureStorage';
import { useStore } from '../../store/useStore';

type EditingSection = 'none' | 'apiKey' | 'xingyun';

// 确认对话框组件
function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* 图标 */}
        <div className="flex justify-center pt-6 pb-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 pb-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{message}</p>
        </div>

        {/* 按钮 */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-4 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-4 text-red-600 hover:bg-red-50 font-medium transition-colors border-l border-gray-100"
          >
            确认恢复
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyManager() {
  // 获取数字人连接状态
  const { avatarConnection } = useStore();
  const isConnected = avatarConnection.isConnected;

  // API密钥状态
  const [maskedKey, setMaskedKey] = useState('');
  const [customKey, setCustomKey] = useState('');

  // 星云配置状态
  const [maskedConfig, setMaskedConfig] = useState<{
    appId: string;
    appSecret: string;
    isDefault: boolean;
  }>({
    appId: '',
    appSecret: '',
    isDefault: true,
  });
  const [xingyunConfig, setXingyunConfig] = useState<XingyunConfig>({
    appId: '',
    appSecret: '',
    gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
  });
  const [showSecret, setShowSecret] = useState(false); // 控制是否显示密钥

  const [editingSection, setEditingSection] = useState<EditingSection>('none');
  const [showSuccess, setShowSuccess] = useState(false);

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    // 加载数据
    setMaskedKey(secureStorage.getMaskedApiKey());
    const currentConfig = secureStorage.getXingyunConfig();
    setXingyunConfig(currentConfig);
    setMaskedConfig(secureStorage.getMaskedXingyunConfig());
  }, []);

  // API密钥处理
  const handleSaveKey = () => {
    if (customKey.trim()) {
      secureStorage.setModelScopeApiKey(customKey.trim());
      setMaskedKey(secureStorage.getMaskedApiKey());
      setShowSuccess(true);
      setEditingSection('none');
      setCustomKey('');
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleResetToDefaultApiKey = () => {
    setConfirmDialog({
      isOpen: true,
      title: '恢复默认API密钥',
      message: '确定要恢复默认测试密钥吗？当前的自定义密钥将被清除。',
      onConfirm: () => {
        secureStorage.resetToDefaultApiKey();
        setMaskedKey(secureStorage.getMaskedApiKey());
        setCustomKey('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  // 星云配置处理
  const handleSaveXingyunConfig = () => {
    secureStorage.setXingyunConfig(xingyunConfig);
    setMaskedConfig(secureStorage.getMaskedXingyunConfig());
    setShowSuccess(true);
    setEditingSection('none');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleResetToDefaultXingyun = () => {
    setConfirmDialog({
      isOpen: true,
      title: '恢复默认星云配置',
      message: '确定要恢复默认测试配置吗？当前的自定义配置将被清除。',
      onConfirm: () => {
        secureStorage.resetToDefaultXingyunConfig();
        const defaultConfig = secureStorage.getXingyunConfig();
        setXingyunConfig(defaultConfig);
        setMaskedConfig(secureStorage.getMaskedXingyunConfig());
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 成功提示 - 固定在顶部 */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-fade-in">
          ✓ 配置已更新
        </div>
      )}

      {/* ModelScope API密钥 */}
      <section className="config-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ModelScope API密钥</h3>
            <p className="text-sm text-gray-500">用于AI故事生成和对话</p>
          </div>
        </div>

        <div className="config-card">
          {editingSection === 'apiKey' ? (
            // 编辑模式
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">输入新的API密钥</label>
                <input
                  type="password"
                  placeholder="请输入您的ModelScope API密钥"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveKey}
                  disabled={!customKey.trim()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingSection('none');
                    setCustomKey('');
                  }}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            // 显示模式
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">当前密钥</div>
                <div className="font-mono text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                  {maskedKey}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingSection('apiKey')}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  修改
                </button>
                <button
                  onClick={handleResetToDefaultApiKey}
                  className={`px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium ${maskedKey === '默认测试密钥' ? 'invisible' : ''}`}
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 魔珐星云配置 */}
      <section className="config-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">魔珐星云配置</h3>
            <p className="text-sm text-gray-500">用于3D数字人驱动</p>
          </div>
        </div>

        {/* 连接状态警告 */}
        {isConnected && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-800">
              <strong>数字人已连接</strong> - 修改配置可能会导致连接中断。请先断开数字人连接后再修改。
            </p>
          </div>
        )}

        <div className="config-card" style={isConnected ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
          {editingSection === 'xingyun' ? (
            // 编辑模式
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">应用ID (App ID)</label>
                <input
                  type="text"
                  value={xingyunConfig.appId}
                  onChange={(e) => setXingyunConfig({ ...xingyunConfig, appId: e.target.value })}
                  placeholder="输入魔珐星云应用的App ID"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">应用密钥 (App Secret)</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={xingyunConfig.appSecret}
                    onChange={(e) => setXingyunConfig({ ...xingyunConfig, appSecret: e.target.value })}
                    placeholder="输入魔珐星云应用的App Secret"
                    className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {showSecret ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">网关地址</label>
                <input
                  type="text"
                  value={xingyunConfig.gatewayServer}
                  onChange={(e) => setXingyunConfig({ ...xingyunConfig, gatewayServer: e.target.value })}
                  placeholder="默认：https://nebula-agent.xingyun3d.com/user/v1/ttsa/session"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveXingyunConfig}
                  disabled={!xingyunConfig.appId || !xingyunConfig.appSecret}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingSection('none')}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            // 显示模式
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">App ID</div>
                  <div className="font-mono text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {maskedConfig.appId}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">App Secret</div>
                  <div className="font-mono text-base text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {maskedConfig.appSecret}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    // 检查连接状态，如果已连接则阻止编辑
                    if (isConnected) {
                      return;
                    }
                    // 进入编辑模式时，如果不是默认配置，加载真实值
                    if (!maskedConfig.isDefault) {
                      const currentConfig = secureStorage.getXingyunConfig();
                      setXingyunConfig(currentConfig);
                    } else {
                      // 默认配置时清空输入框
                      setXingyunConfig({
                        appId: '',
                        appSecret: '',
                        gatewayServer: 'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session',
                      });
                    }
                    setShowSecret(false);
                    setEditingSection('xingyun');
                  }}
                  className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                  style={{ cursor: isConnected ? 'not-allowed' : 'pointer' }}
                >
                  修改配置
                </button>
                <button
                  onClick={handleResetToDefaultXingyun}
                  className={`px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium ${maskedConfig.isDefault ? 'invisible' : ''}`}
                  style={{ cursor: isConnected ? 'not-allowed' : 'pointer' }}
                >
                  恢复默认
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 说明信息 */}
      <section className="info-section">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">关于配置</h3>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <p><strong>本地安全存储：</strong>所有密钥和配置仅存储在您的浏览器本地，不会上传到任何服务器。</p>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">🔗 相关平台</p>
            <div className="space-y-2 pl-7">
              <a
                href="https://modelscope.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>📖</span>
                <span><strong>魔搭社区 (ModelScope)</strong> - 获取AI模型API密钥</span>
              </a>
              <a
                href="https://xingyun3d.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 hover:underline"
              >
                <span>🤖</span>
                <span><strong>魔珐星云平台</strong> - 创建数字人应用</span>
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">💡</span>
            <p>默认使用测试配置进行开发调试。生产环境或正式使用时，请使用您自己的密钥。</p>
          </div>
        </div>
      </section>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
}

export default ApiKeyManager;
