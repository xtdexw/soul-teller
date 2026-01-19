import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';

/**
 * 通义千问VL视觉服务
 * 用于图片理解和内容提取
 */
class VLService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      // 使用本地开发服务器的URL，通过Vite代理转发到ModelScope
      const baseURL = window.location.origin + '/api/modelscope/v1';
      this.client = new OpenAI({
        baseURL,
        apiKey: secureStorage.getModelScopeApiKey(),
      });
    }
    return this.client;
  }

  /**
   * 提取书籍封面信息
   */
  async extractCover(imageUrl: string): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请描述这张图片的内容，包括标题、作者、画风等信息',
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        }],
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('VL service error:', error);
      throw error;
    }
  }

  /**
   * 理解插图内容
   */
  async understandIllustration(imageUrl: string, context: string): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `基于以下故事背景，描述这张插图的内容和意境：\n${context}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        }],
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('VL service error:', error);
      throw error;
    }
  }
}

export const vlService = new VLService();
