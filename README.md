# 灵魂讲述者 (Soul Teller)

> 基于3D数字人与AI大模型的互动式分支叙事体验

## 项目简介

"灵魂讲述者"是一个基于魔珐星云具身智能平台的AI交互式叙事应用。用户可以选择预设的故事世界，通过与数字人的实时对话影响剧情走向，实现真正的沉浸式分支故事体验。

## ✨ 核心特性

### 🎭 数字人互动讲述
- 3D数字人实时渲染与动画
- 流式语音合成（TTS）
- 文本分块朗读与状态同步
- 支持手动/自动连接控制

### 🌳 分支剧情系统
- 预设故事世界（赛博朋克/奇幻森林/悬疑推理等）
- AI动态生成剧情续写（200-400字）
- 智能生成3个分支选项
- 用户选择推动剧情发展
- 完整的选择历史追踪

### 💬 AI对话互动
- 实时对话面板
- AI根据用户输入调整分支选项
- 对话历史记录
- 支持多轮对话

### 🧠 智能上下文管理
- IndexedDB 本地向量存储
- AI自动剧情转折点检测
- 语义检索相关历史
- 混合上下文策略（最近剧情 + 向量检索）

### 🔒 安全特性
- 🔐 **密钥本地存储** - 所有API密钥存储在浏览器localStorage中
- 🎭 **密钥掩码显示** - 仅显示前4位和后4位字符
- 🔌 **手动连接控制** - 用户完全控制数字人的连接与断开

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand + persist
- **样式方案**: TailwindCSS
- **数字人SDK**: 魔珐星云具身驱动SDK (xmovAvatar)
- **大语言模型**: 通义千问 Qwen2.5-72B-Instruct (ModelScope API)
- **向量模型**: 通义千问 Embedding-8B
- **向量数据库**: 自研轻量级向量存储（IndexedDB）

## 安装与运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 配置说明

### API密钥配置

默认使用测试密钥进行开发调试。如需使用自己的密钥：

1. 点击右上角设置按钮
2. 进入"API密钥"标签
3. 点击"修改密钥"输入自己的密钥
4. 保存后即可使用

### 数字人连接配置

或使用自定义配置：

1. 在[魔珐星云平台](https://xingyun3d.com)创建应用
2. 获取App ID和App Secret
3. 在设置面板的"数字人连接"标签中配置
4. 点击"连接数字人"建立连接

## 项目结构

```
soul-teller/
├── src/
│   ├── components/       # UI组件
│   │   ├── StoryHub/     # 故事世界选择
│   │   ├── PlayRoom/     # 互动播放室
│   │   ├── Settings/     # 设置面板
│   │   ├── Dialogue/     # AI对话面板
│   │   └── StoryTeller/  # 数字人容器
│   ├── services/         # 服务层
│   │   ├── StoryEngine.ts      # 故事引擎
│   │   ├── StoryGenerator.ts   # 故事生成器
│   │   ├── VectorStore.ts      # 向量存储
│   │   ├── XingyunSDK.ts       # 星云SDK封装
│   │   └── ...
│   ├── hooks/            # 自定义Hooks
│   │   └── useAvatar.ts
│   ├── store/            # 状态管理
│   │   └── useStore.ts
│   ├── utils/            # 工具函数
│   │   ├── secureStorage.ts
│   │   ├── textChunker.ts
│   │   └── ...
│   ├── types/            # 类型定义
│   │   ├── story.ts
│   │   ├── interaction.ts
│   │   └── ...
│   └── App.tsx
├── public/               # 静态资源
└── package.json
```

## 使用流程

```
1. 启动应用
   ↓
2. 连接数字人（手动/自动）
   ↓
3. 选择故事世界
   ↓
4. 点击"开始冒险"
   ↓
5. 数字人朗读开场剧情
   ↓
6. 选择分支 或 AI对话
   ↓
7. 推动剧情发展
   ↓
8. 循环步骤 6-7
```

## 开发文档

详细的开发文档请参考 [CLAUDE.md](./CLAUDE.md)

## 核心架构

### 统一故事生成API
一个API调用同时获得：续写内容（200-400字）+ 3个分支选项

### 混合上下文策略
- 最近剧情：内存中保存最近10段
- 向量检索：语义检索2个最相关历史节点
- 用户对话：实时用户输入

### 数字人朗读时序控制
- 监听数字人连接状态
- 节点ID追踪避免重复朗读
- 分离连接和节点变化监听

## 许可证

MIT

## 致谢

- [魔珐星云](https://xingyun3d.com) - 提供3D数字人SDK
- [ModelScope](https://modelscope.cn) - 提供通义千问AI模型
- [Vite](https://vitejs.dev) - 强大的前端构建工具
- [React](https://react.dev) - 用户界面框架
