/**
 * 智能对话服务
 * 整合角色记忆、情绪感知和LLM，实现有性格的数字人对话
 */

import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';
import { memoryManager } from './MemoryManager';
import { emotionAnalysisService } from './EmotionAnalysis';
import type { EmotionAnalysis, ResponseStrategy } from '../types/memory';
import type { SSMLAction } from '../services/XingyunSDK';
import { SSMLActionType } from '../services/XingyunSDK';

interface DialogueResponse {
  content: string;
  action?: SSMLAction;
  strategy: ResponseStrategy;
  shouldChangeState?: boolean;
  newState?: 'listen' | 'think' | 'idle' | 'interactive_idle';
}

class IntelligentDialogueService {
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
   * 生成回应（完整流程）
   */
  async generateResponse(
    userInput: string,
    context?: {
      currentNodeContent?: string;
      currentChoices?: string[];
    }
  ): Promise<DialogueResponse> {
    console.log('[IntelligentDialogue] Generating response for:', userInput);

    try {
      // 1. 分析用户情绪
      const emotion = await emotionAnalysisService.analyzeEmotion(userInput);
      console.log('[IntelligentDialogue] User emotion:', emotion);

      // 2. 更新记忆
      memoryManager.recordMessage('user', userInput, emotion.primary);
      memoryManager.updateFromEmotion(emotion);

      // 3. 生成回应策略
      const strategy = memoryManager.generateResponseStrategy(emotion);
      console.log('[IntelligentDialogue] Response strategy:', strategy);

      // 4. 调用LLM生成回应内容
      const content = await this.generateLLMResponse(userInput, emotion, strategy, context);

      // 5. 构建SSML动作
      let action: SSMLAction | undefined;
      if (strategy.ssmlAction) {
        action = {
          type: SSMLActionType.KA,
          data: {
            action_semantic: strategy.ssmlAction,
          },
        };
      } else {
        // 根据情绪自动选择动作
        const actionName = emotionAnalysisService.selectActionForEmotion(emotion);
        if (actionName) {
          action = {
            type: SSMLActionType.KA,
            data: {
              action_semantic: actionName,
            },
          };
        }
      }

      // 6. 决定是否需要状态切换
      let shouldChangeState = false;
      let newState: 'listen' | 'think' | 'idle' | 'interactive_idle' | undefined;

      if (strategy.action === 'listen_more') {
        shouldChangeState = true;
        newState = 'listen';
      } else if (strategy.action === 'think_first') {
        shouldChangeState = true;
        newState = 'think';
      }

      // 7. 记录助手回应
      memoryManager.recordMessage('assistant', content);

      return {
        content,
        action,
        strategy,
        shouldChangeState,
        newState,
      };
    } catch (error) {
      console.error('[IntelligentDialogue] Generate response error:', error);

      // 返回默认回应
      return {
        content: '我明白了。让我们继续故事吧。',
        strategy: {
          action: 'speak',
          responseStyle: 'conversational',
        },
      };
    }
  }

  /**
   * 调用LLM生成回应
   */
  private async generateLLMResponse(
    userInput: string,
    emotion: EmotionAnalysis,
    strategy: ResponseStrategy,
    context?: {
      currentNodeContent?: string;
      currentChoices?: string[];
    }
  ): Promise<string> {
    const memory = memoryManager.getMemory();
    if (!memory) {
      return '我明白了。';
    }

    const client = this.getClient();

    // 构建提示词
    const systemPrompt = this.buildSystemPrompt(strategy, context);
    const memoryPrompt = memoryManager.generateMemoryPrompt();

    const userPrompt = `用户说：${userInput}

用户情绪：${emotion.primary} (${emotion.sentiment})
情绪置信度：${emotion.confidence}

请以${memory.characterName}的身份，用${strategy.responseStyle}的风格，${strategy.action === 'comfort' ? '安慰' : strategy.action === 'celebrate' ? '庆祝并认同' : '回应'}用户。`;

    const response = await client.chat.completions.create({
      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\n\n' + memoryPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    return response.choices[0].message.content || '我明白了。';
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(
    strategy: ResponseStrategy,
    context?: {
      currentNodeContent?: string;
      currentChoices?: string[];
    }
  ): string {
    const basePrompt = `你是一个富有表现力的故事讲述者，通过3D数字人与用户互动。

## 对话风格指南

**narrative（讲述）**: 以第三人称讲述故事，生动描述场景和情节
**conversational（对话）**: 以第一人称与用户直接对话，亲切自然
**dramatic（戏剧）**: 使用夸张的语气和表情，增强戏剧效果
**mysterious（神秘）**: 使用暗示和悬念，营造神秘氛围

## 回应策略

**celebrate（庆祝）**: 对用户的积极选择表示赞赏和庆祝
**comfort（安慰）**: 对用户的消极情绪表示理解和安慰
**think_first（先思考）**: 表现思考状态，然后给出回应
**listen_more（多倾听）**: 鼓励用户继续表达

## 当前风格
${strategy.responseStyle}

## 当前策略
${strategy.action}`;

    // 添加剧情上下文
    if (context?.currentNodeContent) {
      let contextPrompt = `${basePrompt}

## 当前故事场景
${context.currentNodeContent}`;

      // 添加分支选项
      if (context.currentChoices && context.currentChoices.length > 0) {
        contextPrompt += `

## 当前可用的行动选项
${context.currentChoices.map((choice, index) => `${index + 1}. ${choice}`).join('\n')}`;
      }

      contextPrompt += `

## 重要提示
- 你的回应应该基于当前故事场景
- 参考当前可用的行动选项，但不要替用户做决定
- 可以分析不同选择的可能后果
- 保持与故事情节的一致性`;

      return contextPrompt;
    }

    return basePrompt;
  }

  /**
   * 快速回应（不使用LLM，用于简单场景）
   */
  quickResponse(userInput: string): DialogueResponse {
    const emotion = emotionAnalysisService.quickDetect(userInput);

    // 简单回应映射
    const responses: Record<string, string> = {
      '快乐': '太好了！看来你做出了一个很棒的选择！',
      '悲伤': '别担心，故事中的困难总会过去的。我们一起面对。',
      '惊讶': '哦？这确实是一个意想不到的转折！',
      '平静': '我明白了。让我们继续这个故事的旅程吧。',
    };

    const content = responses[emotion.primary] || responses['平静'];

    return {
      content,
      strategy: {
        action: 'speak',
        responseStyle: 'conversational',
      },
    };
  }

  /**
   * 流式生成回应（用于实时输出）
   */
  async *generateResponseStream(
    userInput: string,
    context?: {
      currentNodeContent?: string;
      currentChoices?: string[];
    }
  ): AsyncGenerator<string, void, unknown> {
    const emotion = await emotionAnalysisService.analyzeEmotion(userInput);
    const strategy = memoryManager.generateResponseStrategy(emotion);
    const memory = memoryManager.getMemory();

    if (!memory) {
      yield '我明白了。';
      return;
    }

    const client = this.getClient();
    const systemPrompt = this.buildSystemPrompt(strategy, context);
    const memoryPrompt = memoryManager.generateMemoryPrompt();

    const userPrompt = `用户说：${userInput}

用户情绪：${emotion.primary} (${emotion.sentiment})

请以${memory.characterName}的身份，用${strategy.responseStyle}的风格回应。保持回应简洁（50字以内）。`;

    const stream = await client.chat.completions.create({
      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\n\n' + memoryPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 150,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        yield content;
      }
    }

    // 记录完整回应
    memoryManager.recordMessage('assistant', fullContent);
  }
}

export const intelligentDialogueService = new IntelligentDialogueService();
