import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';

/**
 * 书籍简介AI生成服务
 * 使用通义千问生成书籍简介
 */
class BookSummaryAIService {
  /**
   * 使用AI生成书籍简介
   * @param title 书籍标题
   * @param author 作者
   * @param chapters 章节内容（用于分析）
   * @param onProgress 进度回调（可选，用于流式输出）
   */
  async generateSummary(
    title: string,
    author: string,
    chapters: Array<{ title: string; content: string }>,
    onProgress?: (chunk: string) => void
  ): Promise<string> {
    const client = new OpenAI({
      baseURL: 'http://localhost:3002/api/modelscope/v1',
      apiKey: secureStorage.getModelScopeApiKey(),
      dangerouslyAllowBrowser: true,
    });

    // 准备上下文：取前3章的内容片段（每章取前500字）
    const contextParts = chapters.slice(0, 3).map(chapter => {
      const preview = chapter.content.substring(0, 500);
      return `《${chapter.title}》：${preview}...`;
    }).join('\n\n');

    const systemPrompt = `你是一位专业的书籍编辑和推荐专家。你的任务是为书籍撰写吸引人的简介。

请遵循以下要求：
1. 简介长度：200-400字
2. 内容包括：
   - 书籍的核心主题和观点
   - 主要内容和特色
   - 适合的读者群体
   - 阅读本书的价值和意义
3. 语言风格：生动、有吸引力、富有感染力
4. 避免剧透关键情节

输出格式：直接输出简介文本，不要有任何前缀或后缀。`;

    const userPrompt = `请为以下书籍撰写一个吸引人的简介：

书名：《${title}》
作者：${author}

书籍内容片段：
${contextParts}

请根据以上信息，撰写一个200-400字的书籍简介。`;

    try {
      // 如果有进度回调，使用流式输出
      if (onProgress) {
        const stream = await client.chat.completions.create({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onProgress(content);
          }
        }
        return fullContent;
      } else {
        // 非流式输出
        const response = await client.chat.completions.create({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        return response.choices[0]?.message?.content || '暂无简介';
      }
    } catch (error) {
      console.error('[BookSummaryAI] Generate summary error:', error);
      throw new Error(`AI生成简介失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用AI生成书籍封面描述（用于后续图片生成）
   */
  async generateCoverDescription(
    title: string,
    author: string,
    chapters: Array<{ title: string; content: string }>
  ): Promise<string> {
    const client = new OpenAI({
      baseURL: 'http://localhost:3002/api/modelscope/v1',
      apiKey: secureStorage.getModelScopeApiKey(),
      dangerouslyAllowBrowser: true,
    });

    const contextParts = chapters.slice(0, 2).map(chapter => {
      const preview = chapter.content.substring(0, 300);
      return `《${chapter.title}》：${preview}...`;
    }).join('\n\n');

    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen2.5-72B-Instruct',
      messages: [
        {
          role: 'system',
          content: `你是一位专业的书籍封面设计师。请根据书籍信息生成封面视觉描述。

要求：
1. 描述简洁明了，100-200字
2. 包含：色调、风格、主要视觉元素、氛围
3. 适合作为AI绘画工具的输入提示词`
        },
        {
          role: 'user',
          content: `请为以下书籍设计封面描述：

书名：《${title}》
作者：${author}

书籍内容：
${contextParts}

请生成一个适合AI绘画的封面视觉描述。`
        }
      ],
    });

    return response.choices[0]?.message?.content || '暂无描述';
  }
}

export const bookSummaryAI = new BookSummaryAIService();
