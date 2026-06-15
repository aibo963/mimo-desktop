import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs'

let tray: InstanceType<typeof Tray> | null = null

export function createTray(window: BrowserWindow): void {
  let icon: Electron.NativeImage
  
  const iconPath = path.join(__dirname, '../resources/icon.png')
  const svgPath = path.join(__dirname, '../resources/icon.svg')
  
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath)
  } else if (fs.existsSync(svgPath)) {
    icon = nativeImage.createFromPath(svgPath)
  } else {
    icon = nativeImage.createEmpty()
  }

  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        window.show()
        window.focus()
      },
    },
    { type: 'separator' },
    {
      label: '新对话',
      click: () => {
        window.show()
        window.focus()
        window.webContents.send('mimo:event', {
          type: 'session_update',
          data: { action: 'new' },
          timestamp: Date.now(),
        })
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('Mimo Desktop')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (window.isVisible()) {
      window.focus()
    } else {
      window.show()
    }
  })
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
