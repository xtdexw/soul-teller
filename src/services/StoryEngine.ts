/**
 * 故事引擎
 * 管理故事节点和状态流转
 */

import { v4 as uuidv4 } from 'uuid';
import type { StoryNode, StoryWorld } from '../types/story';
import type { InteractionSession, SessionHistory } from '../types/interaction';
import { storyGenerator } from './StoryGenerator';
import { vectorStore } from './VectorStore';
import { getWorldById, getStorylinesByWorldId, getSceneById } from './StoryWorlds';

/**
 * 节点缓存条目
 */
interface NodeCacheEntry {
  node: StoryNode;
  visitedAt: number;
  sceneName?: string;
}

/**
 * 故事引擎服务类
 */
class StoryEngineService {
  private currentSession: InteractionSession | null = null;
  private listeners: Set<(session: InteractionSession) => void> = new Set();
  // 节点缓存：存储所有访问过的节点，用于导出
  private nodeCache: Map<string, NodeCacheEntry> = new Map();

  /**
   * 订阅会话状态变化
   */
  subscribe(listener: (session: InteractionSession) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notify(): void {
    if (this.currentSession) {
      this.listeners.forEach(listener => listener(this.currentSession!));
    }
  }

  /**
   * 加载故事世界
   */
  async loadWorld(worldId: string): Promise<StoryWorld | null> {
    try {
      const world = getWorldById(worldId);
      if (!world) {
        console.error('[StoryEngine] World not found:', worldId);
        return null;
      }

      // 异步初始化向量存储（不阻塞主流程）
      vectorStore.init().then(() => {
        // 将故事世界上下文添加到向量存储
        vectorStore.addText(
          `world-${worldId}`,
          `世界观：${world.context.worldview}\n\n核心冲突：${world.context.coreConflict}\n\n氛围：${world.context.atmosphere}`,
          { type: 'world', worldId }
        ).catch(err => console.warn('[StoryEngine] Vectorize world failed:', err));

        // 添加角色信息到向量存储
        for (const character of world.context.characters) {
          vectorStore.addText(
            `character-${character.id}`,
            `角色：${character.name}\n性格：${character.personality}\n背景：${character.background}\n说话风格：${character.speakingStyle}`,
            { type: 'character', characterId: character.id, worldId }
          ).catch(err => console.warn('[StoryEngine] Vectorize character failed:', err));
        }
      }).catch(err => {
        console.warn('[StoryEngine] Vector store init failed:', err);
      });

      console.log('[StoryEngine] World loaded:', world.name);
      return world;
    } catch (error) {
      console.error('[StoryEngine] Load world error:', error);
      throw new Error('加载故事世界失败');
    }
  }

  /**
   * 开始新的互动会话
   */
  async startSession(worldId: string, storylineId: string): Promise<InteractionSession> {
    try {
      // 清空节点缓存
      this.nodeCache.clear();

      // 加载故事世界
      await this.loadWorld(worldId);

      const world = getWorldById(worldId);
      if (!world) {
        throw new Error('故事世界不存在');
      }

      const storylines = getStorylinesByWorldId(worldId);
      const storyline = storylines.find(s => s.id === storylineId);
      if (!storyline) {
        throw new Error('故事线不存在');
      }

      // 创建新会话
      const session: InteractionSession = {
        id: uuidv4(),
        worldId,
        storylineId,
        status: 'active',
        currentNode: storyline.startingNode,
        history: [],
        visitedNodes: new Set([storyline.startingNode.id]),
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
      };

      this.currentSession = session;

      // 将起始节点添加到缓存
      this.nodeCache.set(storyline.startingNode.id, {
        node: storyline.startingNode,
        visitedAt: Date.now(),
        sceneName: storyline.startingNode.content.sceneId
          ? this.getSceneName(worldId, storyline.startingNode.content.sceneId)
          : undefined,
      });

      // 异步添加到向量存储（不阻塞）
      vectorStore.addText(
        `node-${storyline.startingNode.id}`,
        storyline.startingNode.content.narrative,
        { type: 'node', nodeId: storyline.startingNode.id }
      ).catch(err => console.warn('[StoryEngine] Vectorize start node failed:', err));

      this.notify();
      console.log('[StoryEngine] Session started:', session.id);
      return session;
    } catch (error) {
      console.error('[StoryEngine] Start session error:', error);
      throw error;
    }
  }

  /**
   * 获取起始节点
   */
  getStartingNode(worldId: string, storylineId: string): StoryNode | null {
    const storylines = getStorylinesByWorldId(worldId);
    const storyline = storylines.find(s => s.id === storylineId);
    return storyline?.startingNode || null;
  }

  /**
   * 处理用户选择（重构版）
   * 使用统一的 continueStory 方法
   */
  async handleChoice(choiceId: string, autoContinue: boolean = true): Promise<StoryNode | null> {
    if (!this.currentSession || !this.currentSession.currentNode) {
      console.error('[StoryEngine] No active session');
      return null;
    }

    try {
      const currentNode = this.currentSession.currentNode;
      const selectedChoice = currentNode.choices.find(c => c.id === choiceId);

      if (!selectedChoice) {
        console.error('[StoryEngine] Choice not found:', choiceId);
        return null;
      }

      // 记录历史
      const historyItem: SessionHistory = {
        nodeId: currentNode.id,
        choiceId: selectedChoice.id,
        timestamp: Date.now(),
        narrative: currentNode.content.narrative,
        selectedChoice: selectedChoice.text,
      };
      this.currentSession.history.push(historyItem);

      if (autoContinue) {
        // 获取故事世界
        const world = getWorldById(this.currentSession.worldId);
        if (!world) {
          throw new Error('故事世界不存在');
        }

        console.log('[StoryEngine] Using unified continueStory method...');

        // 使用统一的 continueStory 方法（传入 worldId 以支持场景选择）
        const result = await storyGenerator.continueStory({
          currentNode,
          userContext: `用户选择了：${selectedChoice.text}\n${selectedChoice.consequences ? `（后果提示：${selectedChoice.consequences}）` : ''}`,
          worldContext: world.context,
          worldId: this.currentSession.worldId,
        });

        // 创建新节点
        const newNode: StoryNode = {
          id: uuidv4(),
          type: 'branch',
          content: {
            narrative: result.narrative,
            ssmlActions: [{ type: 'ka', action: 'Think' }],
            sceneId: result.sceneId, // 添加场景ID
          },
          choices: result.choices,
          parentChoiceId: choiceId,
        };

        // 将新节点添加到缓存
        this.nodeCache.set(newNode.id, {
          node: newNode,
          visitedAt: Date.now(),
          sceneName: result.sceneId
            ? this.getSceneName(this.currentSession.worldId, result.sceneId)
            : undefined,
        });

        // 更新会话状态
        this.currentSession.currentNode = newNode;
        this.currentSession.visitedNodes.add(newNode.id);
        this.currentSession.lastUpdateTime = Date.now();

        // 将新剧情添加到向量库的历史记录中
        await vectorStore.addStoryNode(newNode.id, result.narrative, true);

        this.notify();
        console.log('[StoryEngine] Generated new node:', newNode.id);
        return newNode;
      } else {
        // 不自动继续，返回null
        this.notify();
        return null;
      }
    } catch (error) {
      console.error('[StoryEngine] Handle choice error:', error);
      throw new Error('处理选择失败');
    }
  }

  /**
   * 跳转到指定节点（用于回溯）
   */
  async jumpToNode(nodeId: string): Promise<boolean> {
    if (!this.currentSession) {
      console.error('[StoryEngine] No active session');
      return false;
    }

    // 查找历史记录中的该节点
    const historyItem = this.currentSession.history.find(h => h.nodeId === nodeId);
    if (!historyItem) {
      console.error('[StoryEngine] Node not in history:', nodeId);
      return false;
    }

    // TODO: 需要从某个地方恢复节点的完整数据
    // 目前简化实现：只更新状态，不恢复节点数据
    console.log('[StoryEngine] Jump to node:', nodeId);
    return true;
  }

  /**
   * 保存会话到localStorage
   */
  saveSession(): void {
    if (!this.currentSession) return;

    try {
      const sessionData = {
        ...this.currentSession,
        visitedNodes: Array.from(this.currentSession.visitedNodes),
      };
      localStorage.setItem(`session-${this.currentSession.id}`, JSON.stringify(sessionData));
      console.log('[StoryEngine] Session saved:', this.currentSession.id);
    } catch (error) {
      console.error('[StoryEngine] Save session error:', error);
    }
  }

  /**
   * 从localStorage加载会话
   */
  loadSession(sessionId: string): InteractionSession | null {
    try {
      const data = localStorage.getItem(`session-${sessionId}`);
      if (!data) return null;

      const sessionData = JSON.parse(data);
      this.currentSession = {
        ...sessionData,
        visitedNodes: new Set(sessionData.visitedNodes),
      };

      this.notify();
      console.log('[StoryEngine] Session loaded:', sessionId);
      return this.currentSession;
    } catch (error) {
      console.error('[StoryEngine] Load session error:', error);
      return null;
    }
  }

  /**
   * 暂停会话
   */
  pauseSession(): void {
    if (!this.currentSession) return;
    this.currentSession.status = 'paused';
    this.saveSession();
    this.notify();
    console.log('[StoryEngine] Session paused');
  }

  /**
   * 恢复会话
   */
  resumeSession(): void {
    if (!this.currentSession) return;
    this.currentSession.status = 'active';
    this.notify();
    console.log('[StoryEngine] Session resumed');
  }

  /**
   * 结束会话
   */
  endSession(): void {
    if (!this.currentSession) return;

    // 清理localStorage中的会话数据
    try {
      localStorage.removeItem(`session-${this.currentSession.id}`);
      console.log('[StoryEngine] Session data cleared from localStorage:', this.currentSession.id);
    } catch (error) {
      console.error('[StoryEngine] Clear session error:', error);
    }

    this.currentSession.status = 'completed';
    this.notify();
    console.log('[StoryEngine] Session ended');
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): InteractionSession | null {
    return this.currentSession;
  }

  /**
   * 更新当前节点的分支选项
   * 用于AI对话调整分支选项时同步状态
   */
  updateCurrentNodeChoices(choices: StoryNode['choices']): void {
    if (this.currentSession && this.currentSession.currentNode) {
      this.currentSession.currentNode.choices = choices;
      console.log('[StoryEngine] Updated current node choices:', choices.length);
      this.notify();
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats() {
    if (!this.currentSession) return null;

    return {
      totalNodesVisited: this.currentSession.visitedNodes.size,
      totalChoicesMade: this.currentSession.history.length,
      sessionDuration: Date.now() - this.currentSession.startTime,
      uniquePaths: new Set(this.currentSession.history.map(h => h.choiceId)).size,
    };
  }

  /**
   * 重置当前会话
   */
  resetSession(): void {
    this.currentSession = null;
    this.notify();
    console.log('[StoryEngine] Session reset');
  }

  /**
   * 清理localStorage中所有旧的会话数据
   */
  clearAllOldSessions(): void {
    try {
      const keys = Object.keys(localStorage);
      const sessionKeys = keys.filter(key => key.startsWith('session-'));
      sessionKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      console.log(`[StoryEngine] Cleared ${sessionKeys.length} old sessions from localStorage`);
    } catch (error) {
      console.error('[StoryEngine] Clear old sessions error:', error);
    }
  }

  /**
   * 获取场景名称
   */
  private getSceneName(worldId: string, sceneId: string): string | undefined {
    const scene = getSceneById(worldId, sceneId);
    return scene?.name;
  }

  /**
   * 获取节点缓存（用于导出）
   */
  getNodeCache(): Map<string, NodeCacheEntry> {
    return new Map(this.nodeCache);
  }

  /**
   * 获取完整的故事路径（用于导出）
   */
  getStoryPath(): Array<{
    nodeId: string;
    sceneName?: string;
    narrative: string;
    selectedChoice: { text: string; consequences?: string } | null;
    timestamp: number;
  }> {
    const path: Array<{
      nodeId: string;
      sceneName?: string;
      narrative: string;
      selectedChoice: { text: string; consequences?: string } | null;
      timestamp: number;
    }> = [];

    if (!this.currentSession) {
      return path;
    }

    // 获取起始节点ID（从第一个历史记录或当前节点）
    let startNodeId: string | undefined;
    if (this.currentSession.history.length > 0) {
      startNodeId = this.currentSession.history[0].nodeId;
    } else if (this.currentSession.currentNode) {
      startNodeId = this.currentSession.currentNode.id;
    }

    // 添加起始节点
    if (startNodeId) {
      const cached = this.nodeCache.get(startNodeId);
      if (cached) {
        path.push({
          nodeId: cached.node.id,
          sceneName: cached.sceneName,
          narrative: cached.node.content.narrative,
          selectedChoice: null, // 起始节点没有选择
          timestamp: cached.visitedAt,
        });
      }
    }

    // 遍历历史记录，添加每个选择后的新节点
    // 注意：history[i] 记录的是在某个节点做出的选择，选择后的新节点需要通过 parentChoiceId 找到
    for (let i = 0; i < this.currentSession.history.length; i++) {
      const history = this.currentSession.history[i];

      // 找到这个选择导致的新节点
      // 新节点的特点是：parentChoiceId 等于当前选择的 choiceId
      const nextNode = Array.from(this.nodeCache.values()).find(entry => {
        return entry.node.parentChoiceId === history.choiceId;
      });

      if (nextNode) {
        path.push({
          nodeId: nextNode.node.id,
          sceneName: nextNode.sceneName,
          narrative: nextNode.node.content.narrative,
          selectedChoice: {
            text: history.selectedChoice,
          },
          timestamp: history.timestamp,
        });
      }
    }

    // 如果没有历史记录，添加当前节点作为起始节点
    if (this.currentSession.history.length === 0 && this.currentSession.currentNode && startNodeId !== this.currentSession.currentNode.id) {
      const cached = this.nodeCache.get(this.currentSession.currentNode.id);
      if (cached) {
        path.push({
          nodeId: cached.node.id,
          sceneName: cached.sceneName,
          narrative: cached.node.content.narrative,
          selectedChoice: null,
          timestamp: cached.visitedAt,
        });
      }
    }

    return path;
  }
}

export const storyEngine = new StoryEngineService();
