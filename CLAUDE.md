# 灵魂讲述者（Soul Teller）- 项目开发文档

## 一、项目概述

### 1.1 项目简介
"灵魂讲述者"是一个基于魔珐星云具身智能平台的AI交互式叙事应用。用户可以选择预设的故事世界，通过与数字人的互动对话影响剧情走向，实现沉浸式的分支故事体验。

### 1.2 赛道信息
- **赛道**: AI创意/灵感交互赛道
- **方向**: 创意内容与叙事
- **核心理念**: 结合3D数字人与AI大模型，创造前所未有的互动叙事体验

### 1.3 技术栈
| 组件 | 技术选型 |
|------|----------|
| 前端框架 | React 18 + TypeScript |
| 数字人SDK | 魔珐星云具身驱动SDK (xmovAvatar) |
| 大语言模型 | 通义千问 Qwen2.5-72B-Instruct (ModelScope API) |
| 向量模型 | 通义千问 Embedding-8B |
| 向量数据库 | 自研轻量级向量存储（IndexedDB） |
| 密钥存储 | localStorage (加密) |
| 状态管理 | Zustand + persist |
| 构建工具 | Vite |
| UI组件库 | TailwindCSS + shadcn/ui |

### 1.4 星云配置
**默认配置**（已更新）：
- **App ID**: `cc36cf95b26844039fa0f49f9a3b2a22`
- **App Secret**: `fbb35216a10247038c7e80d2dbf66bb0`
- **Gateway**: `https://nebula-agent.xingyun3d.com/user/v1/ttsa/session`

---

## 二、产品功能设计

### 2.1 核心功能

#### ✅ 已实现功能

1. **数字人互动讲述**
   - 3D数字人实时渲染
   - 流式语音合成（TTS）
   - 文本分块朗读（50字/块）
   - 语音状态监听与同步

2. **分支剧情系统**
   - 预设故事世界选择
   - AI动态生成剧情续写（200-400字）
   - 智能生成3个分支选项
   - 用户选择推动剧情发展

3. **AI对话互动**
   - 实时对话面板
   - AI根据用户输入调整分支选项
   - 对话历史记录

4. **向量检索系统**
   - IndexedDB 本地向量存储
   - 自动剧情转折点检测
   - 语义检索相关上下文
   - 混合上下文生成（最近剧情 + 向量检索）

5. **状态管理**
   - 会话状态追踪
   - 节点访问记录
   - 选择历史统计

#### 🚧 待开发功能

- 视觉模型集成（封面提取、插图理解）
- 书籍导入与解析（TXT/EPUB）
- 多角色扮演系统
- 剧情树可视化
- 背景音乐/音效

### 2.2 用户交互流程

```
[启动应用]
  ↓
[连接数字人] → 手动连接/自动连接
  ↓
[选择故事世界] → 赛博朋克/奇幻森林/悬疑推理...
  ↓
[开始冒险] → 数字人朗读开场剧情
  ↓
[互动循环]
  ├─→ [AI对话] → 调整分支选项 → 返回
  ├─→ [选择分支] → AI生成新剧情 → 数字人朗读 → 循环
  └─→ [退出] → 返回主页
```

---

## 三、系统架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端展示层                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  StoryWorld │ │  PlayRoom   │ │    AIChatPanel      │  │
│  │  选择器     │ │  互动界面   │ │    对话面板         │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (React)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │ StoryEngine │ │StoryGenerator│ │   VectorStore       │  │
│  │ 故事引擎    │ │ 故事生成器  │ │   向量存储          │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                       AI服务层                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  Qwen LLM   │ │  Embedding  │ │   星云SDK           │  │
│  │  剧情生成   │ │  向量化     │ │   数字人驱动        │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心服务说明

#### StoryEngine（故事引擎）
- **职责**: 管理故事会话状态、节点流转
- **核心方法**:
  - `startSession()`: 开始新会话
  - `handleChoice()`: 处理用户选择
  - `updateCurrentNodeChoices()`: 更新分支选项
  - `getSessionStats()`: 获取会话统计

