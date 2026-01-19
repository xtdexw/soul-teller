# 灵魂讲述者 - 快速开始指南

## 🚀 开发环境配置

### 当前默认配置

项目已配置好以下测试密钥，可以直接使用：

#### 1. ModelScope API (通义千问)
```
API Key: ms-110b80f9-ae5a-4590-91d4-08bc8e54603a
```

#### 2. 魔珐星云 (数字人SDK)
```
App ID: a5fd9a6fcb3b4272be9ab895e2e7408c
App Secret: da4de295322947cd9ed3cf60bfa7edb9
Gateway: https://nebula-agent.xingyun3d.com/user/v1/ttsa/session
```

## 📦 启动项目

```bash
# 安装依赖（如果还未安装）
npm install

# 启动开发服务器
npm run dev
```

访问：http://localhost:3001

## 🎯 测试功能

### 1. 测试设置面板

1. 打开浏览器访问 http://localhost:3001
2. 点击右上角的设置按钮（⚙️）
3. 查看两个标签页：
   - **API密钥**：查看当前的ModelScope API密钥（显示为"默认测试密钥"）
   - **数字人连接**：查看当前的星云配置（显示为"默认测试App ID/Secret"）

### 2. 测试密钥管理

#### API密钥管理
- 点击"修改密钥"可以输入自己的API密钥
- 如果输入了自定义密钥，会显示掩码格式（如 `ms-11***03a`）
- 点击"恢复默认"可以恢复到测试密钥

#### 星云配置管理
- 可以看到当前配置的掩码显示
- 点击"连接数字人"测试连接功能
- 点击"修改配置"可以输入自己的配置
- 如果使用了自定义配置，会出现"恢复默认"按钮

### 3. 测试数字人连接

1. 进入"数字人连接"标签
2. 查看连接状态（显示为"未连接"）
3. 点击"连接数字人"按钮
4. 观察状态变化：
   - 连接中 → 已连接（或连接失败）
5. 连接成功后可以点击"断开连接"

## 🔧 开发调试

### 查看localStorage

打开浏览器开发者工具：
1. 按 F12 或右键 → 检查
2. 进入 Application 标签
3. 左侧找到 Local Storage → http://localhost:3001
4. 查看存储的密钥：
   - `soul-teller-api-keys` - API密钥
   - `soul-teller-xingyun-config` - 星云配置

### 清除测试数据

在浏览器控制台执行：
```javascript
localStorage.clear()
location.reload()
```

或者在设置中手动恢复默认配置。

## 📝 代码结构

```
src/
├── utils/
│   └── secureStorage.ts          # 密钥管理（含默认配置）
├── components/
│   └── Settings/
│       ├── ApiKeyManager.tsx     # API密钥管理组件
│       ├── AvatarConnection.tsx  # 星云连接管理组件
│       └── SettingsPanel.tsx     # 设置面板
├── hooks/
│   └── useAvatar.ts              # 数字人Hook
└── services/
    ├── ModelScopeVL.ts           # 通义千问VL服务
    ├── ModelScopeLLM.ts          # 通义千问LLM服务
    ├── ModelScopeEmbedding.ts    # 通义千问Embedding服务
    └── XingyunSDK.ts             # 魔珐星云SDK封装
```

## 🎨 UI特性

### 密钥掩码显示
- **默认配置**：显示"默认测试密钥"或"默认测试App ID"
- **自定义配置**：显示前4位和后4位（如 `a5fd***408c`）
- **完全隐藏**：App Secret始终显示为掩码

### 安全提示
- 密钥仅存储在浏览器localStorage中
- 不会上传到任何服务器
- 清除浏览器数据会丢失配置
- 建议生产环境使用自己的密钥

## 🌐 下一步

1. **集成真实SDK**
   - 替换 `src/services/XingyunSDK.ts` 中的模拟代码
   - 安装官方SDK包

2. **测试AI功能**
   - 在设置中使用自己的API密钥
   - 测试通义千问模型调用

3. **开发核心功能**
   - 实现故事上传和解析
   - 开发讲述界面
   - 实现对话互动功能

## ❓ 常见问题

**Q: 为什么连接数字人失败？**
A: 当前使用的是模拟SDK，需要集成真实的魔珐星云SDK才能正常连接。

**Q: 如何使用自己的密钥？**
A: 在设置面板中点击"修改密钥"或"修改配置"，输入自己的密钥后保存。

**Q: 密钥安全吗？**
A: 密钥仅存储在浏览器本地，不会上传。建议不要在公共设备上保存密钥。

**Q: 如何重置为默认配置？**
A: 点击"恢复默认"按钮，或在设置中手动修改回默认值。
