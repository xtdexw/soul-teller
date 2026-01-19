/**
 * 角色记忆系统类型定义
 * 用于实现有性格、记忆和互动风格的数字人
 */

/**
 * 用户选择记录
 */
export interface UserChoice {
  nodeId: string;
  choiceId: string;
  choiceText: string;
  timestamp: number;
}

/**
 * 对话消息
 */
export interface DialogueMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  emotion?: string; // 情绪标签
}

/**
 * 角色状态
 */
export interface CharacterState {
  mood: 'happy' | 'sad' | 'excited' | 'calm' | 'surprised' | 'worried';
  energy: number; // 0-100，能量值
  trust: number; // 0-100，信任度
  engagement: number; // 0-100，参与度
}

/**
 * 上下文记忆
 */
export interface ContextMemory {
  currentWorldId: string;
  currentStorylineId: string;
  currentNodeId: string;
  visitedNodes: string[];
  totalChoices: number;
  totalInteractions: number;
}

/**
 * 角色记忆
 */
export interface CharacterMemory {
  sessionId: string;
  characterName: string;
  characterPersona: string; // 角色人格设定
  state: CharacterState;
  context: ContextMemory;
  choices: UserChoice[];
  dialogueHistory: DialogueMessage[];
  keyMemories: string[]; // 重要记忆片段
  lastUpdate: number;
}

/**
 * 情绪分析结果
 */
export interface EmotionAnalysis {
  primary: string; // 主要情绪
  confidence: number; // 置信度 0-1
  sentiment: 'positive' | 'negative' | 'neutral'; // 情感倾向
  keywords: string[]; // 关键词
}

/**
 * 对话回应策略
 */
export interface ResponseStrategy {
  action: 'speak' | 'think_first' | 'listen_more' | 'celebrate' | 'comfort';
  emotion?: CharacterState['mood'];
  ssmlAction?: string; // KA动作指令
  responseStyle: 'narrative' | 'conversational' | 'dramatic' | 'mysterious';
}
