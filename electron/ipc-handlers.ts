import { ipcMain, BrowserWindow, dialog } from 'electron'
import { MimoCommand } from './types/ipc'
import { validateCommand } from './ipc-validator'
import { ProcessManager } from './process-manager'
import { APIManager } from './api-manager'
import { TTSManager } from './tts-manager'
import { ImageManager } from './image-manager'
import { SessionManager } from './session-manager'
import { ConfigManager } from './config-manager'
import { FileManager } from './file-manager'
import { MemoryManager } from './memory-manager'
import { SkillManager } from './skill-manager'
import { LSPManager } from './lsp-manager'
import { MCPManager } from './mcp-manager'
import { createSuccess, createError } from './api-response'

const registeredHandlers: string[] = []
let ttsManager: TTSManager | null = null
let imageManager: ImageManager | null = null
let memoryManager: MemoryManager | null = null
let skillManager: SkillManager | null = null
let lspManager: LSPManager | null = null
let mcpManager: MCPManager | null = null

export function registerIPCHandlers(
  window: BrowserWindow,
  processManager: ProcessManager,
  apiManager: APIManager,
  sessionManager: SessionManager,
  configManager: ConfigManager,
  fileManager: FileManager
) {
  unregisterIPCHandlers()
  ttsManager = new TTSManager()
  imageManager = new ImageManager(window)
  memoryManager = new MemoryManager()
  skillManager = new SkillManager()
  lspManager = new LSPManager()
  mcpManager = new MCPManager()

  ipcMain.handle('mimo:command', async (_event, rawCommand: unknown) => {
    const validation = validateCommand(rawCommand)
    if (!validation.valid) {
      return createError(validation.error, 'VALIDATION_ERROR')
    }

    const command = validation.command
    try {
      switch (command.action) {
        case 'send_message': {
          const config = configManager.getAll()
          const provider = config?.provider?.xiaomi
          const model = config?.model || 'xiaomi/mimo-v2.5-pro'

          if (provider?.options?.apiKey && provider?.api) {
            apiManager.configure(provider, model)
            apiManager.sendMessage(command.message, command.attachments)
            return { status: 'streaming' }
          }

          const messageId = await processManager.sendMessage(command.message, command.sessionId)
          return { status: 'queued', messageId }
        }

        case 'cancel': {
          apiManager.cancel()
          const result = processManager.cancel()
          return { status: result.cancelled ? 'ok' : 'nothing', reason: result.reason }
        }

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

        case 'tts_get_config': {
          const cfg = configManager.getAll()
          const ttsCfg = cfg?.tts || {}
          return {
            apiKey: ttsCfg.apiKey || '',
            api: ttsCfg.api || 'https://api.xiaomimimo.com/v1',
            model: ttsCfg.model || 'mimo-v2.5-tts',
            voice: ttsCfg.voice || 'mimo_default',
          }
        }

        case 'tts_set_config': {
          if (command.apiKey !== undefined) configManager.set('tts.apiKey', command.apiKey)
          if (command.api !== undefined) configManager.set('tts.api', command.api)
          if (command.model !== undefined) configManager.set('tts.model', command.model)
          if (command.voice !== undefined) configManager.set('tts.voice', command.voice)
          return { status: 'ok' }
        }

        case 'tts_synthesize': {
          const cfg = configManager.getAll()
          const ttsCfg = cfg?.tts || {}
          const apiKey = ttsCfg.apiKey || cfg?.provider?.xiaomi?.options?.apiKey || ''
          const apiBase =
            ttsCfg.api || cfg?.provider?.xiaomi?.api || 'https://api.xiaomimimo.com/v1'
          if (!apiKey) {
            return { error: 'TTS API Key 未配置，请在语音面板设置中配置' }
          }
          ttsManager!.configure(apiKey, apiBase)
          const result = await ttsManager!.synthesize({
            text: command.text,
            model: command.model as any,
            voice: command.voice || ttsCfg.voice,
            format: command.format as any,
            style: command.style,
            voiceDescription: command.voiceDescription,
            audioBase64: command.audioBase64,
            audioMimeType: command.audioMimeType,
          })
          return result
        }

        case 'memory_get_all':
          return memoryManager!.getAll()

        case 'memory_search':
          return memoryManager!.search(command.query)

        case 'memory_add':
          return memoryManager!.add({
            content: command.content,
            category: command.category,
            tags: command.tags,
            source: command.source,
          })

        case 'memory_update':
          return memoryManager!.update(command.id, {
            content: command.content,
            category: command.category as any,
            tags: command.tags,
          })

        case 'memory_remove':
          return { success: memoryManager!.remove(command.id) }

        case 'memory_clear':
          memoryManager!.clear()
          return { success: true }

        case 'memory_extract':
          return memoryManager!.autoExtractAndSave(command.messages)

        case 'knowledge_index_file': {
          const content = fileManager.readFile(command.filePath)
          if (content) {
            memoryManager!.indexFile(command.filePath, content)
            return { success: true }
          }
          return { success: false, error: 'Failed to read file' }
        }

        case 'knowledge_remove_file':
          return { success: memoryManager!.removeFileIndex(command.filePath) }

        case 'knowledge_get_files':
          return memoryManager!.getIndexedFiles()

        case 'knowledge_search':
          return memoryManager!.searchKnowledge(command.query, command.maxResults)

        case 'knowledge_get_context':
          return { context: memoryManager!.getKnowledgeContext(command.query, command.maxTokens) }

        case 'skill_get_all':
          return skillManager!.getAll()

        case 'skill_search':
          return skillManager!.search(command.query)

        case 'skill_get_by_category':
          return skillManager!.getByCategory(command.category as any)

        case 'skill_add':
          return skillManager!.add({
            name: command.name,
            description: command.description,
            category: command.category as any,
            content: command.content,
            tags: command.tags,
          })

        case 'skill_update':
          return skillManager!.update(command.id, {
            name: command.name,
            description: command.description,
            category: command.category as any,
            content: command.content,
            tags: command.tags,
          })

        case 'skill_remove':
          return { success: skillManager!.remove(command.id) }

        case 'skill_use':
          skillManager!.incrementUse(command.id)
          return { success: true }

        case 'skill_get_most_used':
          return skillManager!.getMostUsed(command.limit)

        case 'lsp_start':
          return { success: await lspManager!.startServer(process.cwd(), command.language) }

        case 'lsp_stop':
          lspManager!.stopServer(command.language)
          return { success: true }

        case 'lsp_open_file':
          await lspManager!.openFile(command.filePath, command.content, command.language)
          return { success: true }

        case 'lsp_update_file':
          await lspManager!.updateFile(command.filePath, command.content, command.language)
          return { success: true }

        case 'lsp_close_file':
          await lspManager!.closeFile(command.filePath, command.language)
          return { success: true }

        case 'lsp_get_diagnostics':
          return lspManager!.getDiagnostics(command.filePath)

        case 'lsp_is_running':
          return { running: lspManager!.isServerRunning(command.language) }

        case 'mcp_add_server': {
          const server = await mcpManager!.addServer({
            id: command.id,
            name: command.name,
            command: command.command,
            args: command.args,
            env: command.env,
          })
          return server
        }

        case 'mcp_remove_server':
          return { success: mcpManager!.removeServer(command.serverId) }

        case 'mcp_list_servers':
          return mcpManager!.getAllServers()

        case 'mcp_get_server':
          return mcpManager!.getServer(command.serverId) || null

        case 'mcp_start_server':
          return { success: await mcpManager!.startServer(command.serverId) }

        case 'mcp_stop_server':
          return { success: await mcpManager!.stopServer(command.serverId) }

        case 'mcp_call_tool':
          return await mcpManager!.callTool(command.serverId, command.toolName, command.args)

        case 'mcp_read_resource':
          return await mcpManager!.readResource(command.uri)

        case 'mcp_list_tools':
          return mcpManager!.getAllTools()

        case 'mcp_list_resources':
          return mcpManager!.getAllResources()

        case 'image_generate': {
          const result = await imageManager!.generate({
            prompt: command.prompt,
            negativePrompt: command.negativePrompt,
            width: command.width,
            height: command.height,
            steps: command.steps,
            cfgScale: command.cfgScale,
            seed: command.seed,
            sampler: command.sampler,
            batchSize: command.batchSize,
            backend: command.backend as any,
            model: command.model,
          })
          return result
        }

        case 'image_cancel': {
          imageManager!.cancel()
          return { status: 'ok' }
        }

        case 'image_get_backends': {
          return imageManager!.getBackends()
        }
      }
    } catch (error: any) {
      return createError(error.message || 'Unknown error')
    }
  })
  registeredHandlers.push('mimo:command')

  ipcMain.handle('mimo:queueStatus', async () => {
    return processManager.getQueueStatus()
  })
  registeredHandlers.push('mimo:queueStatus')

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })
  registeredHandlers.push('dialog:openDirectory')

  ipcMain.handle('file:setMode', async (_event, mode: 'all' | 'source') => {
    fileManager.setMode(mode)
    return { status: 'ok' }
  })
  registeredHandlers.push('file:setMode')
}

export function unregisterIPCHandlers(): void {
  for (const channel of registeredHandlers) {
    ipcMain.removeHandler(channel)
  }
  registeredHandlers.length = 0
}
