import { Tray, Menu, nativeImage, BrowserWindow, app, nativeTheme } from 'electron'
import path from 'path'
import fs from 'fs'
import { createSessionUpdateEvent } from './utils/event-helper'
import { createTrayIcon } from './tray-icon'
import { debug } from './debug'

let tray: InstanceType<typeof Tray> | null = null

function getTrayIconPath(): string | null {
  const iconPath = path.join(__dirname, '../resources/icon.png')
  if (fs.existsSync(iconPath)) return iconPath
  const svgPath = path.join(__dirname, '../resources/icon.svg')
  if (fs.existsSync(svgPath)) return svgPath
  return null
}

export function createTray(window: BrowserWindow): void {
  let icon: Electron.NativeImage

  const iconPath = getTrayIconPath()
  if (iconPath) {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = createTrayIcon()
    }
  } else {
    icon = createTrayIcon()
  }

  // Resize for tray
  if (icon.getSize().width > 32) {
    icon = icon.resize({ width: 16, height: 16 })
  }

  tray = new Tray(icon)
  tray.setToolTip('Mimo Desktop')

  updateTrayMenu(window)

  tray.on('click', () => {
    if (window.isVisible()) {
      window.focus()
    } else {
      window.show()
      window.focus()
    }
  })

  // Update menu when window state changes
  window.on('show', () => updateTrayMenu(window))
  window.on('hide', () => updateTrayMenu(window))
  window.on('focus', () => updateTrayMenu(window))
  window.on('blur', () => updateTrayMenu(window))

  debug.log('[Tray] created')
}

function updateTrayMenu(window: BrowserWindow): void {
  if (!tray) return

  const isVisible = window.isVisible()
  const isFocused = window.isFocused()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mimo Desktop',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: isVisible ? '隐藏窗口' : '显示窗口',
      accelerator: 'CmdOrCtrl+Shift+M',
      click: () => {
        if (isVisible) {
          window.hide()
        } else {
          window.show()
          window.focus()
        }
      },
    },
    {
      label: '新对话',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: () => {
        window.show()
        window.focus()
        window.webContents.send('mimo:event', createSessionUpdateEvent('new'))
      },
    },
    { type: 'separator' },
    {
      label: '设置',
      click: () => {
        window.show()
        window.focus()
        window.webContents.send('mimo:event', {
          type: 'session_update',
          data: { action: 'open_settings' },
          timestamp: Date.now(),
        })
      },
    },
    { type: 'separator' },
    {
      label: '退出 Mimo',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
