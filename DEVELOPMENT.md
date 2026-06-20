# Mimo Desktop 开发日志

## 项目概述

- **项目名称**: Mimo Desktop
- **项目路径**: `D:\AI\code\mimo-desktop`
- **技术栈**: Electron 42 + React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 3 + Zustand 5
- **创建日期**: 2026-06-15
- **目标**: 为 MimoCode CLI 提供桌面 GUI 客户端
- **完成度**: ~75%（核心功能 + 工程化基础设施）

---

## 技术架构

### 目录结构

```
mimo-desktop/
├── electron/                    # Electron 主进程（25 个文件）
│   ├── main.ts                 # 主进程入口（273 行）
│   ├── preload.ts              # 安全桥接（41 行）
│   ├── ipc-handlers.ts         # IPC 路由（307 行）
│   ├── ipc-validator.ts        # IPC 输入验证（360 行）
│   ├── process-manager.ts      # CLI 进程 + 消息队列（420 行）
│   ├── api-manager.ts          # HTTP API 直连（290 行）
│   ├── session-manager.ts      # 会话管理（68 行）
│   ├── config-manager.ts       # JSONC 配置（96 行）
│   ├── file-manager.ts         # 文件树（190 行）
│   ├── memory-manager.ts       # 记忆系统（238 行）
│   ├── skill-manager.ts        # 技能系统（202 行）
│   ├── lsp-manager.ts          # LSP 协议（335 行）
│   ├── mcp-manager.ts          # MCP 协议（317 行）
│   ├── tts-manager.ts          # TTS 语音合成（108 行）
│   ├── auto-updater.ts         # 自动更新（89 行）
│   ├── crash-reporter.ts       # 崩溃上报（38 行）
│   ├── debug.ts                # 结构化日志（143 行）
│   ├── constants.ts            # 常量定义（13 行）
│   ├── api-response.ts         # 统一响应（27 行）
│   ├── tray.ts                 # 系统托盘（122 行）
│   ├── tray-icon.ts            # 托盘图标（12 行）
│   ├── shortcuts.ts            # 全局快捷键（134 行）
│   ├── utils/
│   │   ├── mimo-path.ts        # Mimo 路径查找（63 行）
│   │   └── event-helper.ts     # 事件发送（20 行）
│   └── types/
│       └── ipc.ts              # IPC 类型定义（76 行）
├── src/                         # React 渲染进程（79 个文件）
│   ├── App.tsx                 # 主应用布局（252 行）
│   ├── main.tsx                # 入口 + ErrorBoundary（24 行）
│   ├── index.css               # 全局样式（73 行）
│   ├── lib/
│   │   ├── utils.ts            # cn() + formatTime（22 行）
│   │   ├── debug.ts            # 渲染进程日志（106 行）
│   │   └── constants.ts        # 前端常量（13 行）
│   ├── types/
│   │   ├── tool.ts             # 工具调用类型（29 行）
│   │   └── global.d.ts         # 全局类型声明
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # 错误边界（52 行）
│   │   ├── Toast.tsx           # Toast 通知（31 行）
│   │   ├── chat/               # 聊天核心（15 个文件）
│   │   │   ├── ChatPanel.tsx   # 聊天面板（224 行）
│   │   │   ├── ChatInput.tsx   # 输入框（516 行）
│   │   │   ├── MessageList.tsx # 消息列表（85 行）
│   │   │   ├── MessageBubble.tsx # 消息气泡（444 行）
│   │   │   ├── CodeBlock.tsx   # 代码块（127 行）
│   │   │   ├── TabBar.tsx      # 标签栏（123 行）
│   │   │   ├── ModelSelectorInline.tsx # 内联模型选择器（157 行）
│   │   │   ├── AgentIndicator.tsx # Agent 指示器（68 行）
│   │   │   ├── CommandMenu.tsx # /命令菜单（109 行）
│   │   │   ├── TemplateMenu.tsx # 模板菜单（170 行）
│   │   │   ├── FileMentionMenu.tsx # @文件引用（160 行）
│   │   │   ├── AttachmentPreview.tsx # 附件预览（58 行）
│   │   │   ├── HistoryPanel.tsx # 历史面板（183 行）
│   │   │   ├── SearchPanel.tsx  # 搜索面板（219 行）
│   │   │   └── index.ts
│   │   ├── tools/              # 工具可视化（4 个文件）
│   │   │   ├── ToolCallCard.tsx # 工具卡片（175 行）
│   │   │   ├── BashOutput.tsx   # 终端输出（83 行）
│   │   │   └── FileDiff.tsx     # 文件差异（66 行）
│   │   ├── file-tree/          # 文件树（3 个文件）
│   │   │   ├── FileTreePanel.tsx # 文件树面板（153 行）
│   │   │   ├── FileTreeNode.tsx # 文件节点（116 行）
│   │   │   └── FilePreview.tsx  # 文件预览（148 行）
│   │   ├── session/            # 会话管理（1 个文件）
│   │   │   └── SessionPanel.tsx # 会话面板（129 行）
│   │   ├── settings/           # 设置面板（11 个文件）
│   │   │   ├── SettingsPanel.tsx # 设置容器（117 行）
│   │   │   ├── GeneralSettings.tsx # 通用设置（433 行）
│   │   │   ├── ModelSelector.tsx # 模型选择（113 行）
│   │   │   ├── ProviderSettings.tsx # 供应商设置（358 行）
│   │   │   ├── AgentSettings.tsx
│   │   │   ├── PermissionSettings.tsx
│   │   │   ├── SkillsSettings.tsx
│   │   │   ├── InstructionsSettings.tsx
│   │   │   ├── CompactionSettings.tsx
│   │   │   ├── ExperimentalSettings.tsx
│   │   │   ├── ConfigEditor.tsx
│   │   │   └── TemplateSettings.tsx
│   │   ├── memory/             # 记忆面板（1 个文件）
│   │   │   └── MemoryPanel.tsx  # 记忆管理（207 行）
│   │   ├── skills/             # 技能面板（1 个文件）
│   │   │   └── SkillPanel.tsx   # 技能管理（306 行）
│   │   ├── snippets/           # 代码收藏（1 个文件）
│   │   │   └── SnippetPanel.tsx # 收藏管理（220 行）
│   │   ├── lsp/                # LSP 诊断（1 个文件）
│   │   │   └── DiagnosticsPanel.tsx # 诊断面板（241 行）
│   │   ├── mcp/                # MCP 管理（1 个文件）
│   │   │   └── MCPPanel.tsx    # MCP 管理面板（384 行）
│   │   ├── tts/                # TTS 朗读（3 个文件）
│   │   │   ├── TTSPanel.tsx    # TTS 容器（52 行）
│   │   │   ├── SimpleTTS.tsx   # 简单朗读（183 行）
│   │   │   └── NovelReader.tsx  # 小说朗读（440 行）
│   │   └── onboarding/         # 新手引导（1 个文件）
│   │       └── OnboardingWizard.tsx # 引导流程（230 行）
│   ├── hooks/                  # React Hooks（12 个文件）
│   │   ├── useMimo.ts          # IPC 通信核心（30 行）
│   │   ├── useChat.ts          # CLI 聊天（235 行）
│   │   ├── useBaseChat.ts      # 聊天基类（191 行）
│   │   ├── useSkill.ts         # 技能操作（104 行）
│   │   ├── useMemory.ts        # 记忆操作（95 行）
│   │   ├── useTTS.ts           # 语音合成（63 行）
│   │   ├── useVoiceInput.ts    # 语音输入（128 行）
│   │   ├── useClipboard.ts     # 剪贴板（24 行）
│   │   ├── useConfirm.ts       # 确认对话框（9 行）
│   │   ├── useNotification.ts  # 系统通知（23 行）
│   │   ├── useKeyboardShortcuts.ts # 键盘快捷键（49 行）
│   │   └── useSafeInvoke.ts    # 安全调用（28 行）
│   ├── stores/                 # Zustand 状态管理（9 个文件）
│   │   ├── tabStore.ts         # 多标签页（160 行）
│   │   ├── sessionStore.ts     # 会话状态（66 行）
│   │   ├── themeStore.ts       # 主题切换（19 行）
│   │   ├── shortcutStore.ts    # 快捷键（36 行）
│   │   ├── toastStore.ts       # Toast 通知（25 行）
│   │   ├── snippetStore.ts     # 代码收藏（46 行）
│   │   ├── templateStore.ts    # 模板管理（46 行）
│   │   ├── memoryStore.ts      # 记忆状态（37 行）
│   │   └── skillStore.ts       # 技能状态（41 行）
│   └── test-setup.ts           # 测试配置
├── electron-builder.yml        # 打包配置
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TS 配置（strict: true）
└── package.json                # 项目依赖
```

