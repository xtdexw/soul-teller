/**
 * AI对话面板组件（简化版）
 * 通过AI对话影响分支选项
 */

import { useState, useRef, useEffect } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { storyGenerator } from '../../services/StoryGenerator';
import type { StoryNode } from '../../types/story';

interface AIChatPanelProps {
  currentNode: StoryNode;
  worldId: string;
  storylineId: string;
  onChoicesUpdate: (choices: StoryNode['choices']) => void;
  disabled?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: string;
}

function AIChatPanel({ currentNode, worldId, storylineId, onChoicesUpdate, disabled }: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取数字人控制方法
  const { isConnected } = useAvatar();

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * 发送用户输入并调整分支选项（简化版）
   * 流程：用户输入 → AI分析意图 → 调整分支选项
   */
  async function handleSend() {
    if (!input.trim() || isGenerating) return;

    const userInput = input.trim();
    setInput('');
    setIsGenerating(true);

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // 生成简单的AI回应（仅用于显示）
      const aiResponse = await generateSimpleResponse(userInput, currentNode);

      // 添加AI回复消息
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // 根据对话内容调整分支选项
      console.log('[AIChatPanel] Adjusting choices based on dialogue...');
      const adjustedChoices = await storyGenerator.influenceChoices(
        currentNode,
        userInput,
        aiResponse
      );

      console.log('[AIChatPanel] Adjusted choices:', adjustedChoices);

      // 通过回调更新分支选项
      onChoicesUpdate(adjustedChoices);
    } catch (error) {
      console.error('[AIChatPanel] Error:', error);

      // 添加错误消息
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `抱歉，处理你的想法时出现错误。请重试或选择预设的分支选项。`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * 生成简单的AI回应（仅用于对话显示）
   */
  async function generateSimpleResponse(userInput: string, currentNode: StoryNode): Promise<string> {
    // 简单的回应映射（实际项目中可以用AI生成）
    const responses = [
      `我明白了你的想法：${userInput}。让我根据你的意图调整后续的选择。`,
      `好的，我理解你的意思是：${userInput}。这确实是一个有趣的方向。`,
      `收到，我会根据"${userInput}"来调整故事的走向。`,
    ];

    // 随机返回一个回应
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * 清空对话历史
   */
  function handleClear() {
    setMessages([]);
    memoryManager.clear();
  }

  /**
   * 处理键盘事件（Enter发送，Shift+Enter换行）
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /**
   * 获取情绪指示器颜色
   */
  function getEmotionColor(emotion?: string): string {
    const emotionColors: Record<string, string> = {
      '快乐': 'bg-yellow-400',
      '悲伤': 'bg-blue-400',
      '愤怒': 'bg-red-400',
      '惊讶': 'bg-purple-400',
      '恐惧': 'bg-gray-400',
      '期待': 'bg-green-400',
      '平静': 'bg-gray-300',
    };
    return emotionColors[emotion || ''] || 'bg-gray-300';
  }

  // 直接返回面板内容，不包含浮动窗口
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <svg className="w-12 h-12 mx-auto mb-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">与AI智能对话</p>
            <p className="text-xs mt-1">
              {isConnected ? '✨ 与AI对话（仅文字），分支会智能调整' : '💬 与AI对话，影响分支选项'}
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex flex-col items-start gap-1 max-w-[85%]">
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-purple-200' : 'text-white/60'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* 情绪指示器 */}
                  {message.emotion && message.role === 'assistant' && (
                    <div className="flex items-center gap-1 ml-2">
                      <div className={`w-2 h-2 rounded-full ${getEmotionColor(message.emotion)}`}></div>
                      <span className="text-[10px] text-white/60">{message.emotion}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/10 bg-black/40">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "与数字人对话... (Enter发送)" : "输入想法，影响分支选项... (Enter发送)"}
            disabled={isGenerating || disabled}
            rows={2}
            className="flex-1 resize-none px-3 py-2 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-transparent disabled:bg-white/5 disabled:cursor-not-allowed text-sm"
            style={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating || disabled}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-white/10 text-white rounded-lg transition-colors"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-white/40 mt-2">
          {isConnected ? (
            <>💡 提示：AI对话仅显示文字。选择分支后，数字人会朗读新的剧情内容</>
          ) : (
            <>💡 提示：输入你的想法，AI会调整分支选项，然后你从分支中选择推动剧情</>
          )}
        </p>
      </div>
    </div>
  );
}

export default AIChatPanel;
