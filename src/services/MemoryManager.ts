/**
 * 角色记忆管理服务
 * 用于管理数字人的记忆、状态和互动历史
 */

import type {
  CharacterMemory,
  CharacterState,
  UserChoice,
  DialogueMessage,
  EmotionAnalysis,
  ResponseStrategy,
} from '../types/memory';

class MemoryManager {
  private memory: CharacterMemory | null = null;
  private storageKey = 'soul-teller-character-memory';

  /**
   * 初始化角色记忆
   */
  initialize(
    sessionId: string,
    characterName: string,
    characterPersona: string,
    worldId: string,
    storylineId: string
  ): void {
    // 尝试从 localStorage 加载已有记忆
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 检查是否是同一会话
        if (parsed.sessionId === sessionId) {
          this.memory = parsed;
          console.log('[MemoryManager] Loaded existing memory:', this.memory);
          return;
        }
      } catch (error) {
        console.warn('[MemoryManager] Failed to load saved memory:', error);
      }
    }

    // 创建新记忆
    this.memory = {
      sessionId,
      characterName,
      characterPersona,
      state: {
        mood: 'calm',
        energy: 100,
        trust: 50,
        engagement: 50,
      },
      context: {
        currentWorldId: worldId,
        currentStorylineId: storylineId,
        currentNodeId: '',
        visitedNodes: [],
        totalChoices: 0,
        totalInteractions: 0,
      },
      choices: [],
      dialogueHistory: [],
      keyMemories: [],
      lastUpdate: Date.now(),
    };

    this.save();
    console.log('[MemoryManager] Created new memory:', this.memory);
  }

  /**
   * 保存记忆到 localStorage
   */
  private save(): void {
    if (this.memory) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory));
    }
  }

  /**
   * 获取当前记忆
   */
  getMemory(): CharacterMemory | null {
    return this.memory;
  }

  /**
   * 获取角色状态
   */
  getState(): CharacterState | null {
    return this.memory?.state || null;
  }

  /**
   * 更新角色状态
   */
  updateState(updates: Partial<CharacterState>): void {
    if (!this.memory) return;

    this.memory.state = {
      ...this.memory.state,
      ...updates,
    };
    this.memory.lastUpdate = Date.now();
    this.save();
    console.log('[MemoryManager] State updated:', this.memory.state);
  }

  /**
   * 记录用户选择
   */
  recordChoice(nodeId: string, choiceId: string, choiceText: string): void {
    if (!this.memory) return;

    const choice: UserChoice = {
      nodeId,
      choiceId,
      choiceText,
      timestamp: Date.now(),
    };

    this.memory.choices.push(choice);
    this.memory.context.totalChoices++;
    this.save();

    console.log('[MemoryManager] Choice recorded:', choice);

    // 根据选择更新状态
    this.updateStateFromChoice(choice);
  }

  /**
   * 记录对话消息
   */
  recordMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    emotion?: string
  ): void {
    if (!this.memory) return;

    const message: DialogueMessage = {
      role,
      content,
      timestamp: Date.now(),
      emotion,
    };

    this.memory.dialogueHistory.push(message);

    // 只保留最近50条消息
    if (this.memory.dialogueHistory.length > 50) {
      this.memory.dialogueHistory = this.memory.dialogueHistory.slice(-50);
    }

    if (role === 'user' || role === 'assistant') {
      this.memory.context.totalInteractions++;
    }

    this.save();
    console.log('[MemoryManager] Message recorded:', message);
  }

  /**
   * 更新当前节点
   */
  updateCurrentNode(nodeId: string): void {
    if (!this.memory) return;

    this.memory.context.currentNodeId = nodeId;

    if (!this.memory.context.visitedNodes.includes(nodeId)) {
      this.memory.context.visitedNodes.push(nodeId);
    }

    this.memory.lastUpdate = Date.now();
    this.save();
  }

  /**
   * 添加关键记忆
   */
  addKeyMemory(memory: string): void {
    if (!this.memory) return;

    this.memory.keyMemories.push(memory);

    // 只保留最近20条关键记忆
    if (this.memory.keyMemories.length > 20) {
      this.memory.keyMemories = this.memory.keyMemories.slice(-20);
    }

    this.save();
    console.log('[MemoryManager] Key memory added:', memory);
  }

  /**
   * 获取对话历史摘要（用于LLM提示）
   */
  getDialogueSummary(maxMessages: number = 10): string {
    if (!this.memory || this.memory.dialogueHistory.length === 0) {
      return '这是我们第一次对话。';
    }

    const characterName = this.memory.characterName;
    const recent = this.memory.dialogueHistory.slice(-maxMessages);
    return recent
      .map((msg) => {
        const emotion = msg.emotion ? ` (${msg.emotion})` : '';
        return `${msg.role === 'user' ? '你' : characterName}${emotion}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * 获取选择历史摘要
   */
  getChoicesSummary(): string {
    if (!this.memory || this.memory.choices.length === 0) {
      return '';
    }

    return this.memory.choices
      .slice(-5) // 最近5个选择
      .map((choice, index) => `${index + 1}. ${choice.choiceText}`)
      .join('\n');
  }

  /**
   * 根据用户选择更新角色状态
   */
  private updateStateFromChoice(choice: UserChoice): void {
    if (!this.memory) return;

    // 简单的状态更新逻辑（可以根据具体需求扩展）
    const text = choice.choiceText.toLowerCase();

    // 积极选择增加能量和信任
    if (text.includes('探索') || text.includes('前进') || text.includes('尝试')) {
      this.updateState({
        energy: Math.min(100, this.memory.state.energy + 5),
        trust: Math.min(100, this.memory.state.trust + 3),
        mood: 'excited',
      });
    }
    // 消极选择降低能量
    else if (text.includes('放弃') || text.includes('逃避') || text.includes('退缩')) {
      this.updateState({
        energy: Math.max(0, this.memory.state.energy - 10),
        mood: 'worried',
      });
    }
    // 攻击性选择增加参与度但降低信任
    else if (text.includes('攻击') || text.includes('战斗') || text.includes('对抗')) {
      this.updateState({
        engagement: Math.min(100, this.memory.state.engagement + 10),
        trust: Math.max(0, this.memory.state.trust - 5),
        mood: 'excited',
      });
    }
  }

  /**
   * 根据情绪分析更新状态
   */
  updateFromEmotion(emotion: EmotionAnalysis): void {
    if (!this.memory) return;

    // 根据情绪更新状态
    if (emotion.sentiment === 'positive') {
      this.updateState({
        mood: 'happy',
        energy: Math.min(100, this.memory.state.energy + 5),
        trust: Math.min(100, this.memory.state.trust + 3),
      });
    } else if (emotion.sentiment === 'negative') {
      this.updateState({
        mood: 'worried',
        energy: Math.max(0, this.memory.state.energy - 10),
      });
    }

    console.log('[MemoryManager] State updated from emotion:', emotion);
  }

  /**
   * 生成回应策略
   */
  generateResponseStrategy(emotion?: EmotionAnalysis): ResponseStrategy {
    if (!this.memory) {
      return {
        action: 'speak',
        responseStyle: 'narrative',
      };
    }

    const state = this.memory.state;

    // 低能量时使用简单的对话风格
    if (state.energy < 30) {
      return {
        action: 'speak',
        responseStyle: 'conversational',
        emotion: 'calm',
      };
    }

    // 高信任度时更活跃
    if (state.trust > 70) {
      return {
        action: 'speak',
        responseStyle: 'dramatic',
        emotion: 'excited',
      };
    }

    // 根据情绪选择策略
    if (emotion?.sentiment === 'positive') {
      return {
        action: 'celebrate',
        responseStyle: 'conversational',
        emotion: 'happy',
        ssmlAction: 'Celebrate',
      };
    } else if (emotion?.sentiment === 'negative') {
      return {
        action: 'comfort',
        responseStyle: 'conversational',
        emotion: 'calm',
        ssmlAction: 'Comfort',
      };
    }

    // 默认策略
    return {
      action: 'speak',
      responseStyle: 'narrative',
    };
  }

  /**
   * 清除记忆
   */
  clear(): void {
    this.memory = null;
    localStorage.removeItem(this.storageKey);
    console.log('[MemoryManager] Memory cleared');
  }

  /**
   * 生成记忆提示词（用于LLM）
   */
  generateMemoryPrompt(): string {
    if (!this.memory) {
      return '';
    }

    const parts: string[] = [];

    // 角色设定
    parts.push(`## 你是${this.memory.characterName}`);
    parts.push(`人设: ${this.memory.characterPersona}`);

    // 当前状态
    parts.push(`\n## 当前状态`);
    parts.push(`心情: ${this.memory.state.mood}`);
    parts.push(`能量: ${this.memory.state.energy}/100`);
    parts.push(`信任度: ${this.memory.state.trust}/100`);
    parts.push(`参与度: ${this.memory.state.engagement}/100`);

    // 对话历史
    if (this.memory.dialogueHistory.length > 0) {
      parts.push(`\n## 最近对话`);
      parts.push(this.getDialogueSummary(5));
    }

    // 用户选择
    if (this.memory.choices.length > 0) {
      parts.push(`\n## 用户最近的选择`);
      parts.push(this.getChoicesSummary());
    }

    // 关键记忆
    if (this.memory.keyMemories.length > 0) {
      parts.push(`\n## 重要记忆`);
      parts.push(this.memory.keyMemories.slice(-5).join('\n'));
    }

    return parts.join('\n');
  }
}

export const memoryManager = new MemoryManager();
