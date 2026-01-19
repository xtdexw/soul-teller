/**
 * 故事生成服务（重构版）
 * 续一的故事续写服务，一个API调用同时获得：续写内容 + 分支选项
 */

import OpenAI from 'openai';
import { secureStorage } from '../utils/secureStorage';
import { vectorStore } from './VectorStore';
import type { StoryChoice, WorldContext, GeneratedChoice, StoryNode } from '../types/story';

interface ContinueStoryRequest {
  currentNode: StoryNode;
  userContext?: string;          // 用户的对话/想法（可选）
  worldContext?: WorldContext;   // 世界观（可选，用于第一次生成）
}

interface ContinueStoryResponse {
  narrative: string;              // 续写内容（200-400字）
  choices: StoryChoice[];         // 3个分支选项
}

/**
 * 故事生成服务类
 */
class StoryGeneratorService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
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
   * ========== 核心方法：统一的故事续写 ==========
   * 一个API调用同时获得：续写内容 + 3个分支选项
   */
  async continueStory(request: ContinueStoryRequest): Promise<ContinueStoryResponse> {
    const { currentNode, userContext, worldContext } = request;

    console.log('[StoryGenerator] Continuing story with context:', {
      nodeId: currentNode.id,
      hasUserContext: !!userContext,
      hasWorldContext: !!worldContext,
    });

    try {
      // 1. 获取上下文（最近剧情 + 向量检索的相关历史）
      const context = await vectorStore.getContextForGeneration(
        currentNode.content.narrative,
        3,  // 最近3段
        2   // 向量检索2个相关节点
      );

      console.log('[StoryGenerator] Context retrieved:', {
        recent: context.recent.length,
        relevant: context.relevant.length,
      });

      // 2. 构建完整的提示词
      const systemPrompt = this.buildSystemPrompt(worldContext);
      const userPrompt = this.buildUserPrompt(currentNode, userContext, context);

      // 3. 调用千问大模型
      const client = this.getClient();

      console.log('[StoryGenerator] Sending request to LLM...');

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      });

      // 4. 解析响应
      const content = response.choices[0]?.message?.content || '{}';
      console.log('[StoryGenerator] LLM response length:', content.length);

      const result = JSON.parse(content);

      // 5. 构建返回结果
      const narrative = result.narrative || this.getFallbackNarrative(userContext);
      const choices = this.parseChoices(result.choices);

      console.log('[StoryGenerator] Story continued:', {
        narrativeLength: narrative.length,
        choicesCount: choices.length,
      });

      // 6. 将新剧情添加到向量库
      await vectorStore.addStoryNode(
        `node-${Date.now()}`,
        narrative,
        undefined  // AI自动判断是否是转折点
      );

      return { narrative, choices };
    } catch (error) {
      console.error('[StoryGenerator] Continue story error:', error);
      console.warn('[StoryGenerator] Using fallback response');

      // 降级方案：返回预设的续写和选项
      return this.getFallbackResponse(userContext);
    }
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(worldContext?: WorldContext): string {
    const basePrompt = `你是一个专业的故事讲述者。你的任务是根据当前情况续写故事，并提供分支选项。

## 创作要求

### 续写内容
- 长度：200-400字
- 保持叙事风格一致，符合故事世界设定
- 语言生动、有感染力，适合数字人朗读
- 包含环境描写、角色反应和情节发展
- 不要直接写"你选择了..."，而是描述选择后的结果和新的情况

### 分支选项
- 生成3个不同的分支选项
- 每个选项都应有潜在后果的提示
- 选项应该具有不同的风格（冒险、谨慎、观察、互动等）

## 输出格式

严格按照以下JSON格式返回，不要有任何其他文字：
{
  "narrative": "续写内容（200-400字）",
  "choices": [
    {"text": "选项1", "consequences": "后果提示1"},
    {"text": "选项2", "consequences": "后果提示2"},
    {"text": "选项3", "consequences": "后果提示3"}
  ]
}`;

    if (worldContext) {
      return `${basePrompt}

## 故事世界观

世界观：${worldContext.worldview}

主要角色：
${worldContext.characters.map(c => `- ${c.name}：${c.personality}`).join('\n')}

核心冲突：${worldContext.coreConflict}

氛围基调：${worldContext.atmosphere}`;
    }

    return basePrompt;
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(
    currentNode: StoryNode,
    userContext: string | undefined,
    context: { recent: string[]; relevant: string[]; summary: string }
  ): string {
    let prompt = '';

    // 添加上下文摘要
    if (context.summary) {
      prompt += `## 故事上下文\n\n${context.summary}\n\n`;
    }

    // 添加当前剧情
    prompt += `## 当前剧情\n\n${currentNode.content.narrative}\n\n`;

    // 添加当前分支选项
    if (currentNode.choices && currentNode.choices.length > 0) {
      prompt += `## 当前可用的行动选项\n\n`;
      currentNode.choices.forEach((choice, index) => {
        prompt += `${index + 1}. ${choice.text}\n`;
        if (choice.consequences) {
          prompt += `   （后果：${choice.consequences}）\n`;
        }
      });
      prompt += '\n';
    }

    // 添加用户想法/对话
    if (userContext) {
      prompt += `## 用户想法/对话\n\n${userContext}\n\n`;
      prompt += `请根据用户的想法调整续写内容和分支选项，使其符合用户的意图。\n\n`;
    }

    // 添加任务指令
    prompt += `## 任务\n\n请续写故事并提供3个分支选项。`;

    return prompt;
  }

  /**
   * 解析分支选项
   */
  private parseChoices(choicesData: any): StoryChoice[] {
    if (!Array.isArray(choicesData)) {
      console.warn('[StoryGenerator] Choices is not an array:', choicesData);
      return this.getFallbackChoices();
    }

    return choicesData.slice(0, 3).map((choice: any, index: number) => ({
      id: `choice-${Date.now()}-${index}`,
      text: choice.text || `选项 ${index + 1}`,
      consequences: choice.consequences || '',
      isAIGenerated: true,
    }));
  }

  /**
   * 获取降级方案的续写内容
   */
  private getFallbackNarrative(userContext?: string): string {
    if (userContext) {
      return `你${userContext}。随着你的行动，周围的环境似乎有了细微的变化。空气中弥漫着一种不确定的气息，仿佛有什么重要的事情即将发生。你注意到远处有什么东西在移动，但还无法看清是什么。故事还在继续，接下来你会做出怎样的选择呢？`;
    }
    return `随着你的探索，周围的环境逐渐清晰起来。空气中弥漫着神秘的气息，仿佛隐藏着无数未知的秘密。你感觉到前方有什么东西在等待着被发现，而每一个选择都可能带来意想不到的后果。故事还在继续，勇气和智慧将是你最重要的伙伴。`;
  }

  /**
   * 获取降级方案的响应
   */
  private getFallbackResponse(userContext?: string): ContinueStoryResponse {
    return {
      narrative: this.getFallbackNarrative(userContext),
      choices: this.getFallbackChoices(),
    };
  }

  /**
   * 获取降级方案的分支选项
   */
  private getFallbackChoices(): StoryChoice[] {
    return [
      {
        id: `choice-fallback-${Date.now()}-0`,
        text: '继续探索当前场景',
        consequences: '可能会有新的发现',
        isAIGenerated: false,
      },
      {
        id: `choice-fallback-${Date.now()}-1`,
        text: '仔细观察周围环境',
        consequences: '可能发现隐藏的线索',
        isAIGenerated: false,
      },
      {
        id: `choice-fallback-${Date.now()}-2`,
        text: '与附近的角色交流',
        consequences: '可能获得重要信息',
        isAIGenerated: false,
      },
    ];
  }

  /**
   * 生成分支选项
   * @param request 分支生成请求
   * @returns 生成的选项数组
   */
  async generateChoices(request: BranchGenerationRequest): Promise<StoryChoice[]> {
    const { currentNode, userContext, numChoices = 3 } = request;

    try {
      // 获取相关上下文
      const relevantContext = await vectorStore.getRelevantContext(
        currentNode.content.narrative,
        2
      );

      const contextStr = relevantContext.length > 0
        ? `\n\n相关背景信息：\n${relevantContext.join('\n')}`
        : '';

      const client = this.getClient();

      const systemPrompt = `你是一位专业的故事创作者。你的任务是根据当前剧情，为用户生成有趣、多样化的分支选项。

请遵循以下要求：
1. 生成 ${numChoices} 个不同的选项
2. 每个选项应该是明确的行动或决策
3. 选项应该具有不同的风格（冒险、谨慎、观察、互动等）
4. 每个选项都应有潜在后果的提示
5. 输出格式必须是JSON数组`;

      const userPrompt = `当前剧情：
${currentNode.content.narrative}${contextStr}

${userContext ? `用户期望：${userContext}\n` : ''}

请生成 ${numChoices} 个分支选项，以JSON数组格式返回：
[
  {
    "text": "选项文本",
    "consequences": "后果提示"
  }
]`;

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '[]';
      const generated = JSON.parse(content) as { choices?: GeneratedChoice[] };

      const choices: GeneratedChoice[] = generated.choices || [];

      // 转换为StoryChoice格式
      return choices.map((choice, index) => ({
        id: `choice-${Date.now()}-${index}`,
        text: choice.text,
        consequences: choice.consequences,
        isAIGenerated: true,
      }));
    } catch (error) {
      console.error('[StoryGenerator] Generate choices error:', error);
      console.warn('[StoryGenerator] Using fallback choices');

      // 降级方案：返回预设的通用选项
      const fallbackChoices: StoryChoice[] = [
        {
          id: `choice-fallback-${Date.now()}-0`,
          text: '继续探索当前场景',
          consequences: '可能会有新的发现',
          isAIGenerated: false,
        },
        {
          id: `choice-fallback-${Date.now()}-1`,
          text: '仔细观察周围环境',
          consequences: '可能发现隐藏的线索',
          isAIGenerated: false,
        },
        {
          id: `choice-fallback-${Date.now()}-2`,
          text: '与附近的角色交流',
          consequences: '可能获得重要信息',
          isAIGenerated: false,
        },
      ];

      return fallbackChoices.slice(0, numChoices);
    }
  }

  /**
   * 生成剧情续写内容
   * @param request 续写请求
   * @param onProgress 流式输出回调（可选）
   * @returns 生成的续写内容
   */
  async generateContinuation(
    request: ContinuationRequest,
    onProgress?: (chunk: string) => void
  ): Promise<string> {
    const { currentNode, selectedChoice, worldContext, conversationHistory } = request;

    try {
      // 获取相关上下文
      const relevantContext = await vectorStore.getRelevantContext(
        `${selectedChoice.text} ${currentNode.content.narrative}`,
        3
      );

      const contextStr = relevantContext.length > 0
        ? `\n\n相关故事背景：\n${relevantContext.join('\n')}`
        : '';

      const client = this.getClient();

      const systemPrompt = `你是一位专业的故事讲述者。你的任务是根据用户的选择，续写剧情内容。

请遵循以下要求：
1. 保持叙事风格一致，符合故事世界设定
2. 续写内容应该自然承接用户的选择
3. 长度控制在200-400字
4. 语言生动、有感染力，适合数字人朗读
5. 包含环境描写、角色反应和情节发展
6. 不要直接写"你选择了..."，而是描述选择后的结果和新的情况
7. 输出格式：直接输出续写文本，不要有任何前缀或后缀`;

      const historyStr = conversationHistory && conversationHistory.length > 0
        ? `\n\n之前的对话：\n${conversationHistory.join('\n')}`
        : '';

      const userPrompt = `故事世界背景：
${worldContext}

当前剧情：
${currentNode.content.narrative}

用户选择：
${selectedChoice.text}
${selectedChoice.consequences ? `（提示：${selectedChoice.consequences}）` : ''}${contextStr}${historyStr}

请续写剧情（200-400字）：`;

      // 如果有进度回调，使用流式输出
      if (onProgress) {
        const stream = await client.chat.completions.create({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          temperature: 0.9,
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
          temperature: 0.9,
        });

        return response.choices[0]?.message?.content || '';
      }
    } catch (error) {
      console.error('[StoryGenerator] Generate continuation error:', error);
      console.warn('[StoryGenerator] Using fallback continuation');

      // 降级方案：返回预设的通用续写内容
      const fallbackText = `你${selectedChoice.text}。随着你的行动，周围的环境似乎有了细微的变化。

${selectedChoice.consequences || '这个选择可能会带来意想不到的后果。'}

空气中弥漫着一种不确定的气息，仿佛有什么重要的事情即将发生。你注意到远处有什么东西在移动，但还无法看清是什么。

故事还在继续，接下来你会做出怎样的选择呢？`;

      if (onProgress) {
        // 模拟流式输出
        const chunks = fallbackText.split('').map((_, i, arr) =>
          arr.slice(0, i + 1).join('')
        );
        for (const chunk of chunks) {
          onProgress(chunk);
        }
      }

      return fallbackText;
    }
  }

  /**
   * 角色扮演对话响应
   * @param characterProfile 角色档案
   * @param userMessage 用户消息
   * @param conversationHistory 对话历史
   * @returns 角色响应
   */
  async generateDialogueResponse(
    characterProfile: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    try {
      const client = this.getClient();

      const systemPrompt = `你是故事中的角色，你的人设如下：
${characterProfile}

请以第一人称，用符合角色性格的语言和用户对话。保持角色的个性，让对话更加生动有趣。`;

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5).map(msg => ({
          role: (msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '抱歉，我现在无法回答。';
    } catch (error) {
      console.error('[StoryGenerator] Generate dialogue error:', error);
      console.warn('[StoryGenerator] Using fallback dialogue response');

      // 降级方案：返回预设的通用回复
      const fallbackResponses = [
        '这是一个很有趣的问题，但目前我无法给你详细的回答。让我们继续故事的探索吧！',
        '我明白了你的意思。不过现在，让我们专注于眼前的冒险，或许会有新的发现。',
        '你说得有道理。这个选择确实值得思考，接下来让我们看看会发生什么吧。',
      ];

      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
  }

  /**
   * 根据AI对话内容影响分支选项（重构版）
   * 内部使用统一的 continueStory 方法
   */
  async influenceChoices(
    currentNode: any,
    userDialogue: string,
    aiResponse: string
  ): Promise<StoryChoice[]> {
    try {
      console.log('[StoryGenerator] Influence choices via continueStory...');

      // 使用统一的 continueStory 方法
      // userContext 包含了用户的对话和AI的回应
      const response = await this.continueStory({
        currentNode,
        userContext: `用户说：${userDialogue}\n\nAI回应：${aiResponse}\n\n请根据以上对话调整分支选项，但不要续写新的剧情内容（保持当前剧情不变）。`,
      });

      console.log('[StoryGenerator] Choices influenced:', response.choices.length);

      // 返回调整后的分支选项
      return response.choices;
    } catch (error) {
      console.error('[StoryGenerator] Influence choices error:', error);
      console.warn('[StoryGenerator] Using original choices');

      // 降级方案：返回原选项
      return currentNode.choices || [];
    }
  }

  /**
   * 生成开场白（当开始新的故事线时）
   * @param worldContext 故事世界上下文
   * @returns 开场白文本
   */
  async generateOpening(worldContext: WorldContext): Promise<string> {
    try {
      const client = this.getClient();

      const systemPrompt = `你是一位专业的故事讲述者。你的任务是为故事创作一个引人入胜的开场白。

请遵循以下要求：
1. 根据故事世界的设定创作开场白
2. 长度控制在150-250字
3. 营造符合氛围基调的开场氛围
4. 引入主要角色或核心冲突的暗示
5. 使用第二人称"你"来增加代入感
6. 语言生动、有画面感
7. 输出格式：直接输出开场白，不要有任何前缀或后缀`;

      const userPrompt = `请为以下故事世界创作开场白：

世界观：${worldContext.worldview}

主要角色：
${worldContext.characters.map(c => `- ${c.name}：${c.personality}`).join('\n')}

核心冲突：${worldContext.coreConflict}

氛围基调：${worldContext.atmosphere}

请创作一个150-250字的开场白：`;

      const response = await client.chat.completions.create({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[StoryGenerator] Generate opening error:', error);
      console.warn('[StoryGenerator] Using fallback opening');

      // 降级方案：返回预设的通用开场白
      return `欢迎来到${worldContext.worldview.split('。')[0]}。

你站在一个陌生而又神秘的地方，四周充满了未知。空气中弥漫着${worldContext.atmosphere}的气息，仿佛在预示着即将发生的冒险。

这就是你的故事起点。每一个选择都将塑造你的命运，每一步都将揭开新的谜题。

准备好了吗？让我们开始这段奇妙的旅程吧。`;
    }
  }
}

export const storyGenerator = new StoryGeneratorService();
