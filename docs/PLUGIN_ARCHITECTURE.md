# Mimo Desktop 插件系统架构设计

> 设计日期：2026-06-20
> 状态：设计阶段，待实现

---

## 1. 设计目标

为 Mimo Desktop 提供可扩展的插件系统，允许第三方开发者通过标准接口扩展应用功能。

**核心能力：**

- 插件安装/卸载/启用/禁用
- 动态注册 UI 面板、侧边栏按钮、设置项
- 插件与宿主的安全通信
- 插件权限控制

---

## 2. 插件清单格式

每个插件根目录包含 `plugin.json`：

```json
{
  "id": "com.example.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名",
  "minAppVersion": "0.2.0",
  "apiVersion": 1,
  "permissions": ["chat:read", "config:read", "file:read"],
  "entry": {
    "main": "./dist/main.js",
    "renderer": "./dist/renderer.js"
  },
  "ui": {
    "sidebar": [{ "id": "my-panel", "label": "我的工具", "icon": "Wrench", "width": 400 }],
    "settings": [{ "id": "my-settings", "label": "插件设置" }]
  },
  "commands": [{ "id": "my-command", "label": "执行操作", "shortcut": "Ctrl+Shift+M" }],
  "hooks": ["onMessage", "onSessionChange"]
}
```

---

## 3. 目录结构

```
~/.mimo-desktop/
  plugins/
    com.example.my-plugin/
      plugin.json          # 插件清单
      dist/
        main.js            # 主进程入口
        renderer.js        # 渲染进程入口
      node_modules/        # 插件依赖
```

---

## 4. 核心模块

### 4.1 PluginManager（主进程）

```typescript
// electron/plugin-manager.ts
class PluginManager {
  private plugins: Map<string, PluginInstance>
  private pluginsDir: string

  // 发现与加载
  scanPlugins(): PluginManifest[]
  loadPlugin(manifest: PluginManifest): Promise<PluginInstance>
  unloadPlugin(id: string): Promise<void>

  // 生命周期
  activate(id: string): Promise<void>
  deactivate(id: string): Promise<void>
  install(source: string): Promise<void>
  uninstall(id: string): Promise<void>

  // 事件
  on(event: 'plugin-activated', cb: (id: string) => void): void
  on(event: 'plugin-error', cb: (id: string, error: Error) => void): void
}
```

### 4.2 PluginAPI（插件宿主接口）

```typescript
// electron/plugin-api.ts
interface PluginHostAPI {
  // 生命周期
  onActivate(callback: () => void | Promise<void>): Disposable
  onDeactivate(callback: () => void | Promise<void>): Disposable

  // 聊天集成
  onMessage(callback: (msg: ChatMessage) => void): Disposable
  sendMessage(text: string): void

  // 配置
  getConfig(pluginId: string): Record<string, any>
  setConfig(pluginId: string, key: string, value: any): void

  // UI 注册
  registerPanel(config: PanelConfig): Disposable
  registerCommand(config: CommandConfig): Disposable
  registerSettings(config: SettingsConfig): Disposable

  // 状态
  getState<T>(key: string): T | undefined
  setState<T>(key: string, value: T): void

  // 日志
  log(message: string): void
  error(message: string): void
}
```

### 4.3 插件清单类型

```typescript
// electron/types/plugin.ts
interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  minAppVersion: string
  apiVersion: number
  permissions: PluginPermission[]
  entry: { main: string; renderer?: string }
  ui?: {
    sidebar?: SidebarConfig[]
    settings?: SettingsConfig[]
  }
  commands?: CommandConfig[]
  hooks?: string[]
}

type PluginPermission =
  | 'chat:read'
  | 'chat:write'
  | 'config:read'
  | 'config:write'
  | 'file:read'
  | 'file:write'
  | 'session:read'
  | 'session:write'
  | 'network'
  | 'mcp'

interface SidebarConfig {
  id: string
  label: string
  icon: string
  width?: number
}

interface CommandConfig {
  id: string
  label: string
  shortcut?: string
}

interface SettingsConfig {
  id: string
  label: string
}
```

