/**
 * 互动式故事系统 - 类型定义
 */

/**
 * 角色档案
 */
export interface CharacterProfile {
  id: string;
  name: string;
  personality: string;      // 性格描述
  background: string;       // 背景故事
  speakingStyle: string;    // 说话风格
  avatar?: string;          // 头像/形象描述
}

/**
 * 故事世界配置
 */
export interface WorldContext {
  worldview: string;        // 世界观设定
  characters: CharacterProfile[];
  coreConflict: string;     // 核心冲突
  atmosphere: string;       // 氛围基调
}

/**
 * 故事节点类型
 */
export type NodeType = 'opening' | 'branch' | 'ending';

/**
 * SSML动作配置
 */
export interface SSMLAction {
  type: 'ka' | 'ka_intent';
  action?: string;
  intent?: 'Think' | 'Listen' | 'Welcome' | 'Dance';
}

/**
 * 故事节点内容
 */
export interface NodeContent {
  narrative: string;        // 数字人演绎的叙述文本
  ssmlActions: SSMLAction[]; // 配置的SSML动作
  atmosphereHint?: string;  // 氛围提示（可选，用于后续生成）
}

/**
 * 分支选项
 */
export interface StoryChoice {
  id: string;
  text: string;             // 选项文本，如"勇敢地冲向敌人"
  consequences: string;     // 后果提示，如"可能会受伤"
  isAIGenerated: boolean;   // 是否由AI生成
  nextNodeId?: string;      // 预定义的下一节点ID（可选）
}

/**
 * 故事节点
 */
export interface StoryNode {
  id: string;
  type: NodeType;
  content: NodeContent;
  choices: StoryChoice[];   // 该节点后可选择的分支
  parentChoiceId?: string;  // 到达此节点的选择ID（用于回溯）
}

/**
 * 故事线
 * 一个故事世界可包含多条故事线
 */
export interface Storyline {
  id: string;
  name: string;             // 故事线名称，如"勇者之路"
  description: string;      // 简短描述
  startingNode: StoryNode;  // 起始节点
}

/**
 * 故事世界
 */
export interface StoryWorld {
  id: string;
  name: string;             // 故事世界名称
  description: string;      // 简介
  coverImage?: string;      // 封面图片（可选）
  context: WorldContext;    // 世界观配置
  storylines: Storyline[];  // 包含的故事线
}

/**
 * 向量存储项
 * 用于上下文检索
 */
export interface VectorItem {
  id: string;
  text: string;             // 原始文本
  embedding: number[];      // 向量表示
  metadata?: {
    nodeId?: string;
    characterId?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

/**
 * AI生成选项（用于内部处理）
 */
export interface GeneratedChoice {
  text: string;
  consequences: string;
}

/**
 * AI生成配置
 */
export interface AIGenerationConfig {
  temperature?: number;     // 温度参数（0-1）
  maxTokens?: number;       // 最大生成长度
  streamOutput?: boolean;   // 是否流式输出
}

/**
 * 生成结果
 */
export interface GenerationResult {
  content: string;
  isComplete: boolean;
  chunks?: string[];        // 分块内容（用于朗读）
}
