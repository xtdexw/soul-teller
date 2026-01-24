import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { storyEngine } from './services/StoryEngine';
import { ErrorBoundary, Loading } from './components/Common';
import StoryHub from './components/StoryHub/StoryHub';
import PlayRoom from './components/PlayRoom/PlayRoom';
import SettingsPanel from './components/Settings/SettingsPanel';

function App() {
  const { currentView, isSettingsOpen, setSettingsOpen, setCurrentWorld, setCurrentView, currentWorldId, currentStorylineId, avatarConnection } = useStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化 - 只在首次加载时检查一次
  useEffect(() => {
    console.log('[App] Initializing...', { currentView, isSettingsOpen });

    // 清理localStorage中的旧会话数据
    storyEngine.clearAllOldSessions();

    // 修复状态不一致：如果 currentView 是 playroom 但没有 worldId，重置为 storyhub
    if (currentView === 'playroom' && (!currentWorldId || !currentStorylineId)) {
      console.log('[App] State inconsistency detected, resetting view to storyhub');
      setCurrentView('storyhub');
    }

    setIsInitialized(true);
    console.log('[App] Initialized with view:', currentView);
  }, []); // 空依赖数组，只在挂载时运行一次

  const handleSelectWorld = (worldId: string, storylineId: string) => {
    setCurrentWorld(worldId, storylineId);
    setCurrentView('playroom');
  };

  const handleExitPlayRoom = () => {
    setCurrentWorld(null, null);
    setCurrentView('storyhub');
  };

  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // 可以在这里上报错误到监控服务
    console.error('[App] Error caught by ErrorBoundary:', error, errorInfo);
  };

  if (!isInitialized) {
    return <Loading text="加载中..." size="lg" fullscreen />;
  }

  return (
    <ErrorBoundary onError={handleError}>
      <div className="app">
        {/* 设置按钮 - 仅在 StoryHub 页面显示，避免与 PlayRoom 操作栏重叠 */}
        {currentView === 'storyhub' && (
          <button
            onClick={() => {
              if (avatarConnection.isConnected) {
                return; // 已连接时不做任何事
              }
              setSettingsOpen(true);
            }}
            className="settings-btn fixed top-4 right-4 z-50 p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            title={avatarConnection.isConnected ? "数字人已连接，无法修改系统设置。请先断开数字人连接。" : "系统设置"}
            style={{
              opacity: avatarConnection.isConnected ? 0.5 : 1,
              cursor: avatarConnection.isConnected ? 'not-allowed' : 'pointer'
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}

        {/* 主内容区域 */}
        <main className="main-content">
          {currentView === 'storyhub' && <StoryHub onSelectWorld={handleSelectWorld} />}

          {currentView === 'playroom' && currentWorldId && currentStorylineId && (
            <PlayRoom
              worldId={currentWorldId}
              storylineId={currentStorylineId}
              onExit={handleExitPlayRoom}
            />
          )}

          {/* 修复状态不一致的回退：如果 view 是 playroom 但没有 ID，显示 StoryHub */}
          {currentView === 'playroom' && (!currentWorldId || !currentStorylineId) && (
            <>
              {console.warn('[App] Invalid state: playroom without worldId/storylineId, showing StoryHub')}
              <StoryHub onSelectWorld={handleSelectWorld} />
            </>
          )}
        </main>

        {/* 设置面板 */}
        {isSettingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </div>
    </ErrorBoundary>
  );
}

export default App;
