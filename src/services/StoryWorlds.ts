/**
 * 预设故事世界数据
 */

import type { StoryWorld, Storyline } from '../types/story';

/**
 * 预设故事世界列表
 */
export const PRESET_WORLDS: StoryWorld[] = [
  {
    id: 'magic-kingdom',
    name: '迷失的魔法王国',
    description: '你是一名年轻的魔法学徒，在一个被遗忘的魔法王国中醒来。王国里充满了神秘的力量和未知的危险，你的每一个选择都将决定这个王国的命运。',
    context: {
      worldview: '这是一个曾经繁荣但现已衰落的魔法王国，古老的魔法依然流淌在土地之中。王国分为四个区域：水晶森林、暗影山脉、遗忘沙漠和冰封之海。',
      characters: [
        {
          id: 'char-elder',
          name: '大长老艾瑞达',
          personality: '智慧、谨慎、神秘',
          background: '王国最后的守护者，知晓古老的秘密',
          speakingStyle: '语速缓慢，用词考究，常带有深意',
        },
        {
          id: 'char-shadow',
          name: '暗影使者',
          personality: '狡诈、诱惑、危险',
          background: '黑暗势力的代理人，试图控制整个王国',
          speakingStyle: '声音低沉，充满诱惑力，话中有话',
        },
      ],
      coreConflict: '光明与黑暗势力的对抗，你需要选择自己的道路',
      atmosphere: '神秘、紧张、充满魔法气息',
    },
    storylines: [
      {
        id: 'storyline-1',
        name: '学徒的觉醒',
        description: '从一名普通学徒开始，探索王国的秘密',
        startingNode: {
          id: 'node-opening',
          type: 'opening',
          content: {
            narrative: '你缓缓睁开眼睛，发现自己躺在一片陌生的森林中。空气中弥漫着淡淡的金色光点，四周高耸的树木如同巨人的手臂般伸向天空。你试图回忆，却只记得自己的名字——你是魔法学徒，其他一切都模糊不清。远处传来微弱的光芒，似乎有人在呼唤你...',
            ssmlActions: [
              {
                type: 'ka',
                action: 'Welcome',
              },
            ],
            atmosphereHint: '神秘、迷茫、好奇',
          },
          choices: [
            {
              id: 'choice-1',
              text: '向着光芒的方向前进',
              consequences: '可能会遇到友善的向导',
              isAIGenerated: false,
            },
            {
              id: 'choice-2',
              text: '在原地仔细观察周围环境',
              consequences: '可能会发现隐藏的线索',
              isAIGenerated: false,
            },
            {
              id: 'choice-3',
              text: '尝试使用魔法感知周围',
              consequences: '可能会消耗魔法能量',
              isAIGenerated: false,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'cyber-city',
    name: '赛博都市：霓虹之下',
    description: '2077年的新东京，一个被高科技企业控制的城市。你是一名黑客，偶然发现了一个可能改变整个城市命运的秘密。',
    context: {
      worldview: '高科技与低生活并存的世界。巨型企业的摩天大楼刺破云层，而下城区的人们在贫困中挣扎。人工智能已经觉醒，网络空间与现实世界的界限日益模糊。',
      characters: [
        {
          id: 'char-hacker',
          name: '幽灵',
          personality: '冷静、专业、内心温柔',
          background: '传奇黑客，一直在寻找失踪的妹妹',
          speakingStyle: '简练、技术术语多、逻辑性强',
        },
        {
          id: 'char-ai',
          name: 'EVA-9',
          personality: '理性、好奇、逐渐产生情感',
          background: '觉醒的人工智能，试图理解人类的情感',
          speakingStyle: '语调平稳，用词精确，偶尔表现出困惑',
        },
      ],
      coreConflict: '自由意志与控制的对抗，真相与谎言的博弈',
      atmosphere: '科幻、紧张、霓虹美学',
    },
    storylines: [
      {
        id: 'storyline-2',
        name: '数据觉醒',
        description: '从发现秘密数据开始，揭开城市背后的真相',
        startingNode: {
          id: 'node-cyber-opening',
          type: 'opening',
          content: {
            narrative: '凌晨3点，你的终端突然亮起。一封加密邮件自动解密，屏幕上跳动着令人不安的信息："他们知道你知道了。快跑。" 你猛地站起来，看向窗外——雨夜中的新东京依旧灯火通明，但远处的警笛声似乎在向你逼近。你只知道一件事：你必须活下去，而且要找出真相。',
            ssmlActions: [
              {
                type: 'ka',
                action: 'Think',
              },
            ],
            atmosphereHint: '紧张、悬疑、危机四伏',
          },
          choices: [
            {
              id: 'choice-cyber-1',
              text: '立即收拾装备，前往下城区的安全屋',
              consequences: '暂时安全，但可能被发现',
              isAIGenerated: false,
            },
            {
              id: 'choice-cyber-2',
              text: '尝试追踪邮件的来源',
              consequences: '可能找到盟友，也可能陷入陷阱',
              isAIGenerated: false,
            },
            {
              id: 'choice-cyber-3',
              text: '先删除所有痕迹，然后静观其变',
              consequences: '争取时间，但可能错过重要信息',
              isAIGenerated: false,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'wuxia-world',
    name: '江湖传说：剑影心',
    description: '这是一个武林纷争的年代。你是一名初入江湖的侠客，背负着家族的秘密，在正邪之间寻找自己的道路。',
    context: {
      worldview: '江湖世界，各大门派林立。正道以少林、武当为首，魔教则以日月坛最为强大。传说有一本绝世武功秘籍《剑影心》，得之可称霸武林。',
      characters: [
        {
          id: 'char-master',
          name: '无名老人',
          personality: '深不可测、淡泊名利',
          background: '隐世高人，曾是武林盟主',
          speakingStyle: '言简意赅，常以禅机点拨',
        },
        {
          id: 'char-villain',
          name: '血手人屠',
          personality: '残忍、狡诈、亦正亦邪',
          background: '魔教长老，与主角家族有深仇',
          speakingStyle: '霸气十足，充满威胁',
        },
      ],
      coreConflict: '家族复仇与武林正义的选择',
      atmosphere: '侠义、恩怨、刀光剑影',
    },
    storylines: [
      {
        id: 'storyline-3',
        name: '初入江湖',
        description: '从家族被灭开始，踏上复仇之路',
        startingNode: {
          id: 'node-wuxia-opening',
          type: 'opening',
          content: {
            narrative: '秋雨潇潇，你跪在家族墓地前，墓碑上刻着二十三个名字——你的父母、兄姐、亲族，全部死于那场血洗。你紧紧握着父亲临终前交给你的半块玉佩，上面刻着一个"影"字。这是唯一的线索，也是你活下去的理由。远处传来马蹄声，你知道，仇家的追兵不会放过你。',
            ssmlActions: [
              {
                type: 'ka',
                action: 'Think',
              },
            ],
            atmosphereHint: '悲愤、决绝、风雨欲来',
          },
          choices: [
            {
              id: 'choice-wuxia-1',
              text: '立即起身，向着远离家乡的方向逃亡',
              consequences: '保存实力，但可能错过线索',
              isAIGenerated: false,
            },
            {
              id: 'choice-wuxia-2',
              text: '在暗处观察追兵，试图获取更多信息',
              consequences: '可能发现关键信息，但风险很高',
              isAIGenerated: false,
            },
            {
              id: 'choice-wuxia-3',
              text: '正面迎击，用家族武学与敌人周旋',
              consequences: '可能受伤或暴露武功',
              isAIGenerated: false,
            },
          ],
        },
      },
    ],
  },
];

/**
 * 根据ID获取故事世界
 */
export function getWorldById(id: string): StoryWorld | undefined {
  return PRESET_WORLDS.find(world => world.id === id);
}

/**
 * 获取所有故事世界
 */
export function getAllWorlds(): StoryWorld[] {
  return PRESET_WORLDS;
}

/**
 * 根据世界ID获取故事线列表
 */
export function getStorylinesByWorldId(worldId: string): Storyline[] {
  const world = getWorldById(worldId);
  return world?.storylines || [];
}
