/**
 * 互动播放室组件
 * 主要互动界面，包含数字人、字幕和分支选择
 */

import { useState, useEffect, useRef } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { useStore } from '../../store/useStore';
import { storyEngine } from '../../services/StoryEngine';
import { chunkText } from '../../utils/textChunker';
import AvatarContainer from '../StoryTeller/AvatarContainer';
import AIChatPanel from '../Dialogue/AIChatPanel';
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

  const { speakStream, voiceState, isConnected, disconnect } = useAvatar();
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

    const chunks = chunkText(node.content.narrative, 50);
    console.log('[PlayRoom] Text divided into', chunks.length, 'chunks');

    isSpeakingRef.current = true;

    for (let i = 0; i < chunks.length; i++) {
      const isStart = i === 0;
      const isEnd = i === chunks.length - 1;
      const chunk = chunks[i].text;

      speakStream(chunk, isStart, isEnd);

      // 等待这个chunk朗读完成
      await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (voiceState === 'end') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // chunk之间的短暂停顿
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('[PlayRoom] Speech completed for node:', node.id);
    isSpeakingRef.current = false;
    if (node.choices.length > 0) {
      setShowChoices(true);
    }
  }

  async function handleChoice(choiceId: string) {
    setIsGenerating(true);
    setShowChoices(false);

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
    <div className="flex w-screen h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* 左侧：剧情内容和分支选择 */}
      <div className="flex flex-col w-1/4 min-w-[300px] bg-black/30 backdrop-blur-sm border-r border-white/10">
        {/* 顶部操作栏 */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold truncate flex-1">{currentNode.title || '故事进行中'}</h2>
          <button
            onClick={handleExit}
            className="ml-2 px-3 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-sm shadow-lg flex-shrink-0"
          >
            返回
          </button>
        </div>

        {/* 会话统计 */}
        {sessionStats && (
          <div className="px-4 py-2 bg-black/20 border-b border-white/10 flex gap-3 text-white/60 text-xs">
            <span>节点: {sessionStats.totalNodesVisited}</span>
            <span>选择: {sessionStats.totalChoicesMade}</span>
          </div>
        )}

        {/* 剧情内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white/10 rounded-lg p-4 mb-4">
            <p className="text-white leading-relaxed whitespace-pre-wrap">
              {currentNode.content.narrative}
            </p>
          </div>

          {isGenerating && (
            <div className="bg-black/40 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-400"></div>
              <span className="text-white text-sm">AI正在生成后续剧情...</span>
            </div>
          )}
        </div>

        {/* 分支选项 */}
        <div className="p-4 border-t border-white/10 bg-black/40 max-h-[40%] overflow-y-auto">
          {choicesUpdatedByAI && (
            <div className="mb-3 px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-blue-300">分支选项已根据AI对话调整</span>
            </div>
          )}
          {showChoices && currentNode.choices.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-white/80 text-sm font-medium mb-3">选择你的行动</h3>
              {currentNode.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.id)}
                  disabled={isGenerating}
                  className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 rounded-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-white text-xs">
                      {index + 1}
                    </span>
                    <p className="text-white text-sm">{choice.text}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !isGenerating && (
              <p className="text-white/60 text-sm text-center">
                {currentNode.choices.length === 0 ? '故事已完结' : '等待数字人讲述完成...'}
              </p>
            )
          )}
        </div>
      </div>

      {/* 中间：数字人 */}
      <div style={{
        flex: '1',
        position: 'relative',
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <AvatarContainer />

        {/* 断开连接按钮 */}
        {isConnected && (
          <button
            onClick={disconnect}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 50,
              padding: '8px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(220, 38, 38)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'}
          >
            <svg style={{ width: '16px', height: '16px', marginRight: '8px', display: 'inline-block' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            断开
          </button>
        )}
      </div>

      {/* 右侧：AI对话面板 */}
      <div className="w-1/4 min-w-[300px] bg-black/30 backdrop-blur-sm border-l border-white/10 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-white/10 bg-black/40">
          <h2 className="text-white text-lg font-semibold">AI智能对话</h2>
          <p className="text-white/60 text-sm mt-1">
            {isConnected ? '✨ 数字人已连接，可与您对话' : '💬 与AI互动，输入想法让故事继续发展'}
          </p>
        </div>

        {/* AI对话内容 */}
        <AIChatPanel
          currentNode={currentNode}
          worldId={worldId}
          storylineId={storylineId}
          onChoicesUpdate={handleChoicesUpdate}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
}

export default PlayRoom;