### 核心架构

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Main Process                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐     │
│  │ ProcessMgr  │  │ APIManager   │  │ ConfigMgr  │     │
│  │ (CLI+队列)  │  │ (HTTP直连)   │  │ (JSONC R/W)│     │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘     │
│         │                │                 │            │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌─────┴──────┐     │
│  │ SessionMgr  │  │ FileManager  │  │ MemoryMgr  │     │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘     │
│         │                │                 │            │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌─────┴──────┐     │
│  │ SkillMgr    │  │ LSPManager   │  │ MCPManager │     │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘     │
│         │                │                 │            │
│         └────────────────┼─────────────────┘            │
│                          │ IPC (contextBridge)           │
│                    ┌─────┴──────┐                        │
│                    │ IPCValidator│ (输入白名单)           │
│                    └─────┬──────┘                        │
├──────────────────────────┼─────────────────────────────┤
│                   Renderer Process                       │
│  ┌───────────────────────┴───────────────────────┐      │
│  │              React 19 + TypeScript 6 UI       │      │
│  │  ┌──────┐ ┌───────┐ ┌──────┐ ┌────────────┐  │      │
│  │  │ Chat │ │Tabs   │ │Tools │ │  Settings   │  │      │
│  │  │  UI  │ │ Store │ │Panel │ │   Panel     │  │      │
│  │  └──┬───┘ └───────┘ └──────┘ └────────────┘  │      │
│  │     │                                         │      │
│  │  ┌──┴───┐ ┌───────┐ ┌──────┐ ┌────────────┐  │      │
│  │  │File  │ │Memory │ │Skill │ │   MCP/LSP   │  │      │
│  │  │Tree  │ │Panel  │ │Panel │ │   Panels    │  │      │
│  │  └──────┘ └───────┘ └──────┘ └────────────┘  │      │
│  │         Vite 8 + Tailwind 3 + Zustand 5      │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → ChatInput → useChat.send() → useMimo.invoke()
  → preload.ts (IPC) → ipc-handlers.ts (路由)
  → ProcessManager (CLI) 或 APIManager (HTTP直连)
  → 事件流 → useMimo.subscribe() → useChat (状态更新)
  → React 重渲染 → MessageBubble (Markdown 渲染)
