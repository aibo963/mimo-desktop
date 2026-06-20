# Mimo Desktop 代码审查报告

> 审查日期：2026-06-20
> 产品版本：0.1.0
> 代码量：~10,000 行 TypeScript（electron + src）
> 测试覆盖：291 个测试，12 个测试文件

---

## 一、架构评审

### ✅ 做得好的地方

1. **安全架构优秀**
   - sandbox: true + contextIsolation: true + nodeIntegration: false
   - IPC 白名单验证（preload.ts ALLOWED_CHANNELS）
   - 统一输入验证层（ipc-validator.ts，360 行，覆盖所有 50+ 个 action）
   - 路径遍历防护、Session ID 正则验证、消息长度限制
   - 生产环境安全头（CSP、X-Content-Type-Options、X-Frame-Options）

2. **双通信模式设计合理**
   - CLI 模式（ProcessManager）：通过 `mimo run` 交互，支持消息队列
   - API 直连模式（APIManager）：HTTP SSE 流式响应，支持工具调用
   - 优先级切换：有 API Key 时优先使用 API 直连

3. **IPC 类型安全**
   - MimoCommand 判别联合类型（50+ 个 action）
   - MimoEvent 类型定义
   - validateCommand 返回类型安全的 MimoCommand

4. **状态管理清晰**
   - Zustand 9 个 store，职责分明
   - tabStore 支持多标签页 + 消息持久化 + 拖拽排序
   - 主题、快捷键、Toast 等全局状态独立管理

5. **日志系统完善**
   - electron/debug.ts：文件持久化，5000 条上限
   - src/lib/debug.ts：localStorage 持久化，1000 条上限
   - 条件输出：dev 模式输出到 console，prod 模式静默

6. **useBaseChat 抽象正确**
   - 消息处理逻辑（handleEvent）已从 useChat 中提取
   - 支持 CLI/API/WebUI 三种模式复用

---

### ⚠️ 需要改进的地方

#### P0 - 必须修复

**1. useSafeInvoke 有冗余代码**

- `src/hooks/useSafeInvoke.ts:13` 动态 import useMimo 但未使用
- 直接调用 window.mimoAPI.invoke，绕过了 useMimo 的事件订阅
- 建议：删除动态 import，直接使用 window.mimoAPI

**2. 部分 console.error 未使用 debug 模块**

- `electron/main.ts:39,48,109,122` - 4 处 console.error
- `src/components/chat/SearchPanel.tsx:80` - 1 处 console.error
- `src/components/file-tree/FileTreePanel.tsx:33,55` - 2 处 console.error
- `src/components/session/SessionPanel.tsx:32` - window.confirm
- 多个 hooks 中（useSkill、useMemory 等）- ~15 处 console.error
- 建议：统一使用 debug.error() 替代

**3. useConfirm 使用原生 window.confirm**

- `src/hooks/useConfirm.ts` 只是 window.confirm 的简单包装
- `MemoryPanel.tsx:175` 和 `SkillPanel.tsx:231` 直接调用 window.confirm
- 建议：实现自定义确认对话框组件

**4. MessageBubble 组件过大（444 行）**

- 包含了工具调用摘要、附件渲染、Markdown 渲染、编辑/复制/收藏/TTS/删除操作
- 建议：拆分为 ToolCallsSummary、AttachmentList、MessageActions 等子组件

**5. ChatInput 组件过大（516 行）**

- 包含了命令菜单、模板菜单、文件引用、附件预览、拖拽、粘贴等
- 建议：已合理拆分了 CommandMenu、TemplateMenu、FileMentionMenu、AttachmentPreview

#### P1 - 重要改进

**6. 缺少前端组件测试**

- 12 个测试文件全部在 electron/ 目录
- src/ 目录只有 useBaseChat.test.ts 一个测试
- 所有 React 组件（ChatPanel、MessageBubble、ChatInput 等）无测试
- 建议：至少为 useChat、useSkill、useMemory 添加测试

**7. TabBar 样式硬编码**

- `TabBar.tsx:67` 使用 dark:bg-zinc-900 但未适配 light 主题
- 多个组件存在类似的 dark/light 适配不一致

**8. 部分组件缺少 aria-label**

