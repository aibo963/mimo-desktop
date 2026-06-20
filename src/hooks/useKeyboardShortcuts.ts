import { useEffect } from 'react'
import { useShortcutStore } from '../stores/shortcutStore'

interface ShortcutHandlers {
  onClear?: () => void
  onTheme?: () => void
  onSearch?: () => void
  onSettings?: () => void
}

function parseKeys(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
  const parts = keys.toLowerCase().split('+')
  return {
    ctrl: parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.find((p) => !['ctrl', 'cmd', 'shift', 'alt'].includes(p)) || '',
  }
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const shortcuts = useShortcutStore((s) => s.shortcuts)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const parsed = parseKeys(shortcut.keys)
        if (
          parsed.ctrl === (e.ctrlKey || e.metaKey) &&
          parsed.shift === e.shiftKey &&
          parsed.alt === e.altKey &&
          parsed.key === e.key.toLowerCase()
        ) {
          e.preventDefault()
          switch (shortcut.action) {
            case 'clear':
              handlers.onClear?.()
              break
            case 'theme':
              handlers.onTheme?.()
              break
            case 'search':
              handlers.onSearch?.()
              break
            case 'settings':
              handlers.onSettings?.()
              break
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, handlers])
}
