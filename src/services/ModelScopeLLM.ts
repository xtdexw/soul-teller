import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';

export interface DialogueContext {
  role: string;
  content: string;
}

/**
 * 通义千问LLM对话服务
 * 用于文本生成、对话和剧情创作
 */
class LLMService {
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
   * 非流式对话
   */
  async chat(messages: DialogueContext[]): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('LLM service error:', error);
      throw error;
    }
  }

  /**
   * 流式对话
   */
  async *chatStream(
    messages: DialogueContext[],
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string, void, unknown> {
    try {
      const client = this.getClient();
      const stream = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk?.(content);
          yield content;
        }
      }
    } catch (error) {
      console.error('LLM stream error:', error);
      throw error;
    }
  }

  /**
   * 生成剧情分支选项
   */
  async generateBranches(
    currentStory: string,
    userDirection: string
  ): Promise<string[]> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: [
          {
            role: 'user',
            content: `基于以下故事内容，生成3个不同的剧情续写方向：

故事内容：${currentStory}
用户期望：${userDirection}

请以JSON数组格式返回3个简短的剧情分支描述（每个不超过50字）`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return result.branches || [];
    } catch (error) {
      console.error('Generate branches error:', error);
      throw error;
    }
  }

  /**
   * 角色扮演对话
   */
  async rolePlayDialogue(
    characterProfile: string,
    userMessage: string,
    conversationHistory: DialogueContext[]
  ): Promise<string> {
    try {
      const client = this.getClient();
      const systemPrompt = `你是故事中的角色，你的人设如下：

${characterProfile}

请以第一人称，用符合角色性格的语言和用户对话。`;

      const messages: DialogueContext[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5),
        { role: 'user', content: userMessage },
      ];

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Role play dialogue error:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();