#### StoryGenerator（故事生成器）
- **职责**: 统一的故事续写和分支生成
- **核心方法**:
  - `continueStory()`: 续写剧情 + 生成分支（一次API调用）
  - `influenceChoices()`: AI对话影响分支选项

#### VectorStore（向量存储）
- **职责**: 本地向量检索与上下文管理
- **核心方法**:
  - `addStoryNode()`: 添加剧情节点
  - `getContextForGeneration()`: 获取生成上下文
  - `search()`: 语义检索

---

## 四、数据结构设计

### 4.1 故事节点（StoryNode）
```typescript
interface StoryNode {
  id: string;                          // 节点唯一ID
  type: 'branch';                      // 节点类型
  title?: string;                      // 节点标题
  content: {
    narrative: string;                 // 剧情内容（200-400字）
    ssmlActions?: SSMLAction[];        // SSML动作指令
  };
  choices: StoryChoice[];              // 分支选项（3个）
  parentChoiceId?: string;             // 父选择ID
}
```

### 4.2 分支选项（StoryChoice）
```typescript
interface StoryChoice {
  id: string;                          // 选项唯一ID
  text: string;                        // 选项文本
  consequences?: string;               // 后果提示
  isAIGenerated?: boolean;             // 是否AI生成
}
```

### 4.3 故事世界（StoryWorld）
```typescript
interface StoryWorld {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  context: WorldContext;
}

interface WorldContext {
  worldview: string;                   // 世界观描述
  coreConflict: string;                // 核心冲突
  atmosphere: string;                  // 氛围基调
  characters: Character[];             // 主要角色
}
```

---

## 五、关键实现细节

### 5.1 统一的故事生成API

**设计原则**: 一个API调用同时获得续写内容 + 分支选项

```typescript
interface ContinueStoryRequest {
  currentNode: StoryNode;
  userContext?: string;               // 用户对话/想法
  worldContext?: WorldContext;        // 世界观
}

interface ContinueStoryResponse {
  narrative: string;                  // 续写内容（200-400字）
  choices: StoryChoice[];             // 3个分支选项
}
```

**优势**:
- 减少API调用次数
- 确保内容与选项的一致性
- 简化代码逻辑

### 5.2 混合上下文策略

**上下文组成**:
1. **最近剧情**: 内存中保存最近10段剧情
2. **向量检索**: 语义检索2个最相关的历史节点
3. **用户对话**: 实时用户输入

**提示词构建**:
```typescript
const systemPrompt = `
你是一个专业的故事讲述者。

## 创作要求
- 续写长度：200-400字
- 分支选项：3个不同风格
- 输出格式：JSON

## 故事世界观
${worldContext}
`;

const userPrompt = `
## 故事上下文
${context.summary}

## 当前剧情
${currentNode.content.narrative}

## 用户想法
${userContext || '无'}

请续写故事并提供3个分支选项。
`;
```

### 5.3 数字人朗读时序控制

**问题**: 节点设置与数字人连接的时序问题

**解决方案**: 两个独立的 useEffect
```typescript
// 1. 监听数字人连接状态
useEffect(() => {
  if (isConnected && currentNode && !hasAlreadySpoken) {
    speakNodeContent(currentNode);
  }
}, [isConnected]);

// 2. 监听节点变化（仅在已连接时）
useEffect(() => {
  if (!isConnected) return;
  if (currentNode && !hasAlreadySpoken) {
    speakNodeContent(currentNode);
  }
}, [currentNode, isConnected]);
```

**关键点**:
- 使用 `spokenNodeIdsRef` 跟踪已朗读节点
- 通过节点ID判断而非内容比较
- 分离连接和节点变化的监听

### 5.4 向量存储优化

**AI自动转折点检测**:
```typescript
private async analyzePlotTwist(narrative: string): Promise<{isTwist: boolean; reason: string}> {
  const response = await client.chat.completions.create({
    model: 'Qwen/Qwen2.5-72B-Instruct',
    messages: [{
      role: 'system',
      content: `判断以下剧情是否是重要转折点...