---

## 5. IPC 扩展

新增 IPC 命令：

| 命令                  | 说明           |
| --------------------- | -------------- |
| `plugin:list`         | 列出已安装插件 |
| `plugin:install`      | 从路径安装插件 |
| `plugin:uninstall`    | 卸载插件       |
| `plugin:enable`       | 启用插件       |
| `plugin:disable`      | 禁用插件       |
| `plugin:get_manifest` | 获取插件清单   |
| `plugin:send`         | 向插件发送消息 |
| `plugin:invoke`       | 调用插件命令   |

---

## 6. 渲染进程集成

### 6.1 动态面板注册

```typescript
// src/stores/pluginStore.ts
interface PluginPanel {
  id: string
  pluginId: string
  label: string
  icon: string
  width: number
}

interface PluginStore {
  panels: PluginPanel[]
  commands: PluginCommand[]
  registerPanel(panel: PluginPanel): void
  unregisterPanel(id: string): void
}
```

### 6.2 App.tsx 改造

将硬编码的 `RightPanel` 改为动态注册：

```typescript
// 改造前
type RightPanel = 'history' | 'snippets' | ... // 硬编码

// 改造后
const builtinPanels = ['history', 'snippets', ...] // 内置面板
const pluginPanels = usePluginStore(s => s.panels) // 插件面板
const allPanels = [...builtinPanels, ...pluginPanels.map(p => p.id)]
```

### 6.3 Sidebar 动态渲染

```typescript
// 内置按钮 + 插件按钮
const navItems = [
  ...builtinNavItems,
  ...pluginPanels.map((p) => ({
    id: p.id,
    icon: resolveIcon(p.icon),
    label: p.label,
    active: activePanel === p.id,
    onClick: () => togglePanel(p.id),
  })),
]
```

---

## 7. 安全模型

### 7.1 权限审批

插件安装时展示所需权限，用户逐一审批：

```
┌─────────────────────────────────────┐
│  安装 "My Plugin" v1.0.0            │
│                                     │
│  需要以下权限：                      │
│  ☑ chat:read   - 读取聊天消息       │
│  ☑ config:read - 读取配置           │
│  ☐ file:write  - 写入文件           │
│                                     │
│  [拒绝]              [安装]         │
└─────────────────────────────────────┘
```

### 7.2 运行时隔离

- 插件主进程代码在 `vm.createContext()` 中执行
- 插件无权访问 `require()`、`process`、`fs` 等 Node.js API
- 所有操作通过 PluginHostAPI 代理

### 7.3 配置隔离

每个插件的配置存储在独立的 `plugins/<id>/config.json` 中，互不干扰。

---

## 8. 实现计划

| 阶段     | 任务                               | 预计工时 |
| -------- | ---------------------------------- | -------- |
| 1        | PluginManager + 清单解析 + 加载器  | 4h       |
| 2        | PluginHostAPI + 生命周期钩子       | 3h       |
| 3        | IPC 扩展 + 验证器                  | 2h       |
| 4        | 渲染进程：动态面板 + 侧边栏注册    | 3h       |
| 5        | 插件管理 UI（安装/卸载/启用/禁用） | 2h       |
| 6        | 权限审批 UI                        | 1h       |
| 7        | 示例插件 + 文档                    | 2h       |
| **总计** |                                    | **~17h** |

---

## 9. 与现有系统的关系

| 现有系统    | 插件化改造                         |
| ----------- | ---------------------------------- |
| MCP 服务器  | 变为 "MCP 服务器" 类型的内置插件   |
| Skills      | 变为 "技能包" 插件，注册提示词模板 |
| TTS         | 变为内置插件                       |
| 图像生成    | 变为内置插件                       |
| LSP 集成    | 变为内置插件                       |
| 记忆/知识库 | 变为内置插件，提供 API 给其他插件  |

---

## 10. 开放问题

1. 插件是否需要签名验证？
2. 是否支持从 npm registry 安装插件？
3. 插件之间是否可以通信？
4. 是否需要插件商店/市场？
5. 插件的国际化如何处理？
