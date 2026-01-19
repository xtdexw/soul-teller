/**
 * 向量存储服务（增强版）
 * 基于IndexedDB实现本地向量检索
 * 支持自动判断重要转折点、历史剧情管理
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { embeddingService } from './ModelScopeEmbedding';
import type { VectorItem } from '../types/story';
import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';

interface StoryNodeMetadata {
  timestamp: number;
  isPlotTwist?: boolean;        // 是否是重要转折点
  plotTwistReason?: string;     // 转折点原因
  nodeId?: string;             // 关联的故事节点ID
  emotion?: string;            // 情绪标签
}

interface VectorStoreDB extends DBSchema {
  vectors: {
    key: string;
    value: VectorItem;
    indexes: {
      'by-timestamp': number;
    };
  };
}

/**
 * 向量存储服务类
 */
class VectorStoreService {
  private db: IDBPDatabase<VectorStoreDB> | null = null;
  private readonly DB_NAME = 'SoulTellerVectorStore';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'vectors';
  private storyHistory: Array<{ nodeId: string; narrative: string; timestamp: number }> = [];
  private readonly MAX_HISTORY = 10; // 保存最近10段完整剧情

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    if (this.db) return;

    const storeName = this.STORE_NAME;

    try {
      this.db = await openDB<VectorStoreDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('by-timestamp', 'metadata.timestamp');
          }
        },
      });
      console.log('[VectorStore] Database initialized');
    } catch (error) {
      console.error('[VectorStore] Init error:', error);
      throw new Error('向量存储初始化失败');
    }
  }

  /**
   * 添加向量项
   */
  async addItem(item: VectorItem): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.db!.put(this.STORE_NAME, item);
      console.log('[VectorStore] Item added:', item.id);
    } catch (error) {
      console.error('[VectorStore] Add item error:', error);
      throw new Error('添加向量项失败');
    }
  }

  /**
   * 批量添加向量项
   */
  async addItems(items: VectorItem[]): Promise<void> {
    await this.ensureInitialized();

    try {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);

      await Promise.all(items.map(item => store.put(item)));
      await tx.done;

      console.log('[VectorStore] Added', items.length, 'items');
    } catch (error) {
      console.error('[VectorStore] Add items error:', error);
      throw new Error('批量添加向量项失败');
    }
  }

  /**
   * 为文本生成向量并存储
   */
  async addText(
    id: string,
    text: string,
    metadata?: VectorItem['metadata']
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const embedding = await embeddingService.embedText(text);

      const item: VectorItem = {
        id,
        text,
        embedding,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
        },
      };

      await this.addItem(item);
    } catch (error) {
      // 向量化失败不影响主流程，静默处理
      console.log('[VectorStore] Text embedding skipped (non-critical)');
    }
  }

  /**
   * 语义检索
   * @param query 查询文本
   * @param topK 返回前K个最相关的结果
   * @param threshold 相似度阈值（0-1），低于此值的结果将被过滤
   * @returns 检索结果数组，包含向量项和相似度分数
   */
  async search(
    query: string,
    topK: number = 5,
    threshold: number = 0.5
  ): Promise<Array<{ item: VectorItem; score: number }>> {
    await this.ensureInitialized();

    try {
      // 生成查询向量
      const queryEmbedding = await embeddingService.embedText(query);

      // 获取所有向量项
      const allItems = await this.db!.getAll(this.STORE_NAME);

      // 计算相似度并排序
      const results = allItems
        .map(item => ({
          item,
          score: this.cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      console.log('[VectorStore] Search found', results.length, 'results');
      return results;
    } catch (error) {
      console.error('[VectorStore] Search error:', error);
      throw new Error('向量检索失败');
    }
  }

  /**
   * 获取相关的上下文（用于AI生成）
   * @param query 查询文本
   * @param maxContexts 最大上下文数量
   * @returns 上下文文本数组
   */
  async getRelevantContext(
    query: string,
    maxContexts: number = 3
  ): Promise<string[]> {
    const results = await this.search(query, maxContexts, 0.4);
    return results.map(r => r.item.text);
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * 根据ID获取向量项
   */
  async getById(id: string): Promise<VectorItem | undefined> {
    await this.ensureInitialized();
    return this.db!.get(this.STORE_NAME, id);
  }

  /**
   * 删除向量项
   */
  async deleteById(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.db!.delete(this.STORE_NAME, id);
    console.log('[VectorStore] Item deleted:', id);
  }

  /**
   * 清空所有向量
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    await this.db!.clear(this.STORE_NAME);
    console.log('[VectorStore] All items cleared');
  }

  /**
   * 获取存储的向量项数量
   */
  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.db!.count(this.STORE_NAME);
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[VectorStore] Database closed');
    }
  }

  // ========== 新增：故事历史管理 ==========

  /**
   * 添加故事节点到历史记录
   * @param nodeId 节点ID
   * @param narrative 剧情内容
   * @param isPlotTwist 是否是转折点（可选，不提供则AI自动判断）
   */
  async addStoryNode(
    nodeId: string,
    narrative: string,
    isPlotTwist?: boolean
  ): Promise<void> {
    // 添加到内存历史
    this.storyHistory.push({
      nodeId,
      narrative,
      timestamp: Date.now(),
    });

    // 保持历史长度
    if (this.storyHistory.length > this.MAX_HISTORY) {
      this.storyHistory.shift();
    }

    // 判断是否是重要转折点
    let shouldStore = isPlotTwist;
    let twistReason: string | undefined;

    if (isPlotTwist === undefined) {
      // AI自动判断
      const analysis = await this.analyzePlotTwist(narrative);
      shouldStore = analysis.isTwist;
      twistReason = analysis.reason;
    }

    // 如果是转折点，存储到向量库
    if (shouldStore) {
      await this.addText(nodeId, narrative, {
        isPlotTwist: true,
        plotTwistReason: twistReason || 'AI标记为转折点',
        nodeId,
      });
      console.log('[VectorStore] Plot twist stored:', nodeId);
    }
  }

  /**
   * AI判断是否是重要转折点
   */
  private async analyzePlotTwist(narrative: string): Promise<{ isTwist: boolean; reason: string }> {
    try {
      const client = new OpenAI({
        baseURL: window.location.origin + '/api/modelscope/v1',
        apiKey: secureStorage.getModelScopeApiKey(),
        dangerouslyAllowBrowser: true,
      });

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          {
            role: 'system',
            content: `你是一个故事分析师。判断以下剧情是否是重要转折点。

判断标准：
- 出现重要冲突或危机
- 情节发生重大变化
- 新角色或重要信息揭示
- 情绪明显转变
- 故事方向改变

返回格式（纯JSON，不要其他文字）：
{
  "isTwist": true/false,
  "reason": "原因简述"
}`,
          },
          {
            role: 'user',
            content: `判断以下剧情是否是重要转折点：\n\n${narrative}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{"isTwist": false, "reason": ""}';
      const result = JSON.parse(content);

      console.log('[VectorStore] Plot twist analysis:', result);
      return result;
    } catch (error) {
      console.error('[VectorStore] Plot twist analysis error:', error);
      // 出错时保守处理：不是转折点
      return { isTwist: false, reason: '' };
    }
  }

  /**
   * 获取最近N段剧情
   */
  getRecentNarrative(count: number = 3): string[] {
    return this.storyHistory
      .slice(-count)
      .map(h => h.narrative);
  }

  /**
   * 获取完整上下文（最近剧情 + 向量检索的相关历史）
   */
  async getContextForGeneration(
    currentNarrative: string,
    recentCount: number = 3,
    vectorCount: number = 2
  ): Promise<{
    recent: string[];
    relevant: string[];
    summary: string;
  }> {
    // 获取最近剧情
    const recent = this.getRecentNarrative(recentCount);

    // 向量检索相关历史
    const relevant = await this.getRelevantContext(currentNarrative, vectorCount);

    // 生成摘要
    const summary = this.generateContextSummary(recent, relevant);

    return {
      recent,
      relevant,
      summary,
    };
  }

  /**
   * 生成上下文摘要
   */
  private generateContextSummary(recent: string[], relevant: string[]): string {
    const parts: string[] = [];

    if (recent.length > 0) {
      parts.push('## 最近剧情\n' + recent.join('\n\n'));
    }

    if (relevant.length > 0) {
      parts.push('## 相关历史情节\n' + relevant.join('\n\n'));
    }

    return parts.join('\n\n');
  }

  /**
   * 清空故事历史（内存）
   */
  clearStoryHistory(): void {
    this.storyHistory = [];
    console.log('[VectorStore] Story history cleared');
  }

  /**
   * 获取当前历史长度
   */
  getHistoryLength(): number {
    return this.storyHistory.length;
  }
}

export const vectorStore = new VectorStoreService();
