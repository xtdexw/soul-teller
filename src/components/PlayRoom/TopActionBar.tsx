/**
 * 顶部操作栏组件 - 方案A：整合菜单
 * 右侧只保留一个"更多"按钮，点击展开所有操作
 */

import { useState, useRef, useEffect } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { storyEngine } from '../../services/StoryEngine';
import ExportButton from './ExportButton';
import type { InteractionSession } from '../../types/interaction';

interface TopActionBarProps {
  title: string;
  sessionStats?: {
    totalNodesVisited: number;
    totalChoicesMade: number;
  } | null;
  session: InteractionSession | null;
  onExit: () => void;
  currentNode?: any;
}

function TopActionBar({ title, sessionStats, session, onExit }: TopActionBarProps) {
  const { isConnected, disconnect } = useAvatar();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  async function handleDisconnect() {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setIsMenuOpen(false);
    try {
      disconnect();
    } finally {
      setIsDisconnecting(false);
    }
  }

  function handleExit() {
    setIsMenuOpen(false);
    if (isConnected) {
      disconnect();
    }
    storyEngine.endSession();
    onExit();
  }

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：标题和统计 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <h2 className="text-white text-base sm:text-lg font-semibold truncate" title={title}>
            {title}
          </h2>
          {sessionStats && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full flex-shrink-0">
              <span className="text-white/60 text-xs">{sessionStats.totalNodesVisited} 节点</span>
              <span className="text-white/20">•</span>
              <span className="text-white/60 text-xs">{sessionStats.totalChoicesMade} 选择</span>
            </div>
          )}
        </div>

        {/* 右侧：更多操作按钮 */}
        <div className="relative" ref={menuRef}>
          {/* 更多按钮 */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
            title="更多操作"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* 下拉菜单 */}
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl z-50">
              <div className="py-2">
                {/* 导出区域 */}
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs text-white/50 mb-2">导出故事</p>
                  <div className="relative">
                    <ExportButton session={session} />
                  </div>
                </div>

                {/* 连接操作 */}
                {isConnected && (
                  <div className="px-3 py-2 border-b border-white/10">
                    <button
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="w-full px-3 py-2 bg-red-600/80 hover:bg-red-600 disabled:bg-red-900/50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                    >
                      {isDisconnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          <span>断开中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>断开连接</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 返回操作 */}
                <div className="px-3 py-2">
                  <button
                    onClick={handleExit}
                    className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>返回主页</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopActionBar;
