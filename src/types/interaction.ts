/**
 * 互动会话 - 类型定义
 */

import type { StoryNode, StoryChoice } from './story';

/**
 * 互动会话状态
 */
export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

/**
 * 会话历史记录
 */
export interface SessionHistory {
  nodeId: string;
  choiceId: string;
  timestamp: number;
  narrative: string;        // 该节点的叙述内容
  selectedChoice: string;   // 用户选择的内容
}

/**
 * 互动会话
 * 一次完整的互动体验记录
 */
export interface InteractionSession {
  id: string;
  worldId: string;          // 故事世界ID
  storylineId: string;      // 故事线ID
  status: SessionStatus;
  currentNode: StoryNode | null;
  history: SessionHistory[];
  visitedNodes: Set<string>; // 已访问的节点ID
  startTime: number;
  lastUpdateTime: number;
}

/**
 * 分支生成请求
 */
export interface BranchGenerationRequest {
  currentNode: StoryNode;
  userContext?: string;     // 用户提供的额外上下文（可选）
  numChoices?: number;      // 需要生成的选项数量（默认3-4个）
}

/**
 * 剧情续写请求
 */
export interface ContinuationRequest {
  currentNode: StoryNode;
  selectedChoice: StoryChoice;
  worldContext: string;     // 故事世界上下文
  conversationHistory?: string[]; // 对话历史（可选）
}

/**
 * AI生成选项
 */
export interface GeneratedChoice {
  text: string;
  consequences: string;
}

/**
 * 会话统计信息
 */
export interface SessionStats {
  totalNodesVisited: number;
  totalChoicesMade: number;
  sessionDuration: number;  // 毫秒
  uniquePaths: number;      // 经历的不同路径数量
}

/**
 * 导出格式类型
 */
export type ExportFormat = 'txt' | 'markdown' | 'json';

/**
 * 故事导出数据
 */
export interface StoryExportData {
  // 元数据
  metadata: {
    exportDate: string;       // 导出日期 ISO格式
    worldName: string;        // 故事世界名称
    worldId: string;          // 故事世界ID
    storylineName: string;    // 故事线名称
    storylineId: string;      // 故事线ID
    totalNodes: number;       // 总节点数
    totalChoices: number;     // 总选择数
    playDuration: number;     // 游玩时长（毫秒）
  };

  // 故事路径（用户实际经历的故事线）
  storyPath: StoryPathEntry[];

  // 完整节点树（已访问的）
  visitedNodes: VisitedNodeEntry[];

  // 选择历史
  choiceHistory: ChoiceHistoryEntry[];
}

/**
 * 故事路径条目
 */
export interface StoryPathEntry {
  nodeId: string;
  sceneName?: string;        // 场景名称
  narrative: string;         // 剧情内容
  selectedChoice: {
    text: string;
    consequences?: string;
  } | null;
  timestamp: number;
}

/**
 * 已访问节点条目
 */
export interface VisitedNodeEntry {
  node: StoryNode;
  visitedAt: number;
}

/**
 * 选择历史条目
 */
export interface ChoiceHistoryEntry {
  choiceId: string;
  choiceText: string;
  fromNodeId: string;
  toNodeId: string;
  timestamp: number;
}

/**
 * 导出结果
 */
export interface ExportResult {
  format: ExportFormat;
  filename: string;
  content: string;
  size: number;              // 内容大小（字节）
}
