import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';

/**
 * 通义千问Embedding向量化服务
 * 用于文本向量化和语义检索
 */
class EmbeddingService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      // 使用本地开发服务器的URL，通过Vite代理转发到ModelScope
      const baseURL = window.location.origin + '/api/modelscope/v1';
      this.client = new OpenAI({
        baseURL,
        apiKey: secureStorage.getModelScopeApiKey(),
        dangerouslyAllowBrowser: true,
      });
    }
    return this.client;
  }

  /**
   * 生成文本向量
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const client = this.getClient();
      const response = await client.embeddings.create({
        model: 'Qwen/Qwen3-Embedding-8B',
        input: text,
        encoding_format: 'float',
      });

      // 打印完整响应用于调试
      console.log('[Embedding] API Response:', {
        hasData: !!response.data,
        dataLength: response.data?.length || 0,
        firstItem: response.data?.[0] ? {
          hasEmbedding: !!response.data[0].embedding,
          embeddingLength: response.data[0].embedding?.length || 0,
        } : null,
      });

      // 检查响应数据是否存在
      if (!response.data || response.data.length === 0) {
        console.warn('[Embedding] Empty response data from API, using zero vector');
        return new Array(1024).fill(0);
      }

      return response.data[0].embedding;
    } catch (error: any) {
      // 打印详细错误信息
      console.error('[Embedding] API Error Details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
        type: error.type,
      });

      // 降级方案：返回零向量，不影响主流程
      console.log('[Embedding] Embedding unavailable, using zero vector (non-critical)');
      return new Array(1024).fill(0);
    }
  }

  /**
   * 批量向量化
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const client = this.getClient();
      const response = await client.embeddings.create({
        model: 'Qwen/Qwen3-Embedding-8B',
        input: texts,
        encoding_format: 'float',
      });

      // 检查响应数据是否存在
      if (!response.data || response.data.length === 0) {
        console.warn('[Embedding] Empty batch response data from API, using zero vectors');
        return texts.map(() => new Array(1024).fill(0));
      }

      return response.data.map((d) => d.embedding);
    } catch (error: any) {
      // 降级方案：返回零向量数组，不影响主流程
      console.log('[Embedding] Batch embedding unavailable, using zero vectors (non-critical)');
      return texts.map(() => new Array(1024).fill(0));
    }
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}

export const embeddingService = new EmbeddingService();
