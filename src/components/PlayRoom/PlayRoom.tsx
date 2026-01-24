/**
 * 互动播放室组件
 * 主要互动界面，包含数字人、字幕和分支选择
 */

import { useState, useEffect, useRef } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { useStore } from '../../store/useStore';
import { storyEngine } from '../../services/StoryEngine';
import AvatarContainer from '../StoryTeller/AvatarContainer';
import AIChatPanel from '../Dialogue/AIChatPanel';
import { SceneBackground } from './SceneBackground';
import ExportButton from './ExportButton';
import TopActionBar from './TopActionBar';
import type { StoryNode } from '../../types/story';

interface PlayRoomProps {
  worldId: string;
  storylineId: string;
  onExit: () => void;
}

function PlayRoom({ worldId, storylineId, onExit }: PlayRoomProps) {
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [choicesUpdatedByAI, setChoicesUpdatedByAI] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    totalNodesVisited: number;
    totalChoicesMade: number;
  } | null>(null);

  const { speakStream, voiceState, isConnected, disconnect, interactiveIdle } = useAvatar();
  const prevVoiceStateRef = useRef<'start' | 'end'>('end');
  const isSpeakingRef = useRef(false);
  const spokenNodeIdsRef = useRef<Set<string>>(new Set()); // 跟踪已朗读的节点ID

  // 初始化会话
  useEffect(() => {
    async function initSession() {
      try {
        // 清空已朗读节点的记录（新会话）
        spokenNodeIdsRef.current.clear();

        const session = await storyEngine.startSession(worldId, storylineId);
        setCurrentNode(session.currentNode);
      } catch (error) {
        console.error('[PlayRoom] Init session error:', error);
      }
    }

    initSession();

    // 订阅会话状态变化
    const unsubscribe = storyEngine.subscribe((session) => {
      setCurrentNode(session.currentNode);
      setSessionStats(storyEngine.getSessionStats());
    });

    return () => unsubscribe();
  }, [worldId, storylineId]);

  // 当数字人连接状态变化时，检查是否需要朗读当前节点
  useEffect(() => {
    if (isConnected && currentNode && !isGenerating && !isSpeakingRef.current) {
      const nodeId = currentNode.id;
      const hasAlreadySpoken = spokenNodeIdsRef.current.has(nodeId);

      if (!hasAlreadySpoken) {
        console.log('[PlayRoom] Avatar connected, speaking first node:', nodeId);
        spokenNodeIdsRef.current.add(nodeId);
        speakNodeContent(currentNode);
      }
    }
  }, [isConnected]); // 只监听 isConnected 变化

  // 监听语音状态，当朗读完成后显示选项
  useEffect(() => {
    if (prevVoiceStateRef.current === 'start' && voiceState === 'end') {
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        if (currentNode && currentNode.choices.length > 0) {
          setShowChoices(true);
        }
      }
    }
    prevVoiceStateRef.current = voiceState;
  }, [voiceState, currentNode]);

  // 当节点变化时，开始朗读（仅当数字人已连接）
  useEffect(() => {
    // 如果数字人还没连接，跳过朗读（等连接后再处理）
    if (!isConnected) {
      return;
    }

    if (currentNode && !isGenerating && !isSpeakingRef.current) {
      const nodeId = currentNode.id;
      const hasAlreadySpoken = spokenNodeIdsRef.current.has(nodeId);

      // 只有当这个节点ID还没有被朗读过时，才朗读
      if (!hasAlreadySpoken) {
        console.log('[PlayRoom] Speaking new node:', nodeId);
        spokenNodeIdsRef.current.add(nodeId);
        speakNodeContent(currentNode);
      } else {
        // 这个节点已经朗读过了，只是choices被AI调整了，不朗读
        if (currentNode.choices.length > 0) {
          setShowChoices(true);
        }
      }
    }
  }, [currentNode, isGenerating, isConnected]);

  async function speakNodeContent(node: StoryNode) {
    console.log('[PlayRoom] Starting speech for node:', node.id);

    setShowChoices(false);

    if (!isConnected) {
      isSpeakingRef.current = false;
      if (node.choices.length > 0) {
        setShowChoices(true);
      }
      return;
    }

    isSpeakingRef.current = true;

    try {
      // 参考 math-tutor-ai 的实现：直接传完整文本给SDK
      // 不需要手动分块，让SDK自己处理
      console.log('[PlayRoom] Speaking full text:', node.content.narrative);

      // 直接调用 speak，isStart=true, isEnd=true
      speakStream(node.content.narrative, true, true);

      // 等待朗读完成（voiceState 变为 'end'）
      await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (voiceState === 'end') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // 超时保护：30秒后自动继续
        setTimeout(() => {
          clearInterval(checkInterval);
          console.warn('[PlayRoom] Speech timeout after 30s');
          resolve();
        }, 30000);
      });

      console.log('[PlayRoom] Speech completed for node:', node.id);
    } catch (error) {
      console.error('[PlayRoom] Speech error:', error);
    } finally {
      // 无论成功还是失败，都要重置状态并显示分支选项
      isSpeakingRef.current = false;
      if (node.choices.length > 0) {
        setShowChoices(true);
      }
    }
  }

  async function handleChoice(choiceId: string) {
    setIsGenerating(true);
    setShowChoices(false);

    // 停止当前朗读循环
    isSpeakingRef.current = false;

    // 参考 math-tutor-ai：使用 interactiveIdle 切换状态
    // 这会自动打断当前朗读并重置SDK状态
    if (isConnected) {
      console.log('[PlayRoom] Switching to interactiveIdle before handling choice...');
      interactiveIdle();

      // 短暂等待让SDK处理状态切换
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const newNode = await storyEngine.handleChoice(choiceId, true);
      if (newNode) {
        setCurrentNode(newNode);
      }
    } catch (error) {
      console.error('[PlayRoom] Handle choice error:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExit() {
    if (isConnected) {
      disconnect();
    }
    storyEngine.endSession();
    onExit();
  }

  function handleChoicesUpdate(newChoices: StoryNode['choices']) {
    console.log('[PlayRoom] Updating choices:', newChoices);
    if (currentNode) {
      // 更新本地状态
      setCurrentNode({
        ...currentNode,
        choices: newChoices,
      });

      // 同步更新StoryEngine的状态
      storyEngine.updateCurrentNodeChoices(newChoices);

      setShowChoices(true);
      setChoicesUpdatedByAI(true);

      // 3秒后隐藏提示
      setTimeout(() => {
        setChoicesUpdatedByAI(false);
      }, 3000);
    }
  }

  if (!currentNode) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400 mb-4"></div>
          <p className="text-xl">加载故事中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden relative" style={{ zIndex: 1 }}>
      {/* 层级 0: 动态背景 */}
      <SceneBackground
        worldId={worldId}
        sceneId={currentNode.content.sceneId}
      />

      {/* 层级 10: 左侧数字人展示区 (35%) */}
      <div className="w-[35%] min-w-[400px] relative" style={{ zIndex: 10, borderRight: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
        <div className="w-full h-full flex items-center justify-center">
          <AvatarContainer nodeIndex={sessionStats?.totalNodesVisited || 1} />
        </div>
      </div>

      {/* 层级 10: 右侧统一交互面板 (65%) */}
      <div className="flex-1 flex flex-col relative" style={{ zIndex: 10, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
        {/* 层级 20: 顶部操作栏 */}
        <div style={{ zIndex: 20, position: 'relative' }}>
          <TopActionBar
            title={currentNode.title || '故事进行中'}
            sessionStats={sessionStats}
            session={storyEngine.getCurrentSession()}
            onExit={onExit}
          />
        </div>

        {/* 层级 15: 可滚动内容区 (剧情 + 分支选项) */}
        <div className="flex-1 overflow-y-auto" style={{ zIndex: 15, position: 'relative', minHeight: 0 }}>
          {/* 1. 剧情内容区 */}
          <div className="p-6 border-b border-white/10">
            <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                  📖 当前剧情
                </span>
                {isGenerating && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-400"></div>
                    故事创作中...
                  </span>
                )}
              </div>
              <p className="text-white leading-relaxed whitespace-pre-wrap text-base">
                {currentNode.content.narrative}
              </p>
            </div>
          </div>

          {/* 2. 分支选项区 */}
          <div className="p-6">
            {choicesUpdatedByAI && (
              <div className="mb-4 px-4 py-3 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm text-blue-200">分支选项已根据AI对话调整</span>
              </div>
            )}

            {showChoices && currentNode.choices.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-white/90 text-base font-semibold mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  <span>选择你的行动</span>
                </h3>
                {currentNode.choices.map((choice, index) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.id)}
                    disabled={isGenerating || !isConnected}
                    className="w-full text-left px-5 py-4 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:cursor-not-allowed rounded-xl transition-all border border-white/10 hover:border-purple-500/30"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/30 flex items-center justify-center text-white text-sm font-semibold border border-purple-500/20">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-white text-base leading-relaxed">{choice.text}</p>
                        {choice.consequences && (
                          <p className="text-white/50 text-xs mt-2">💡 {choice.consequences}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              !isGenerating && (
                <div className="text-center py-8">
                  <p className="text-white/60 text-sm">
                    {currentNode.choices.length === 0 ? '📚 故事已完结' :
                      !isConnected ? '💡 请先连接数字人后再继续冒险' :
                      '🎙️ 等待数字人讲述完成...'}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* 层级 20: AI对话区 (固定在底部，不随上方滚动) */}
        <div className="border-t border-white/10" style={{ zIndex: 20, position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
          <div className="bg-white/5 backdrop-blur-sm">
            {/* AI对话标题 */}
            <div className="px-6 py-3 border-b border-white/10 bg-black/20">
              <h3 className="text-white/90 text-sm font-semibold flex items-center gap-2">
                <span>🤖</span>
                <span>AI智能对话</span>
                {isConnected && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">数字人已连接</span>
                )}
              </h3>
            </div>

            {/* AI对话内容 - 固定高度280px，内部可滚动 */}
            <div className="h-[280px]">
              <AIChatPanel
                currentNode={currentNode}
                worldId={worldId}
                storylineId={storylineId}
                onChoicesUpdate={handleChoicesUpdate}
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayRoom;
