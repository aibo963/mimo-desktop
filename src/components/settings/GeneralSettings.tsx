import { useState, useEffect, useCallback } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { useShortcutStore } from '@/stores/shortcutStore'
import { useToastStore } from '@/stores/toastStore'
import {
  Settings,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  RotateCcw,
  Keyboard,
  Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { debug } from '@/lib/debug'

interface GeneralConfig {
  shell?: string
  logLevel?: string
  username?: string
  share?: string
  autoupdate?: boolean | string
  snapshot?: boolean
  small_model?: string
  default_agent?: string
}

interface GlobalShortcut {
  id: string
  label: string
  keys: string
  action: string
  enabled: boolean
}

function parseBoolConfig(value: boolean | string | undefined, defaultTrue = true): boolean {
  if (value === false || value === 'false') return false
  if (value === true || value === 'true') return true
  return defaultTrue
}

export function GeneralSettings() {
  const [config, setConfig] = useState<GeneralConfig>({})
  const [loading, setLoading] = useState(false)
  const [globalShortcuts, setGlobalShortcuts] = useState<GlobalShortcut[]>([])
  const addToast = useToastStore((state) => state.addToast)
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const { invoke } = useMimo()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const fullConfig = await invoke({ action: 'get_config' })
      if (fullConfig) {
        setConfig({
          shell: fullConfig.shell,
          logLevel: fullConfig.logLevel,
          username: fullConfig.username,
          share: fullConfig.share,
          autoupdate: fullConfig.autoupdate,
          snapshot: fullConfig.snapshot,
          small_model: fullConfig.small_model,
          default_agent: fullConfig.default_agent,
        })
      }
      // Load global shortcuts
      try {
        const shortcuts = await window.electronAPI?.invoke('global-shortcuts:get')
        if (shortcuts) setGlobalShortcuts(shortcuts)
      } catch (e) {
        debug.error('Failed to load global shortcuts:', e)
      }
      // Load tray settings
      try {
        const settings = await window.electronAPI?.invoke('tray:getSettings')
        if (settings) setMinimizeToTray(settings.minimizeToTray)
      } catch (e) {
        debug.error('Failed to load tray settings:', e)
      }
    } catch (error) {
      debug.error('Failed to load general config:', error)
    } finally {
      setLoading(false)
    }
  }, [invoke])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleUpdate = useCallback(
    async (key: string, value: any) => {
      const prevValue = config[key as keyof GeneralConfig]
      setConfig((prev) => ({ ...prev, [key]: value }))
      try {
        await invoke({ action: 'set_config', key, value })
      } catch (error: any) {
        debug.error('Failed to update config:', error)
        setConfig((prev) => ({ ...prev, [key]: prevValue }))
        addToast(`设置保存失败: ${error.message}`, 'error')
      }
    },
    [config, invoke, addToast]
  )

  const handleGlobalShortcutUpdate = useCallback(
    async (id: string, keys: string) => {
      try {
        await window.electronAPI?.invoke('global-shortcuts:update', id, keys)
        setGlobalShortcuts((prev) => prev.map((s) => (s.id === id ? { ...s, keys } : s)))
        addToast('快捷键已更新', 'success')
      } catch (error: any) {
        debug.error('Failed to update global shortcut:', error)
        addToast(`快捷键更新失败: ${error.message}`, 'error')
      }
    },
    [addToast]
  )

  const handleGlobalShortcutToggle = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await window.electronAPI?.invoke('global-shortcuts:toggle', id, enabled)
        setGlobalShortcuts((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
      } catch (error: any) {
        debug.error('Failed to toggle global shortcut:', error)
        addToast(`快捷键切换失败: ${error.message}`, 'error')
      }
    },
    [addToast]
  )

  const handleGlobalShortcutReset = useCallback(async () => {
    try {
      await window.electronAPI?.invoke('global-shortcuts:reset')
      const shortcuts = await window.electronAPI?.invoke('global-shortcuts:get')
      if (shortcuts) setGlobalShortcuts(shortcuts)
      addToast('快捷键已重置', 'success')
    } catch (error: any) {
      debug.error('Failed to reset global shortcuts:', error)
      addToast(`快捷键重置失败: ${error.message}`, 'error')
    }
  }, [addToast])

  const handleMinimizeToTray = useCallback(
    async (value: boolean) => {
      setMinimizeToTray(value)
      try {
        await window.electronAPI?.invoke('tray:setSettings', { minimizeToTray: value })
      } catch (error: any) {
        debug.error('Failed to update tray settings:', error)
        addToast(`托盘设置更新失败: ${error.message}`, 'error')
      }
    },
    [addToast]
  )

  // Keyboard event handler for recording shortcuts
  useEffect(() => {
    if (!editingShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setEditingShortcut(null)
        return
      }

      // Build key string
      const parts: string[] = []
      if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')

      const key = e.key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key.length === 1 ? key.toUpperCase() : key)
        const keyStr = parts.join('+')
        handleGlobalShortcutUpdate(editingShortcut, keyStr)
        setEditingShortcut(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [editingShortcut, handleGlobalShortcutUpdate])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">通用设置</span>
        </div>
        <button
          onClick={loadConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">用户名</label>
          <input
            type="text"
            value={config.username ?? ''}
            onChange={(e) => handleUpdate('username', e.target.value || undefined)}
            placeholder="系统用户名"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">默认 Shell</label>
          <input
            type="text"
            value={config.shell ?? ''}
            onChange={(e) => handleUpdate('shell', e.target.value || undefined)}
            placeholder="系统默认"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">小模型</label>
          <input
            type="text"
            value={config.small_model ?? ''}
            onChange={(e) => handleUpdate('small_model', e.target.value || undefined)}
            placeholder="用于标题生成等轻量任务"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">默认 Agent</label>
          <select
            value={config.default_agent ?? ''}
            onChange={(e) => handleUpdate('default_agent', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">build (默认)</option>
            <option value="build">build</option>
            <option value="plan">plan</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">日志级别</label>
          <select
            value={config.logLevel ?? ''}
            onChange={(e) => handleUpdate('logLevel', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">默认</option>
            <option value="DEBUG">DEBUG</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">分享模式</label>
          <select
            value={config.share ?? ''}
            onChange={(e) => handleUpdate('share', e.target.value || undefined)}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="">默认 (manual)</option>
            <option value="manual">手动</option>
            <option value="auto">自动</option>
            <option value="disabled">禁用</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">自动更新</label>
            <p className="text-xs text-zinc-500">自动检查并更新版本</p>
          </div>
          <button
            onClick={() => handleUpdate('autoupdate', !parseBoolConfig(config.autoupdate, true))}
            className={cn(
              'p-0.5 rounded transition-colors',
              parseBoolConfig(config.autoupdate, true) ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {parseBoolConfig(config.autoupdate, true) ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">快照追踪</label>
            <p className="text-xs text-zinc-500">记录文件系统快照用于撤销</p>
          </div>
          <button
            onClick={() => handleUpdate('snapshot', !parseBoolConfig(config.snapshot, true))}
            className={cn(
              'p-0.5 rounded transition-colors',
              parseBoolConfig(config.snapshot, true) ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {parseBoolConfig(config.snapshot, true) ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* System Tray Settings */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">系统托盘</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-zinc-300">关闭时最小化到托盘</label>
            <p className="text-xs text-zinc-500">点击关闭按钮时隐藏到系统托盘而非退出</p>
          </div>
          <button
            onClick={() => handleMinimizeToTray(!minimizeToTray)}
            className={cn(
              'p-0.5 rounded transition-colors',
              minimizeToTray ? 'text-emerald-400' : 'text-zinc-500'
            )}
          >
            {minimizeToTray ? (
              <ToggleRight className="w-8 h-5" />
            ) : (
              <ToggleLeft className="w-8 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Global Shortcuts */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">全局快捷键</span>
          </div>
          <button
            onClick={handleGlobalShortcutReset}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
            title="重置默认快捷键"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-zinc-600">
          全局快捷键在应用未聚焦时也能生效。点击快捷键可重新录制。
        </p>

        <div className="space-y-2">
          {globalShortcuts.map((shortcut) => (
            <div key={shortcut.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGlobalShortcutToggle(shortcut.id, !shortcut.enabled)}
                  className={cn(
                    'p-0.5 rounded transition-colors',
                    shortcut.enabled ? 'text-emerald-400' : 'text-zinc-600'
                  )}
                >
                  {shortcut.enabled ? (
                    <ToggleRight className="w-6 h-4" />
                  ) : (
                    <ToggleLeft className="w-6 h-4" />
                  )}
                </button>
                <span
                  className={cn('text-xs', shortcut.enabled ? 'text-zinc-300' : 'text-zinc-600')}
                >
                  {shortcut.label}
                </span>
              </div>
              <button
                onClick={() => setEditingShortcut(shortcut.id)}
                className={cn(
                  'w-36 px-2 py-1 rounded border text-xs font-mono text-center transition-colors',
                  editingShortcut === shortcut.id
                    ? 'bg-emerald-900/50 border-emerald-600 text-emerald-300 animate-pulse'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {editingShortcut === shortcut.id
                  ? '按下快捷键...'
                  : shortcut.keys.replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Renderer Shortcuts */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">应用内快捷键</span>
          </div>
          <button
            onClick={() => useShortcutStore.getState().resetShortcuts()}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
            title="重置默认快捷键"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {useShortcutStore((s) => s.shortcuts).map((shortcut) => (
            <div key={shortcut.id} className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{shortcut.label}</span>
              <input
                type="text"
                value={shortcut.keys}
                onChange={(e) => {
                  const newKeys = e.target.value
                  useShortcutStore.getState().updateShortcut(shortcut.id, newKeys)
                }}
                className="w-32 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono text-center focus:outline-none focus:border-zinc-600"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