```

### 双通信模式

1. **CLI 模式**: ProcessManager 通过 `mimo run` 命令与 MimoCode CLI 交互，支持消息队列和优先级排序
2. **API 直连模式**: APIManager 通过 HTTP SSE 直接调用 OpenAI 兼容 API，支持流式响应和工具调用

---

## 已实现功能

### 核心聊天

- ✅ Markdown 渲染（react-markdown + remark-gfm）
- ✅ 代码语法高亮（react-syntax-highlighter + Prism）
- ✅ 代码块复制 + 收藏
- ✅ 消息复制、编辑、删除、重新生成
- ✅ 消息时间戳
- ✅ 消息高亮跳转（搜索→消息定位）
- ✅ 流式响应 + 打字机效果
- ✅ AI 思考动画指示器
- ✅ 中断生成（停止按钮）
- ✅ 消息撤销（Ctrl+Z）

### 多标签页

- ✅ 多标签页管理（tabStore）
- ✅ 标签页拖拽排序
- ✅ 标签页重命名（双击）
- ✅ 消息持久化到 localStorage
- ✅ Agent 模式独立切换

### 输入功能

- ✅ `/` 命令菜单（10 个命令）
- ✅ `@` 文件引用（读取文件内容作为上下文）
- ✅ 文件拖拽到聊天
- ✅ 图片粘贴 + 预览
- ✅ 语音输入（Web Speech API）
- ✅ 模板菜单（8 个内置模板 + 自定义）
- ✅ Shift+Enter 换行提示
- ✅ 队列状态显示

### 侧边栏面板

- ✅ 文件树（懒加载，隐藏依赖/构建文件）
- ✅ 文件预览（行号，LSP 自动启动）
- ✅ 对话历史（搜索、导入 Markdown）
- ✅ 代码收藏（搜索、编辑、复制）
- ✅ 全文搜索（所有对话内容，分页）
- ✅ 记忆管理（CRUD + 自动提取）
- ✅ 技能管理（分类、搜索、使用统计）
- ✅ LSP 诊断面板（启动/停止服务器）
- ✅ MCP 管理面板（添加/删除/启动/停止服务器，工具测试）
- ✅ TTS 朗读（简单朗读 + 小说朗读模式）
- ✅ 设置面板（11 个 Tab）

### 设置系统

- ✅ 通用设置（用户名、Shell、日志级别、自动更新）
- ✅ 模型选择器（搜索、切换）
- ✅ 供应商管理（6 家：OpenAI、Anthropic、Google、Xiaomi、DeepSeek、OpenRouter）
- ✅ API Key 配置 + 验证
- ✅ Agent 设置
- ✅ 权限设置
- ✅ 技能设置
- ✅ 指令设置
- ✅ 压缩设置
- ✅ 实验性功能
- ✅ JSONC 配置编辑器
- ✅ 模板管理

### 工程化

- ✅ ESLint + Prettier 统一代码风格
- ✅ Husky + lint-staged 提交检查
- ✅ CSP 策略（开发/生产双模式）
- ✅ contextIsolation + nodeIntegration: false
- ✅ IPC 输入验证（ipc-validator.ts）
- ✅ IPC 白名单（preload.ts）
- ✅ ErrorBoundary（全局 + 应用层）
- ✅ 结构化日志（debug.ts，文件持久化）
- ✅ 崩溃上报（crashReporter）
- ✅ 自动更新（electron-updater）
- ✅ 系统托盘（隐藏到托盘、上下文菜单）
- ✅ 全局快捷键（可自定义）
- ✅ 窗口状态持久化（位置、大小）
- ✅ 单实例锁
- ✅ Vite chunk 优化（7 个 vendor chunk）
- ✅ 代码分割（React.lazy 懒加载 5 个面板）
- ✅ 291 个单元测试全部通过

### 安全

- ✅ sandbox: true
- ✅ contextIsolation: true
- ✅ nodeIntegration: false
- ✅ IPC 白名单验证
- ✅ 路径遍历防护（`..` 和 `\0` 检查）
- ✅ Session ID 正则验证
- ✅ Config Key 格式验证
- ✅ 消息长度限制（100KB）
- ✅ 链接安全过滤（XSS 防护）
- ✅ 生产环境 CSP 头（X-Content-Type-Options, X-Frame-Options, Referrer-Policy）

---

## 测试覆盖

### 测试文件（12 个，291 个测试）

| 文件                               | 测试数 | 覆盖模块        |
| ---------------------------------- | ------ | --------------- |
| `electron/ipc-validator.test.ts`   | 84     | IPC 输入验证    |
| `electron/memory-manager.test.ts`  | 39     | 记忆管理        |
| `electron/process-manager.test.ts` | 26     | 进程管理 + 队列 |
| `electron/file-manager.test.ts`    | 24     | 文件树          |
| `electron/skill-manager.test.ts`   | 23     | 技能管理        |
| `electron/config-manager.test.ts`  | 20     | 配置管理        |
| `electron/mcp-manager.test.ts`     | 15     | MCP 协议        |
| `electron/debug.test.ts`           | 15     | 日志系统        |
| `src/hooks/useBaseChat.test.ts`    | 14     | 聊天基类        |
| `electron/session-manager.test.ts` | 13     | 会话管理        |
| `electron/api-response.test.ts`    | 11     | 统一响应        |
| `electron/lsp-manager.test.ts`     | 7      | LSP 协议        |

---

## 已知问题

### 1. 部分组件缺少单元测试

- 前端组件（React）无测试覆盖
- 部分 hooks（useChat、useSkill、useMemory）无测试

### 2. useSafeInvoke 有冗余导入

- `src/hooks/useSafeInvoke.ts:13` 动态导入 useMimo 但未使用，直接调用 window.mimoAPI

### 3. SessionManager SQL 注入风险

- `electron/session-manager.ts:59` SQL 查询使用字符串拼接（已通过 sanitizeSessionId 正则防护）

### 4. 部分 console.error 未替换

- `electron/main.ts:39,48,109,122` 使用 console.error 而非 debug.error
- `src/components/chat/SearchPanel.tsx:80` 使用 console.error
- `src/components/file-tree/FileTreePanel.tsx:33,55` 使用 console.error
- `src/components/session/SessionPanel.tsx:32` 使用 window.confirm
- 多个 hooks 中使用 console.error（useSkill、useMemory 等）

### 5. useConfirm 使用原生 window.confirm

- `src/hooks/useConfirm.ts` 和 `MemoryPanel.tsx:175` 直接调用 window.confirm

### 6. 无 i18n 框架

- 界面硬编码中文字符串

### 7. 无 E2E 测试

- 缺少 Playwright 或类似 E2E 测试

### 8. electron-builder 配置

- 缺少 mac/linux 配置
- resources/icon.ico 可能不存在

---

## 运行方式

### 开发模式

```bash
cd D:\AI\code\mimo-desktop
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

