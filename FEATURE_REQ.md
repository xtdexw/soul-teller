# Soul Teller 功能扩展需求文档

## 概述

本文档描述 Soul Teller 项目的两个新功能需求：
1. 动态背景环境系统
2. 故事导出功能

---

## 功能一：动态背景环境系统

### 1.1 需求描述

在故事情节发展时，背景环境能够根据当前剧情的场景类型自动切换，增强用户的沉浸式体验。

### 1.2 核心目标

- 随剧情推进自动切换背景图
- 每个故事世界配置专属场景集合
- 平滑的过渡动画效果
- 支持回退查看历史背景

### 1.3 详细设计

#### 1.3.1 数据结构扩展

**扩展现有类型** (`src/types/story.ts`)

```typescript
// 场景类型定义
interface SceneType {
  id: string;
  name: string;
  backgroundImage: string;     // 背景图片URL
  overlayColor?: string;       // 叠加层颜色（如渐变）
  transitionType?: 'fade' | 'slide' | 'zoom'; // 过渡类型
}

// 故事节点扩展
interface StoryNode {
  // ... 现有字段
  sceneId?: string;            // 关联场景ID
  atmosphereHint?: string;     // 氛围提示（用于AI选择场景）
}

// 故事世界扩展
interface StoryWorld {
  // ... 现有字段
  scenes: SceneType[];         // 该世界的场景集合
  defaultSceneId: string;      // 默认场景ID
}
```

#### 1.3.2 场景配置示例

**迷失的魔法王国**
```typescript
const magicKingdomScenes: SceneType[] = [
  {
    id: 'crystal-forest',
    name: '水晶森林',
    backgroundImage: '/scenes/magic/crystal-forest.jpg',
    overlayColor: 'rgba(100, 200, 255, 0.2)',
    transitionType: 'fade'
  },
  {
    id: 'shadow-mountains',
    name: '暗影山脉',
    backgroundImage: '/scenes/magic/shadow-mountains.jpg',
    overlayColor: 'rgba(50, 0, 80, 0.3)',
    transitionType: 'fade'
  },
  {
    id: 'ancient-temple',
    name: '远古神殿',
    backgroundImage: '/scenes/magic/ancient-temple.jpg',
    overlayColor: 'rgba(255, 200, 100, 0.15)',
    transitionType: 'zoom'
  },
  {
    id: 'royal-chamber',
    name: '王室密室',
    backgroundImage: '/scenes/magic/royal-chamber.jpg',
    overlayColor: 'rgba(200, 150, 255, 0.2)',
    transitionType: 'fade'
  }
];
```

**赛博都市：霓虹之下**
```typescript
const cyberCityScenes: SceneType[] = [
  {
    id: 'neon-streets',
    name: '霓虹街道',
    backgroundImage: '/scenes/cyber/neon-streets.jpg',
    overlayColor: 'rgba(0, 255, 255, 0.1)',
    transitionType: 'slide'
  },
  {
    id: 'underground-bar',
    name: '地下酒吧',
    backgroundImage: '/scenes/cyber/underground-bar.jpg',
    overlayColor: 'rgba(128, 0, 128, 0.25)',
    transitionType: 'fade'
  },
  {
    id: 'corporate-tower',
    name: '企业塔楼',
    backgroundImage: '/scenes/cyber/corporate-tower.jpg',
    overlayColor: 'rgba(0, 50, 100, 0.3)',
    transitionType: 'zoom'
  },
  {
    id: 'virtual-realm',
    name: '虚拟空间',
    backgroundImage: '/scenes/cyber/virtual-realm.jpg',
    overlayColor: 'rgba(0, 255, 128, 0.15)',
    transitionType: 'fade'
  }
];
```

**江湖传说：剑影心**
```typescript
const wuxiaScenes: SceneType[] = [
  {
    id: 'mountain-path',
    name: '山间小径',
    backgroundImage: '/scenes/wuxia/mountain-path.jpg',
    overlayColor: 'rgba(139, 119, 101, 0.2)',
    transitionType: 'fade'
  },
  {
    id: 'tea-house',
    name: '路边茶馆',
    backgroundImage: '/scenes/wuxia/tea-house.jpg',
    overlayColor: 'rgba(205, 133, 63, 0.15)',
    transitionType: 'fade'
  },
  {
    id: 'bamboo-forest',
    name: '竹林深处',
    backgroundImage: '/scenes/wuxia/bamboo-forest.jpg',
    overlayColor: 'rgba(34, 139, 34, 0.2)',
    transitionType: 'fade'
  },
  {
    id: 'martial-hall',
    name: '武林大会堂',
    backgroundImage: '/scenes/wuxia/martial-hall.jpg',
    overlayColor: 'rgba(178, 34, 34, 0.2)',
    transitionType: 'zoom'
  }
];
```