- `ChatPanel.tsx` 中部分按钮缺少 aria-label
- `TabBar.tsx` 中标签页缺少 aria-selected
- `ModelSelectorInline.tsx` 已有 aria 属性（做得好）

**9. MCPManager 事件未清理**

- `electron/mcp-manager.ts` 继承 EventEmitter，但 destroy() 未调用 removeAllListeners()

**10. ConfigManager.set() 非原子操作**

- 读取-修改-写入不是原子操作，多窗口可能竞争
- 建议：使用文件锁或 atomic write

#### P2 - 体验优化

**11. 缺少 i18n 框架**

- 依赖列表有 i18next + react-i18next，但未实际集成
- 界面硬编码中文字符串

**12. 缺少 E2E 测试**

- vitest 配置了 jsdom 环境，但无 Playwright E2E 测试
- 关键流程（发消息、切换标签、设置 API Key）无端到端验证

**13. 构建产物体积**

- vite.config.ts 已配置 manualChunks（7 个 vendor chunk）
- chunkSizeWarningLimit: 800KB
- 建议：实际构建后检查各 chunk 大小

**14. 缺少性能监控**

- 无 React DevTools 集成
- 无 Performance 面板
- 无法定位渲染瓶颈

**15. 缺少 Storybook**

- 无组件文档和可视化测试
- 新成员无法快速了解组件库

---

## 二、代码质量评审

### 类型安全

- ✅ TypeScript strict: true 已启用
- ✅ MimoCommand 判别联合类型完整
- ✅ Zustand store 类型定义完整
- ⚠️ 部分地方使用 `any`（如 error catch、event.data）
- ⚠️ ToolCall.input 是 Record<string, any>，缺少具体类型

### 错误处理

- ✅ ipc-validator.ts 统一验证
- ✅ api-response.ts 统一响应格式（createSuccess/createError）
- ✅ 大部分异步操作有 try-catch
- ⚠️ 部分 catch 静默吞掉错误（如 FileTreePanel）
- ⚠️ 部分错误信息直接暴露给用户（如 HTTP 状态码）

### 性能

- ✅ React.lazy 懒加载 5 个面板（Memory、Skill、Diagnostics、MCP、TTS）
- ✅ MessageBubble 使用 memo + 自定义 areEqual
- ✅ Vite chunk 分割策略
- ✅ tabStore 消息保存使用 debounce
- ⚠️ MessageList 未使用虚拟滚动（@tanstack/react-virtual 已安装但未使用）
- ⚠️ useMimo 的 globalListeners 是模块级 Set，组件卸载时不会清理

### 可访问性

- ✅ 关键交互元素有 aria-label
- ✅ MessageList 有 role="log" + aria-live="polite"
- ✅ FileTreePanel 有 role="tree"
- ⚠️ 部分动态内容缺少 aria-live
- ⚠️ 键盘导航不完整（部分菜单不支持方向键）

### 代码风格

- ✅ ESLint + Prettier 配置完整
- ✅ Husky + lint-staged 提交检查
- ✅ 一致的组件结构（props → hooks → handlers → JSX）
- ⚠️ 部分 Tailwind 类名过长（可提取为语义化类名）
- ⚠️ 部分组件文件过大（ChatInput 516 行、MessageBubble 444 行）

---

## 三、安全评审

### ✅ 已做好的安全措施

1. Electron 安全配置正确（sandbox + contextIsolation + no nodeIntegration）
2. IPC 白名单验证（preload.ts ALLOWED_CHANNELS）
3. 统一输入验证（ipc-validator.ts）
4. 路径遍历防护（`..` 和 `\0` 检查）
5. Session ID 正则验证（`/^[a-f0-9-]{1,64}$/i`）
6. Config Key 格式验证（`/^[a-zA-Z0-9._]+$/`）
7. 消息长度限制（100KB）
8. 链接安全过滤（XSS 防护）
9. 生产环境安全头
10. 文件大小限制（1MB）

### ⚠️ 安全改进建议

1. API Key 存储未加密（明文写入 JSONC 配置文件）
2. ConfigManager.set() 非原子操作（竞态条件）
3. SessionManager.getHistory() SQL 查询使用字符串拼接（已通过正则防护）
4. 无 Content-Security-Policy 的 nonce 支持
5. 无 CSRF 防护（Electron 环境风险较低）

---

