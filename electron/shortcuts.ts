import { globalShortcut, BrowserWindow } from 'electron'

export function registerShortcuts(window: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (window.isVisible()) {
      window.hide()
    } else {
      window.show()
      window.focus()
    }
  })

  globalShortcut.register('CommandOrControl+Shift+N', () => {
    window.show()
    window.focus()
    window.webContents.send('mimo:event', {
      type: 'session_update',
      data: { action: 'new' },
      timestamp: Date.now(),
    })
  })
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