#### 1.3.3 AI场景选择逻辑

修改故事生成提示词，让AI在生成剧情时同时指定场景：

```typescript
const sceneSelectionPrompt = `
在生成故事续写时，根据剧情内容选择最合适的场景。

可用场景：
${scenes.map(s => `- ${s.id}: ${s.name}`).join('\n')}

选择规则：
- 根据剧情发生的地点、氛围选择场景
- 在响应中包含 sceneId 字段
- 如果没有明确场景，使用默认场景
`;
```

#### 1.3.4 UI组件设计

**新建组件** `src/components/PlayRoom/SceneBackground.tsx`

```typescript
interface SceneBackgroundProps {
  scene: SceneType;
  onTransitionEnd?: () => void;
}

// 功能：
// - 显示背景图片
// - 应用叠加层颜色
// - 执行过渡动画
// - 懒加载优化
```

#### 1.3.5 状态管理

在 `useStore.ts` 中添加：

```typescript
interface StoryStore {
  // 当前场景
  currentScene: SceneType | null;
  setCurrentScene: (scene: SceneType) => void;

  // 场景历史
  sceneHistory: Array<{ nodeId: string; sceneId: string }>;
  addToSceneHistory: (nodeId: string, sceneId: string) => void;
}
```

### 1.4 实现要点

1. **背景图片存储**
   - 存放在 `public/scenes/` 目录
   - 使用 WebP 格式优化大小
   - 提供低分辨率占位图

2. **过渡动画**
   - CSS transitions 实现基础过渡
   - duration: 800ms - 1200ms
   - easing: cubic-bezier(0.4, 0, 0.2, 1)

3. **性能优化**
   - 图片预加载
   - 使用 CSS will-change 属性
   - 限制同时缓存的图片数量

4. **降级处理**
   - 图片加载失败时使用纯色背景
   - 场景ID无效时使用默认场景

---

## 功能二：故事导出功能

### 2.1 需求描述

提供将用户在当前会话中经历的故事导出为文件的功能，支持多种格式，方便用户保存和分享。

### 2.2 核心目标

- 支持多种导出格式（TXT、Markdown、JSON）
- 完整记录故事路径和用户选择
- 包含统计数据和元数据
- 美观的排版格式

### 2.3 详细设计

#### 2.3.1 导出数据结构

```typescript
interface StoryExportData {
  // 元数据
  metadata: {
    exportDate: string;
    worldName: string;
    storylineName: string;
    totalNodes: number;
    totalChoices: number;
    playDuration: number;  // 毫秒
  };

  // 故事路径
  storyPath: Array<{
    nodeId: string;
    sceneName?: string;
    narrative: string;
    selectedChoice: {
      text: string;
      consequences?: string;
    } | null;
    timestamp: number;
  }>;

  // 完整节点树（已访问的）
  visitedNodes: Array<{
    node: StoryNode;
    visitedAt: number;
  }>;

  // 选择历史
  choiceHistory: Array<{
    choiceId: string;
    choiceText: string;
    fromNodeId: string;
    toNodeId: string;
    timestamp: number;
  }>;
}
```

#### 2.3.2 导出格式设计

**TXT 格式** - 简洁文本版
```
==================================================
  灵魂讲述者 - 故事导出
==================================================

故事世界：迷失的魔法王国
导出时间：2026-01-23 15:30:00
总节点数：12
总选择数：11
游玩时长：25分钟

==================================================

【第1章】水晶森林的召唤
场景：水晶森林

你独自一人站在水晶森林的边缘，阳光透过茂密的树冠洒下斑驳的光影...

> 你的选择：深入森林探索

--------------------------------------------------

【第2章】森林深处的发现
场景：远古神殿

在森林深处，你发现了一座被藤蔓覆盖的古老神殿...

> 你的选择：进入神殿调查

...

==================================================
故事结束
感谢你的游玩！
==================================================
```

**Markdown 格式** - 富文本版
```markdown
# 灵魂讲述者 - 故事导出

## 元数据

| 项目 | 内容 |
|------|------|
| 故事世界 | 迷失的魔法王国 |
| 导出时间 | 2026-01-23 15:30:00 |
| 总节点数 | 12 |
| 总选择数 | 11 |
| 游玩时长 | 25分钟 |

---

## 故事正文

### 【第1章】水晶森林的召唤
**场景**：水晶森林

你独自一人站在水晶森林的边缘，阳光透过茂密的树冠洒下斑驳的光影...

> **你的选择**：深入森林探索

---

### 【第2章】森林深处的发现
**场景**：远古神殿

在森林深处，你发现了一座被藤蔓覆盖的古老神殿...

> **你的选择**：进入神殿调查

---

*故事结束，感谢你的游玩！*
```

