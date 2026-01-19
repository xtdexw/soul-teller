/**
 * 故事相关类型定义
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  summary: string;
  chapters: Chapter[];
  characters: Character[];
  createdAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  index: number;
}

export interface Character {
  id: string;
  name: string;
  personality: string;
  background: string;
  speakingStyle: string;
  avatar?: string;
}

/**
 * 数字人相关类型定义
 */

export interface XingyunConfig {
  containerId?: string;  // 可选，由 useAvatar hook 内部管理
  appId: string;
  appSecret: string;
  gatewayServer: string;
}

export interface AvatarCallbacks {
  onMessage?: (message: any) => void;
  onStateChange?: (state: string) => void;
  onVoiceStateChange?: (status: 'start' | 'end') => void;
  onStatusChange?: (status: number) => void;
  onWidgetEvent?: (data: any) => void;
}

export interface AvatarState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  currentMode: 'telling' | 'dialogue' | 'branch' | null;
}

/**
 * 对话相关类型定义
 */

export interface DialogueMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  characterId?: string;
}

/**
 * 分支剧情相关类型定义
 */

export interface StoryBranch {
  id: string;
  parentId: string | null;
  content: string;
  choices: BranchChoice[];
  createdAt: number;
}

export interface BranchChoice {
  id: string;
  text: string;
  branchId: string;
}
