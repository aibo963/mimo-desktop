import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerIPCHandlers, unregisterIPCHandlers } from './ipc-handlers'
import { ProcessManager } from './process-manager'
import { APIManager } from './api-manager'
import { SessionManager } from './session-manager'
import { ConfigManager } from './config-manager'
import { FileManager } from './file-manager'
import { AutoUpdater } from './auto-updater'
import { initCrashReporter } from './crash-reporter'
import { createTray, destroyTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'

let mainWindow: BrowserWindow | null = null
let processManager: ProcessManager | null = null
let apiManager: APIManager | null = null
let sessionManager: SessionManager | null = null
let configManager: ConfigManager | null = null
let fileManager: FileManager | null = null
let autoUpdater: AutoUpdater | null = null
let isQuitting = false
let minimizeToTray = true

const WINDOW_BOUNDS_KEY = 'windowBounds'

function getTraySettingsPath(): string {
  return path.join(app.getPath('userData'), 'tray-settings.json')
}

function loadTraySettings(): void {
  try {
    const settingsPath = getTraySettingsPath()
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      minimizeToTray = data.minimizeToTray !== false
    }
  } catch (e) {
    console.error('[Main] Failed to load tray settings', e)
  }
}

function saveTraySettings(): void {
  try {
    const settingsPath = getTraySettingsPath()
    fs.writeFileSync(settingsPath, JSON.stringify({ minimizeToTray }, null, 2), 'utf-8')
  } catch (e) {
    console.error('[Main] Failed to save tray settings', e)
  }
}

function registerTraySettings(): void {
  ipcMain.handle('tray:getSettings', () => {
    return { minimizeToTray }
  })

  ipcMain.handle('tray:setSettings', (_event, settings: { minimizeToTray?: boolean }) => {
    if (settings.minimizeToTray !== undefined) {
      minimizeToTray = settings.minimizeToTray
      saveTraySettings()
    }
    return { status: 'ok' }
  })
}

function registerWindowControls() {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })
}

function unregisterWindowControls() {
  ipcMain.removeHandler('window:minimize')
  ipcMain.removeHandler('window:maximize')
  ipcMain.removeHandler('window:close')
}

function registerUpdateHandlers() {
  ipcMain.handle('update:check', () => autoUpdater?.checkForUpdates())
  ipcMain.handle('update:download', () => autoUpdater?.downloadUpdate())
  ipcMain.handle('update:install', () => autoUpdater?.quitAndInstall())
}

function unregisterUpdateHandlers() {
  ipcMain.removeHandler('update:check')
  ipcMain.removeHandler('update:download')
  ipcMain.removeHandler('update:install')
}

function getSavedBounds(): Electron.Rectangle | null {
  try {
    const configPath = path.join(app.getPath('userData'), 'window-state.json')
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (e) {
    console.error('[Main] Failed to load window bounds', e)
  }
  return null
}

function saveBounds(): void {
  try {
    if (!mainWindow) return
    const bounds = mainWindow.getBounds()
    const configPath = path.join(app.getPath('userData'), 'window-state.json')
    fs.writeFileSync(configPath, JSON.stringify(bounds), 'utf-8')
  } catch (e) {
    console.error('[Main] Failed to save window bounds', e)
  }
}

function createWindow() {
  const savedBounds = getSavedBounds()
  const defaults = {
    width: 1400,
    height: 900,
    x: undefined as number | undefined,
    y: undefined as number | undefined,
  }
  const bounds = savedBounds ? { ...defaults, ...savedBounds } : defaults

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    backgroundColor: '#09090b',
    show: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:*; worker-src 'self' blob:",
          ],
        },
      })
    })
  } else {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:",
          ],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'Referrer-Policy': ['no-referrer'],
        },
      })
    })
  }

  processManager = new ProcessManager(mainWindow)
  apiManager = new APIManager(mainWindow)
  sessionManager = new SessionManager()
  configManager = new ConfigManager()
  fileManager = new FileManager()
  autoUpdater = new AutoUpdater()
  autoUpdater.setWindow(mainWindow)
  registerIPCHandlers(
    mainWindow,
    processManager,
    apiManager,
    sessionManager,
    configManager,
    fileManager
  )
  registerWindowControls()
  registerUpdateHandlers()

  createTray(mainWindow)
  registerShortcuts(mainWindow)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = ['[renderer:log]', '[renderer:warn]', '[renderer:error]', '[renderer:info]']
    console.log(`${prefix[level] || '[renderer]'} ${message}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[CRASH] Renderer process gone:', details.reason, details.exitCode)
  })

  mainWindow.on('unresponsive', () => {
    console.error('[CRASH] Window unresponsive')
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      saveBounds()
      if (minimizeToTray) {
        mainWindow?.hide()
      } else {
        app.quit()
      }
    }
  })

  mainWindow.on('closed', () => {
    processManager?.destroy()
    mainWindow = null
    processManager = null
    apiManager = null
    sessionManager = null
    configManager = null
    fileManager = null
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.setAppUserModelId('com.mimo.desktop')
  loadTraySettings()
  registerTraySettings()
  initCrashReporter()

  app.whenReady().then(createWindow)
}

app.on('before-quit', () => {
  isQuitting = true
  processManager?.destroy()
  saveBounds()
  unregisterIPCHandlers()
  unregisterWindowControls()
  unregisterUpdateHandlers()
  unregisterShortcuts()
  destroyTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    mainWindow?.show()
  }
})
