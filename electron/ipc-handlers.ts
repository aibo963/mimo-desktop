import { ipcMain, BrowserWindow, dialog } from 'electron'
import { MimoCommand } from './types/ipc'
import { ProcessManager } from './process-manager'
import { SessionManager } from './session-manager'
import { ConfigManager } from './config-manager'
import { FileManager } from './file-manager'
import { StatsManager } from './stats-manager'

export function registerIPCHandlers(
  window: BrowserWindow,
  processManager: ProcessManager,
  sessionManager: SessionManager,
  configManager: ConfigManager,
  fileManager: FileManager,
  statsManager: StatsManager
) {
  ipcMain.handle('mimo:command', async (_event, command: MimoCommand) => {
    try {
      switch (command.action) {
        case 'send_message': {
          const messageId = await processManager.sendMessage(command.message, command.sessionId)
          return { status: 'queued', messageId }
        }
        
        case 'cancel':
          processManager.cancel()
          return { status: 'ok' }
        
        case 'verify_api':
          return await processManager.verifyApi()
        
        case 'list_sessions':
          return await sessionManager.list()
        
        case 'delete_session':
          await sessionManager.delete(command.sessionId)
          return { status: 'ok' }
        
        case 'get_session_history':
          return await sessionManager.getHistory(command.sessionId)
        
        case 'get_config':
          return configManager.getAll()
        
        case 'get_config_raw':
          return configManager.getRaw()
        
        case 'set_config':
          configManager.set(command.key, command.value)
          return { status: 'ok' }
        
        case 'set_config_raw':
          configManager.setRaw(command.content)
          return { status: 'ok' }
        
        case 'get_stats':
          return await statsManager.getOverview()
        
        case 'get_models':
          return await configManager.getModels()
        
        case 'read_file_tree':
          return fileManager.readDirectory(command.dirPath || process.cwd())
        
        case 'read_file': {
          const content = fileManager.readFile(command.filePath)
          const ext = fileManager.getFileExtension(command.filePath)
          const language = fileManager.getLanguage(ext)
          return { content, language, extension: ext }
        }
        
        default:
          throw new Error(`Unknown command: ${(command as any).action}`)
      }
    } catch (error: any) {
      return { error: error.message }
    }
  })

  ipcMain.handle('mimo:queueStatus', async () => {
    return processManager.getQueueStatus()
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:setMode', async (_event, mode: 'all' | 'source') => {
    fileManager.setMode(mode)
    return { status: 'ok' }
  })
}

export function sendEventToRenderer(window: BrowserWindow, event: any) {
  if (!window.isDestroyed()) {
    window.webContents.send('mimo:event', event)
  }
}