**JSON 格式** - 完整数据版
```json
{
  "metadata": {
    "exportDate": "2026-01-23T15:30:00.000Z",
    "worldName": "迷失的魔法王国",
    "worldId": "magic-kingdom",
    "storylineName": "失落的王权",
    "totalNodes": 12,
    "totalChoices": 11,
    "playDuration": 1500000
  },
  "storyPath": [
    {
      "nodeId": "node-1",
      "sceneName": "水晶森林",
      "narrative": "...",
      "selectedChoice": {
        "text": "深入森林探索",
        "consequences": "可能遇到危险"
      },
      "timestamp": 1705987800000
    }
  ],
  "visitedNodes": [...],
  "choiceHistory": [...]
}
```

#### 2.3.3 导出服务

**新建服务** `src/services/StoryExporter.ts`

```typescript
class StoryExporter {
  // 收集导出数据
  async collectExportData(session: InteractionSession): Promise<StoryExportData>

  // 导出为 TXT
  exportToTXT(data: StoryExportData): string

  // 导出为 Markdown
  exportToMarkdown(data: StoryExportData): string

  // 导出为 JSON
  exportToJSON(data: StoryExportData): string

  // 触发下载
  download(content: string, filename: string, mimeType: string): void
}
```

#### 2.3.4 UI组件设计

**新建组件** `src/components/PlayRoom/ExportButton.tsx`

```typescript
interface ExportButtonProps {
  session: InteractionSession | null;
  disabled?: boolean;
}

// 功能：
// - 下拉菜单选择导出格式
// - 显示导出状态（准备中/导出中/完成）
// - 导出成功提示
// - 错误处理
```

UI设计：
```
┌─────────────────────────┐
│  [📥 导出故事] ▼        │
├─────────────────────────┤
│  📄 导出为 TXT          │
│  📝 导出为 Markdown     │
│  { } 导出为 JSON        │
└─────────────────────────┘
```

#### 2.3.5 集成位置

在 `PlayRoom.tsx` 中添加导出按钮：

```typescript
<div className="flex items-center gap-4">
  {/* 导出按钮 */}
  <ExportButton session={currentSession} />

  {/* 其他控制按钮 */}
</div>
```

### 2.4 实现要点

1. **文件命名**
   - 格式：`{世界名}_{日期}.{扩展名}`
   - 示例：`魔法王国_20260123.md`

2. **字符编码**
   - 使用 UTF-8 编码
   - 添加 BOM 标记（TXT格式）

3. **下载实现**
   - 使用 Blob API
   - 创建临时 `<a>` 标签触发下载
   - 自动清理临时元素

4. **数据完整性**
   - 导出前验证会话数据
   - 处理缺失字段
   - 提供降级方案

---

## 开发计划

### 阶段一：动态背景环境系统

1. **类型定义** (30分钟)
   - 扩展 `src/types/story.ts`
   - 添加 `SceneType` 等类型

2. **数据配置** (1小时)
   - 更新 `StoryWorlds.ts` 添加场景配置
   - 准备占位背景图

3. **UI组件** (1.5小时)
   - 创建 `SceneBackground.tsx`
   - 实现过渡动画
   - 集成到 PlayRoom

4. **AI集成** (1小时)
   - 修改 StoryGenerator 提示词
   - 添加场景选择逻辑

5. **状态管理** (30分钟)
   - 更新 useStore
   - 添加场景历史追踪

6. **测试** (30分钟)
   - 测试场景切换
   - 验证过渡效果
   - 检查降级处理

### 阶段二：故事导出功能

1. **类型定义** (15分钟)
   - 添加导出相关类型

2. **导出服务** (2小时)
   - 创建 `StoryExporter.ts`
   - 实现三种格式导出
   - 实现下载功能

3. **UI组件** (1小时)
   - 创建 `ExportButton.tsx`
   - 实现下拉菜单
   - 添加状态提示

4. **集成** (30分钟)
   - 集成到 PlayRoom
   - 添加快捷键支持

5. **测试** (30分钟)
   - 测试各格式导出
   - 验证文件内容
   - 检查边界情况

---

## 验收标准

### 动态背景环境系统

- [ ] 故事世界配置了至少4个场景
- [ ] AI生成剧情时能正确选择场景
- [ ] 场景切换有平滑的过渡动画
- [ ] 支持场景历史回退
- [ ] 图片加载失败时有降级处理

### 故事导出功能

- [ ] 支持导出为 TXT 格式
- [ ] 支持导出为 Markdown 格式
- [ ] 支持导出为 JSON 格式
- [ ] 导出文件命名正确
- [ ] 文件内容完整、格式正确
- [ ] 下载功能正常工作

---

**文档版本**: v1.0
**创建日期**: 2026-01-23
**状态**: 待开发