## 四、功能完整性评审

### 已实现（~75%）

| 功能       | 状态 | 说明                           |
| ---------- | ---- | ------------------------------ |
| 聊天 UI    | ✅   | Markdown + 代码高亮 + 流式响应 |
| 多标签页   | ✅   | 拖拽排序 + 持久化              |
| @文件引用  | ✅   | 读取文件内容作为上下文         |
| Agent 模式 | ✅   | 切换开关 + 指示器              |
| 语音输入   | ✅   | Web Speech API                 |
| TTS 朗读   | ✅   | 简单朗读 + 小说朗读            |
| 代码收藏   | ✅   | CRUD + 搜索                    |
| 记忆系统   | ✅   | CRUD + 自动提取                |
| 技能系统   | ✅   | 分类 + 使用统计                |
| LSP 集成   | ✅   | TypeScript/JavaScript 诊断     |
| MCP 集成   | ✅   | 服务器管理 + 工具测试          |
| 设置面板   | ✅   | 11 个 Tab                      |
| 搜索功能   | ✅   | 全文搜索 + 分页                |
| 导入/导出  | ✅   | Markdown 格式                  |
| 错误边界   | ✅   | 全局 + 应用层                  |
| 系统托盘   | ✅   | 隐藏到托盘                     |
| 全局快捷键 | ✅   | 可自定义                       |
| 自动更新   | ✅   | electron-updater               |
| Onboarding | ✅   | 4 步引导流程                   |
| /命令      | ✅   | 10 个命令                      |

### 未实现

| 功能             | 优先级 | 说明                    |
| ---------------- | ------ | ----------------------- |
| i18n 国际化      | P1     | 依赖已安装未集成        |
| E2E 测试         | P1     | 无 Playwright           |
| 前端组件测试     | P1     | 仅 1 个 test 文件       |
| 虚拟滚动         | P2     | 依赖已安装未使用        |
| 自定义确认对话框 | P2     | 使用原生 window.confirm |
| 自定义主题色     | P2     | 仅 dark/light 切换      |
| 多窗口支持       | P3     | 当前单窗口              |
| 插件系统         | P3     | MCP 仅管理无扩展        |

---

## 五、竞品对标

| 能力维度   | Mimo Desktop | Cursor        | Claude Code Desktop |
| ---------- | ------------ | ------------- | ------------------- |
| AI 模型    | MiMo (小米)  | GPT-4o/Claude | Claude 4            |
| 代码编辑   | ❌ 仅预览    | ✅ 完整 IDE   | ✅ 内置编辑器       |
| Agent 能力 | ⚠️ 基础模式  | ✅ Composer   | ✅ Computer Use     |
| MCP 支持   | ✅ 完整管理  | ✅ 完整       | ✅ 第一公民         |
| 多会话     | ✅ 多标签页  | ✅ 多标签     | ✅ 多 session       |
| 文件引用   | ✅ @file     | ✅ @file      | ✅ @file            |
| 语音输入   | ✅           | ❌            | ❌                  |
| TTS 朗读   | ✅ 小说模式  | ❌            | ❌                  |
| 记忆系统   | ✅           | ❌            | ⚠️ 有限             |
| 技能系统   | ✅           | ❌            | ❌                  |
| LSP 集成   | ✅           | ✅            | ❌                  |
| 价格       | 免费         | $20/月        | $20-60/月           |

**差异化优势**：语音输入、TTS 小说朗读、记忆系统、技能系统、免费

---

## 六、改进建议优先级

### 🔴 P0 - 立即修复

1. 清理 useSafeInvoke 冗余代码
2. 统一 console.error → debug.error()
3. 实现自定义确认对话框

### 🟡 P1 - 近期完成

4. 添加前端组件测试（useChat、useSkill、useMemory）
5. 集成 i18next 国际化
6. 实现 E2E 测试（Playwright）
7. MessageBubble 组件拆分

### 🟢 P2 - 中期优化

8. 集成虚拟滚动（@tanstack/react-virtual）
9. 修复 TabBar light 主题适配
10. 添加 Storybook 组件文档
11. ConfigManager 原子写入
12. API Key 存储加密

### 🔵 P3 - 长期规划

13. 多窗口支持
14. 插件/扩展系统
15. 性能监控集成
16. 代码编辑器集成
