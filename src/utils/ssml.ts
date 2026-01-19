/**
 * SSML生成器
 * 用于为数字人生成带动作标记的语音内容
 */

export interface SSMLAction {
  type: 'ka' | 'ka_intent' | 'gesture';
  semantic?: string;
  intent?: 'Think' | 'Welcome' | 'Dance' | 'Sad' | 'Happy';
}

/**
 * 生成SSML格式的语音文本
 */
export function generateSSML(text: string, action?: SSMLAction): string {
  if (!action) {
    return `<speak>${text}</speak>`;
  }

  let actionElement = '';

  if (action.type === 'ka' && action.semantic) {
    actionElement = `
    <ue4event>
      <type>ka</type>
      <data><action_semantic>${action.semantic}</action_semantic></data>
    </ue4event>`;
  } else if (action.type === 'ka_intent' && action.intent) {
    actionElement = `
    <ue4event>
      <type>ka_intent</type>
      <data><ka_intent>${action.intent}</ka_intent></data>
    </ue4event>`;
  }

  return `<speak>${actionElement}${text}</speak>`;
}

/**
 * 生成欢迎语
 */
export function generateWelcomeMessage(characterName?: string): string {
  const text = characterName
    ? `欢迎来到${characterName}的故事世界，我是您的专属讲述者。`
    : '欢迎来到灵魂讲述者，我是您的专属故事伴侣。';

  return generateSSML(text, {
    type: 'ka',
    semantic: 'Welcome',
  });
}

/**
 * 生成思考动作
 */
export function generateThinkingMessage(text: string): string {
  return generateSSML(text, {
    type: 'ka_intent',
    intent: 'Think',
  });
}

/**
 * 生成欢快动作
 */
export function generateHappyMessage(text: string): string {
  return generateSSML(text, {
    type: 'ka',
    semantic: 'Happy',
  });
}

/**
 * 生成悲伤动作
 */
export function generateSadMessage(text: string): string {
  return generateSSML(text, {
    type: 'ka',
    semantic: 'Sad',
  });
}
