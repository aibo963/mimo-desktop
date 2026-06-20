import { globalShortcut, BrowserWindow, ipcMain } from 'electron'
import { createSessionUpdateEvent } from './utils/event-helper'
import { debug } from './debug'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

interface GlobalShortcut {
  id: string
  label: string
  keys: string
  action: string
  enabled: boolean
}

const defaultGlobalShortcuts: GlobalShortcut[] = [
  {
    id: 'toggle_window',
    label: '唤起/隐藏窗口',
    keys: 'CommandOrControl+Shift+M',
    action: 'toggle_window',
    enabled: true,
  },
  {
    id: 'new_session',
    label: '新建对话',
    keys: 'CommandOrControl+Shift+N',
    action: 'new_session',
    enabled: true,
  },
]

let registeredShortcuts: GlobalShortcut[] = []
let mainWindow: BrowserWindow | null = null

function getShortcutsPath(): string {
  return path.join(app.getPath('userData'), 'global-shortcuts.json')
}

function loadShortcuts(): GlobalShortcut[] {
  try {
    const shortcutsPath = getShortcutsPath()
    if (fs.existsSync(shortcutsPath)) {
      const data = fs.readFileSync(shortcutsPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e: any) {
    debug.error('[Shortcuts] load failed:', e.message)
  }
  return [...defaultGlobalShortcuts]
}

function saveShortcuts(): void {
  try {
    const shortcutsPath = getShortcutsPath()
    fs.writeFileSync(shortcutsPath, JSON.stringify(registeredShortcuts, null, 2), 'utf-8')
  } catch (e: any) {
    debug.error('[Shortcuts] save failed:', e.message)
  }
}

function doRegisterShortcuts(): void {
  for (const shortcut of registeredShortcuts) {
    if (!shortcut.enabled) continue
    try {
      const ret = globalShortcut.register(shortcut.keys, () => {
        if (!mainWindow) return
        switch (shortcut.action) {
          case 'toggle_window':
            if (mainWindow.isVisible()) {
              mainWindow.hide()
            } else {
              mainWindow.show()
              mainWindow.focus()
            }
            break
          case 'new_session':
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('mimo:event', createSessionUpdateEvent('new'))
            break
        }
      })
      if (!ret) {
        debug.error(`[Shortcuts] failed to register: ${shortcut.keys}`)
      }
    } catch (e: any) {
      debug.error(`[Shortcuts] error registering ${shortcut.keys}:`, e.message)
    }
  }
}

export function registerShortcuts(window: BrowserWindow): void {
  mainWindow = window
  registeredShortcuts = loadShortcuts()
  doRegisterShortcuts()
  registerShortcutIPC()
  debug.log(`[Shortcuts] registered ${registeredShortcuts.length} shortcuts`)
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
  mainWindow = null
}

function registerShortcutIPC(): void {
  ipcMain.handle('global-shortcuts:get', () => {
    return registeredShortcuts
  })

  ipcMain.handle('global-shortcuts:update', (_event, id: string, keys: string) => {
    const shortcut = registeredShortcuts.find((s) => s.id === id)
    if (shortcut) {
      globalShortcut.unregister(shortcut.keys)
      shortcut.keys = keys
      saveShortcuts()
      doRegisterShortcuts()
      return { status: 'ok' }
    }
    return { error: 'shortcut not found' }
  })

  ipcMain.handle('global-shortcuts:toggle', (_event, id: string, enabled: boolean) => {
    const shortcut = registeredShortcuts.find((s) => s.id === id)
    if (shortcut) {
      if (shortcut.enabled && !enabled) {
        globalShortcut.unregister(shortcut.keys)
      }
      shortcut.enabled = enabled
      saveShortcuts()
      if (enabled) {
        doRegisterShortcuts()
      }
      return { status: 'ok' }
    }
    return { error: 'shortcut not found' }
  })

  ipcMain.handle('global-shortcuts:reset', () => {
    globalShortcut.unregisterAll()
    registeredShortcuts = [...defaultGlobalShortcuts]
    saveShortcuts()
    doRegisterShortcuts()
    return { status: 'ok' }
  })
}
