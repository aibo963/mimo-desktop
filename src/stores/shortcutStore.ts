import { create } from 'zustand'

interface Shortcut {
  id: string
  label: string
  keys: string
  action: string
}

const defaultShortcuts: Shortcut[] = [
  { id: 'send', label: '发送消息', keys: 'Enter', action: 'send' },
  { id: 'newline', label: '换行', keys: 'Shift+Enter', action: 'newline' },
  { id: 'clear', label: '清空对话', keys: 'Ctrl+Shift+Delete', action: 'clear' },
  { id: 'search', label: '搜索会话', keys: 'Ctrl+K', action: 'search' },
  { id: 'theme', label: '切换主题', keys: 'Ctrl+Shift+T', action: 'theme' },
  { id: 'settings', label: '打开设置', keys: 'Ctrl+,', action: 'settings' },
]

interface ShortcutStore {
  shortcuts: Shortcut[]
  updateShortcut: (id: string, keys: string) => void
  resetShortcuts: () => void
}

export const useShortcutStore = create<ShortcutStore>((set) => ({
  shortcuts: JSON.parse(localStorage.getItem('shortcuts') || 'null') || defaultShortcuts,
  updateShortcut: (id, keys) =>
    set((state) => {
      const updated = state.shortcuts.map((s) => (s.id === id ? { ...s, keys } : s))
      localStorage.setItem('shortcuts', JSON.stringify(updated))
      return { shortcuts: updated }
    }),
  resetShortcuts: () => {
    localStorage.removeItem('shortcuts')
    set({ shortcuts: defaultShortcuts })
  },
}))
