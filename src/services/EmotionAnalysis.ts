/**
 * 情绪感知分析服务
 * 用于分析用户输入的情绪和情感倾向
 */

import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';
import type { EmotionAnalysis } from '../types/memory';

class EmotionAnalysisService {
  private client: OpenAI | null = null;

  /**
   * 获取 OpenAI 客户端
   */
  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        baseURL: 'https://api-inference.modelscope.cn/v1',
        apiKey: secureStorage.getModelScopeApiKey(),
      });
    }
    return this.client;
  }

  /**
   * 分析用户输入的情绪
   */
  async analyzeEmotion(userInput: string): Promise<EmotionAnalysis> {
    console.log('[EmotionAnalysis] Analyzing emotion for:', userInput);

    try {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        messages: [
          {
            role: 'system',
            content: `你是一个情绪分析专家。请分析用户输入的情绪和情感倾向。

请以JSON格式返回分析结果：
{
  "primary": "主要情绪（如：快乐、悲伤、愤怒、惊讶、恐惧、厌恶、期待、信任、平静等）",
  "confidence": 0.0-1.0之间的置信度,
  "sentiment": "positive（积极）或negative（消极）或neutral（中性）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

例如：
输入："太棒了！我终于成功了！"
输出：{"primary":"快乐","confidence":0.95,"sentiment":"positive","keywords":["太棒了","成功"]}

输入："为什么总是这样...我真的好难过。"
输出：{"primary":"悲伤","confidence":0.9,"sentiment":"negative","keywords":["难过","总是"]}`,
          },
          {
            role: 'user',
            content: `请分析以下用户输入的情绪：\n${userInput}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      const analysis: EmotionAnalysis = {
        primary: result.primary || '平静',
        confidence: result.confidence || 0.5,
        sentiment: result.sentiment || 'neutral',
        keywords: result.keywords || [],
      };

      console.log('[EmotionAnalysis] Analysis result:', analysis);
      return analysis;
    } catch (error) {
      console.error('[EmotionAnalysis] Analysis error:', error);

      // 返回默认分析结果
      return {
        primary: '平静',
        confidence: 0.5,
        sentiment: 'neutral',
        keywords: [],
      };
    }
  }

  /**
   * 快速情绪检测（基于关键词）
   * 用于实时响应，不调用LLM
   */
  quickDetect(userInput: string): EmotionAnalysis {
    const text = userInput.toLowerCase();

    // 积极关键词
    const positiveKeywords = [
      '开心', '快乐', '太棒了', '成功', '喜欢', '爱', '棒', '好',
      'yes', 'yeah', 'great', 'love', 'happy', 'excited', 'amazing',
      '哈哈', '呵呵', '不错', '感谢', '谢谢', '期待', '希望'
    ];

    // 消极关键词
    const negativeKeywords = [
      '难过', '悲伤', '痛苦', '讨厌', '恨', '不好', '差', '失望',
      'no', 'hate', 'sad', 'bad', 'terrible', 'awful', 'sorry',
      '担心', '害怕', '恐惧', '愤怒', '生气', '烦', '累'
    ];

    // 惊讶关键词
    const surpriseKeywords = [
      '哇', '天哪', '真的吗', '不敢相信', '居然', '竟然',
      'wow', 'really', 'unbelievable', 'shocking'
    ];

    // 检测积极情绪
    const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length;
    if (positiveCount >= 2) {
      return {
        primary: '快乐',
        confidence: 0.7,
        sentiment: 'positive',
        keywords: positiveKeywords.filter(kw => text.includes(kw)).slice(0, 3),
      };
    }

    // 检测消极情绪
    const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length;
    if (negativeCount >= 2) {
      return {
        primary: '悲伤',
        confidence: 0.7,
        sentiment: 'negative',
        keywords: negativeKeywords.filter(kw => text.includes(kw)).slice(0, 3),
      };
    }

    // 检测惊讶情绪
    const surpriseCount = surpriseKeywords.filter(kw => text.includes(kw)).length;
    if (surpriseCount >= 1) {
      return {
        primary: '惊讶',
        confidence: 0.6,
        sentiment: 'neutral',
        keywords: surpriseKeywords.filter(kw => text.includes(kw)).slice(0, 3),
      };
    }

    // 默认返回中性
    return {
      primary: '平静',
      confidence: 0.5,
      sentiment: 'neutral',
      keywords: [],
    };
  }

  /**
   * 情绪驱动的KA动作选择
   */
  selectActionForEmotion(emotion: EmotionAnalysis): string | null {
    const actionMap: Record<string, string> = {
      '快乐': 'Celebrate',
      '兴奋': 'Celebrate',
      '惊讶': 'Surprise',
      '悲伤': 'Comfort',
      '痛苦': 'Comfort',
      '恐惧': 'Reassure',
      '愤怒': 'Calm',
      '期待': 'Nod',
    };

    return actionMap[emotion.primary] || null;
  }
}

export const emotionAnalysisService = new EmotionAnalysisService();