```bash
npm run dist
```

### 测试

```bash
npm test          # 运行所有测试
npm run test:watch # 监听模式
npm run lint       # ESLint 检查
npm run format     # Prettier 格式化
```

---

## 关键配置

### Vite 分块策略

- `vendor-react`: React + ReactDOM
- `vendor-charts`: Recharts
- `vendor-markdown`: react-markdown + remark-gfm + react-syntax-highlighter
- `vendor-ui`: lucide-react + clsx + tailwind-merge
- `vendor-state`: Zustand
- `vendor-jsonc`: jsonc-parser
- `vendor-acp`: @agentclientprotocol/sdk
- `vendor`: 其他 node_modules

### TypeScript 配置

- strict: true（已启用）
- target: ES2022
- module: ESNext
- moduleResolution: bundler

### Electron 安全配置

- sandbox: true
- contextIsolation: true
- nodeIntegration: false
- preload.js 桥接

---

## 依赖清单

### 核心依赖

- `react` ^19.2.7 + `react-dom` ^19.2.7
- `zustand` ^5.0.14 - 状态管理
- `clsx` ^2.1.1 + `tailwind-merge` ^3.6.0 - 样式工具
- `lucide-react` ^1.18.0 - 图标库
- `jsonc-parser` ^3.3.1 - JSONC 解析
- `@agentclientprotocol/sdk` ^0.26.0 - ACP 协议

### UI 依赖

- `react-markdown` ^10.1.0 + `remark-gfm` ^4.0.1 - Markdown 渲染
- `react-syntax-highlighter` ^16.1.1 - 代码高亮
- `recharts` ^3.8.1 - 图表库
- `i18next` ^26.3.1 + `react-i18next` ^17.0.8 - 国际化
- `electron-updater` ^6.8.9 - 自动更新

### 开发依赖

- `electron` ^42.4.0
- `vite` ^8.0.16 + `@vitejs/plugin-react` ^6.0.2
- `typescript` ^6.0.3
- `tailwindcss` ^3.4.19
- `vitest` ^4.1.9 + `@testing-library/react` ^16.3.2
- `eslint` ^9.39.4 + `prettier` ^3.8.4
- `husky` ^9.1.7 + `lint-staged` ^17.0.7
- `electron-builder` ^26.15.3