返回JSON格式：{"isTwist": true/false, "reason": "原因"}`
    }, {
      role: 'user',
      content: narrative
    }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

---

## 六、API调用示例

### 6.1 续写剧情
```typescript
const result = await storyGenerator.continueStory({
  currentNode,
  userContext: `用户选择了：${selectedChoice.text}`,
  worldContext: world.context
});

// 结果
{
  narrative: "随着你的选择...",
  choices: [
    { id: "1", text: "继续前进", consequences: "可能遇到危险" },
    { id: "2", text: "仔细观察", consequences: "发现线索" },
    { id: "3", text: "回头查看", consequences: "有人跟踪" }
  ]
}
```

### 6.2 AI对话影响分支
```typescript
const adjustedChoices = await storyGenerator.influenceChoices(
  currentNode,
  userInput,
  aiResponse
);

// 返回调整后的分支选项
```

---

## 七、开发规范

### 7.1 Git提交规范
遵循 `D:\vscode-project\xinyun\.claude\rules\GIT_COMMIT_RULES.md`

**格式**:
```
<type>: <subject>

<可选的详细说明>
```

**Type 类型**:
- `feat` - 新功能
- `fix` - 修复bug
- `refactor` - 重构
- `docs` - 文档更新
- `style` - 格式调整
- `test` - 测试
- `chore` - 构建/工具

**示例**:
```
feat: 实现统一的故事生成API

- 整合续写和分支生成到单一API
- 添加混合上下文策略
- 优化向量检索逻辑
```

### 7.2 代码规范
- 使用 TypeScript 严格模式
- 组件使用函数式 + Hooks
- 服务类使用单例模式
- 错误处理统一使用 console.error
- 关键流程添加日志（不过度）

---

## 八、部署与运行

### 8.1 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 8.2 环境配置
**开发环境**:
- Vite 开发服务器
- 热模块替换（HMR）
- TypeScript 实时编译

**生产环境**:
- 静态资源优化
- 代码分割与懒加载
- Tree-shaking

---

## 九、已知问题与优化方向

### 9.1 已解决问题
- ✅ 初始故事不朗读 → 修复时序问题
- ✅ AI对话后分支选项错误 → 添加状态同步
- ✅ 重复朗读同一节点 → 使用节点ID追踪

### 9.2 待优化
- 🔧 向量检索性能优化（当前全量扫描）
- 🔧 LLM API调用频率控制
- 🔧 错误重试机制
- 🔧 离线模式支持

### 9.3 功能扩展
- 🆕 多角色系统
- 🆕 剧情树可视化
- 🆕 存档/读档功能
- 🆕 成就系统
- 🆕 多人协作模式

---

## 十、项目评估要点对照

### 商业潜力（50%）
- **市场需求**: ✅ 互动叙事、教育陪伴、IP运营
- **应用场景**: ✅ 个人娱乐、在线教育、数字图书馆
- **商业模式**: ✅ B2C订阅 + B2B授权

### 产品体验设计（30%）
- **交互创新**: ✅ 多模态交互（语音+文本+3D）
- **用户流程**: ✅ 简洁直观（连接→选择→互动）
- **视觉设计**: ✅ 沉浸式界面

### 技术完成度（20%）
- **SDK应用**: ✅ 充分利用星云SDK能力
- **AI融合**: ✅ 多模型协同（LLM + Embedding + 向量检索）
- **代码质量**: ✅ 模块化架构，类型安全

---

**文档版本**: v2.0
**更新内容**：
- ✅ 更新为分支剧情系统架构
- ✅ 添加统一故事生成API说明
- ✅ 补充时序控制解决方案
- ✅ 更新核心服务说明
- ✅ 添加开发规范章节
**最后更新**: 2026-01-19
**状态**: ✅ 分支剧情核心功能已完成，可继续扩展
