import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerIPCHandlers } from './ipc-handlers'
import { ProcessManager } from './process-manager'
import { SessionManager } from './session-manager'
import { ConfigManager } from './config-manager'
import { FileManager } from './file-manager'
import { StatsManager } from './stats-manager'
import { createTray, destroyTray } from './tray'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'

let mainWindow: BrowserWindow | null = null
let processManager: ProcessManager | null = null
let sessionManager: SessionManager | null = null
let configManager: ConfigManager | null = null
let fileManager: FileManager | null = null
let statsManager: StatsManager | null = null
let isQuitting = false

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#09090b',
    show: false,
  })

  processManager = new ProcessManager(mainWindow)
  sessionManager = new SessionManager()
  configManager = new ConfigManager()
  fileManager = new FileManager()
  statsManager = new StatsManager()
  registerIPCHandlers(mainWindow, processManager, sessionManager, configManager, fileManager, statsManager)
  registerWindowControls()

  createTray(mainWindow)
  registerShortcuts(mainWindow)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
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
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    processManager = null
    sessionManager = null
    configManager = null
    fileManager = null
    statsManager = null
  })
}

app.whenReady().then(createWindow)

app.on('before-quit', () => {
  isQuitting = true
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

export { mainWindow, processManager, sessionManager, configManager, fileManager, statsManager }
