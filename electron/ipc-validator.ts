import { MimoCommand } from './types/ipc'

const SESSION_ID_REGEX = /^[a-f0-9-]{1,64}$/i
const CONFIG_KEY_REGEX = /^[a-zA-Z0-9._]+$/
const MAX_MESSAGE_LENGTH = 100_000
const MAX_PATH_LENGTH = 2000
const MAX_CONFIG_RAW_LENGTH = 1_000_000

function isValidSessionId(id: string): boolean {
  return typeof id === 'string' && SESSION_ID_REGEX.test(id) && id.length <= 64
}

function isValidConfigKey(key: string): boolean {
  return typeof key === 'string' && CONFIG_KEY_REGEX.test(key) && key.length <= 200
}

function isValidPath(path: string): boolean {
  if (typeof path !== 'string' || path.length > MAX_PATH_LENGTH) return false
  if (path.includes('\0')) return false
  if (path.includes('..')) return false
  return true
}

export function validateCommand(
  command: unknown
): { valid: true; command: MimoCommand } | { valid: false; error: string } {
  if (!command || typeof command !== 'object') {
    return { valid: false, error: 'Command must be an object' }
  }

  const cmd = command as Record<string, unknown>

  if (typeof cmd.action !== 'string') {
    return { valid: false, error: 'Command must have an action string' }
  }

  switch (cmd.action) {
    case 'send_message': {
      if (typeof cmd.message !== 'string' || cmd.message.length === 0) {
        return { valid: false, error: 'message must be a non-empty string' }
      }
      if (cmd.message.length > MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `message exceeds max length of ${MAX_MESSAGE_LENGTH}` }
      }
      if (cmd.sessionId !== undefined && cmd.sessionId !== null) {
        if (!isValidSessionId(cmd.sessionId as string)) {
          return { valid: false, error: 'Invalid sessionId format' }
        }
      }
      const attachments = Array.isArray(cmd.attachments)
        ? (cmd.attachments as Array<{ name: string; type: string; size: number; dataUrl?: string }>)
            .slice(0, 10)
            .filter(
              (a) =>
                a &&
                typeof a.name === 'string' &&
                typeof a.type === 'string' &&
                typeof a.size === 'number'
            )
        : undefined
      return {
        valid: true,
        command: {
          action: 'send_message',
          message: cmd.message,
          sessionId: cmd.sessionId as string | undefined,
          attachments,
          agentMode: cmd.agentMode as boolean | undefined,
        },
      }
    }

    case 'cancel':
      return { valid: true, command: { action: 'cancel' } }

    case 'verify_api':
      return { valid: true, command: { action: 'verify_api' } }

    case 'list_sessions':
      return { valid: true, command: { action: 'list_sessions' } }

    case 'delete_session': {
      if (!isValidSessionId(cmd.sessionId as string)) {
        return { valid: false, error: 'Invalid sessionId format' }
      }
      return {
        valid: true,
        command: { action: 'delete_session', sessionId: cmd.sessionId as string },
      }
    }

    case 'get_session_history': {
      if (!isValidSessionId(cmd.sessionId as string)) {
        return { valid: false, error: 'Invalid sessionId format' }
      }
      return {
        valid: true,
        command: { action: 'get_session_history', sessionId: cmd.sessionId as string },
      }
    }

    case 'get_config':
      return { valid: true, command: { action: 'get_config' } }

    case 'get_config_raw':
      return { valid: true, command: { action: 'get_config_raw' } }

    case 'set_config': {
      if (!isValidConfigKey(cmd.key as string)) {
        return { valid: false, error: 'Invalid config key format' }
      }
      return {
        valid: true,
        command: { action: 'set_config', key: cmd.key as string, value: cmd.value },
      }
    }

    case 'set_config_raw': {
      if (typeof cmd.content !== 'string') {
        return { valid: false, error: 'content must be a string' }
      }
      if (cmd.content.length > MAX_CONFIG_RAW_LENGTH) {
        return { valid: false, error: `content exceeds max length of ${MAX_CONFIG_RAW_LENGTH}` }
      }
      return { valid: true, command: { action: 'set_config_raw', content: cmd.content } }
    }

    case 'get_stats':
      return { valid: true, command: { action: 'get_stats' } }

    case 'get_models':
      return { valid: true, command: { action: 'get_models' } }

    case 'read_file_tree': {
      if (cmd.dirPath !== undefined && cmd.dirPath !== null) {
        if (!isValidPath(cmd.dirPath as string)) {
          return { valid: false, error: 'Invalid directory path' }
        }
      }
      return {
        valid: true,
        command: { action: 'read_file_tree', dirPath: cmd.dirPath as string | undefined },
      }
    }

    case 'read_file': {
      if (!isValidPath(cmd.filePath as string)) {
        return { valid: false, error: 'Invalid file path' }
      }
      return { valid: true, command: { action: 'read_file', filePath: cmd.filePath as string } }
    }

    case 'get_queue_status':
      return { valid: true, command: { action: 'get_queue_status' } }

    case 'memory_get_all':
      return { valid: true, command: { action: 'memory_get_all' } }

    case 'memory_search': {
      if (typeof cmd.query !== 'string') {
        return { valid: false, error: 'query must be a string' }
      }
      return { valid: true, command: { action: 'memory_search', query: cmd.query } }
    }

    case 'memory_add': {
      if (typeof cmd.content !== 'string' || cmd.content.length === 0) {
        return { valid: false, error: 'content must be a non-empty string' }
      }
      if (!['fact', 'preference', 'skill', 'context'].includes(cmd.category as string)) {
        return { valid: false, error: 'category must be fact, preference, skill, or context' }
      }
      return {
        valid: true,
        command: {
          action: 'memory_add',
          content: cmd.content,
          category: cmd.category as any,
          tags: (cmd.tags as string[]) || [],
          source: cmd.source as string | undefined,
        },
      }
    }

    case 'memory_update': {
      if (typeof cmd.id !== 'string') {
        return { valid: false, error: 'id must be a string' }
      }
      return {
        valid: true,
        command: {
          action: 'memory_update',
          id: cmd.id,
          content: cmd.content as string | undefined,
          category: cmd.category as string | undefined,
          tags: cmd.tags as string[] | undefined,
        },
      }
    }

    case 'memory_remove': {
      if (typeof cmd.id !== 'string') {
        return { valid: false, error: 'id must be a string' }
      }
      return { valid: true, command: { action: 'memory_remove', id: cmd.id } }
    }

    case 'memory_clear':
      return { valid: true, command: { action: 'memory_clear' } }

    case 'memory_extract': {
      if (!Array.isArray(cmd.messages)) {
        return { valid: false, error: 'messages must be an array' }
      }
      return {
        valid: true,
        command: {
          action: 'memory_extract',
          messages: cmd.messages as Array<{ role: string; content: string }>,
        },
      }
    }

    case 'knowledge_index_file': {
      if (!isValidPath(cmd.filePath as string)) {
        return { valid: false, error: 'Invalid file path' }
      }
      return {
        valid: true,
        command: { action: 'knowledge_index_file', filePath: cmd.filePath as string },
      }
    }

    case 'knowledge_remove_file': {
      if (!isValidPath(cmd.filePath as string)) {
        return { valid: false, error: 'Invalid file path' }
      }
      return {
        valid: true,
        command: { action: 'knowledge_remove_file', filePath: cmd.filePath as string },
      }
    }

    case 'knowledge_get_files':
      return { valid: true, command: { action: 'knowledge_get_files' } }

    case 'knowledge_search': {
      if (typeof cmd.query !== 'string') {
        return { valid: false, error: 'query must be a string' }
      }
      return {
        valid: true,
        command: {
          action: 'knowledge_search',
          query: cmd.query,
          maxResults: typeof cmd.maxResults === 'number' ? cmd.maxResults : undefined,
        },
      }
    }

    case 'knowledge_get_context': {
      if (typeof cmd.query !== 'string') {
        return { valid: false, error: 'query must be a string' }
      }
      return {
        valid: true,
        command: {
          action: 'knowledge_get_context',
          query: cmd.query,
          maxTokens: typeof cmd.maxTokens === 'number' ? cmd.maxTokens : undefined,
        },
      }
    }

    case 'skill_get_all':
      return { valid: true, command: { action: 'skill_get_all' } }

    case 'skill_search': {
      if (typeof cmd.query !== 'string') {
        return { valid: false, error: 'query must be a string' }
      }
      return { valid: true, command: { action: 'skill_search', query: cmd.query } }
    }

    case 'skill_get_by_category': {
      if (typeof cmd.category !== 'string') {
        return { valid: false, error: 'category must be a string' }
      }
      return { valid: true, command: { action: 'skill_get_by_category', category: cmd.category } }
    }

    case 'skill_add': {
      if (typeof cmd.name !== 'string' || typeof cmd.content !== 'string') {
        return { valid: false, error: 'name and content must be strings' }
      }
      return {
        valid: true,
        command: {
          action: 'skill_add',
          name: cmd.name,
          description: (cmd.description as string) || '',
          category: (cmd.category as string) || 'general',
          content: cmd.content,
          tags: (cmd.tags as string[]) || [],
        },
      }
    }

    case 'skill_update': {
      if (typeof cmd.id !== 'string') {
        return { valid: false, error: 'id must be a string' }
      }
      return {
        valid: true,
        command: {
          action: 'skill_update',
          id: cmd.id,
          name: cmd.name as string | undefined,
          description: cmd.description as string | undefined,
          category: cmd.category as string | undefined,
          content: cmd.content as string | undefined,
          tags: cmd.tags as string[] | undefined,
        },
      }
    }

    case 'skill_remove': {
      if (typeof cmd.id !== 'string') {
        return { valid: false, error: 'id must be a string' }
      }
      return { valid: true, command: { action: 'skill_remove', id: cmd.id } }
    }

    case 'skill_use': {
      if (typeof cmd.id !== 'string') {
        return { valid: false, error: 'id must be a string' }
      }
      return { valid: true, command: { action: 'skill_use', id: cmd.id } }
    }

    case 'skill_get_most_used':
      return {
        valid: true,
        command: {
          action: 'skill_get_most_used',
          limit: typeof cmd.limit === 'number' ? cmd.limit : 10,
        },
      }

    case 'lsp_start': {
      if (typeof cmd.language !== 'string') {
        return { valid: false, error: 'language must be a string' }
      }
      return { valid: true, command: { action: 'lsp_start', language: cmd.language } }
    }

    case 'lsp_stop': {
      if (typeof cmd.language !== 'string') {
        return { valid: false, error: 'language must be a string' }
      }
      return { valid: true, command: { action: 'lsp_stop', language: cmd.language } }
    }

    case 'lsp_open_file': {
      if (
        typeof cmd.filePath !== 'string' ||
        typeof cmd.content !== 'string' ||
        typeof cmd.language !== 'string'
      ) {
        return { valid: false, error: 'filePath, content, and language must be strings' }
      }
      return {
        valid: true,
        command: {
          action: 'lsp_open_file',
          filePath: cmd.filePath,
          content: cmd.content,
          language: cmd.language,
        },
      }
    }

    case 'lsp_update_file': {
      if (
        typeof cmd.filePath !== 'string' ||
        typeof cmd.content !== 'string' ||
        typeof cmd.language !== 'string'
      ) {
        return { valid: false, error: 'filePath, content, and language must be strings' }
      }
      return {
        valid: true,
        command: {
          action: 'lsp_update_file',
          filePath: cmd.filePath,
          content: cmd.content,
          language: cmd.language,
        },
      }
    }

    case 'lsp_close_file': {
      if (typeof cmd.filePath !== 'string' || typeof cmd.language !== 'string') {
        return { valid: false, error: 'filePath and language must be strings' }
      }
      return {
        valid: true,
        command: { action: 'lsp_close_file', filePath: cmd.filePath, language: cmd.language },
      }
    }

    case 'lsp_get_diagnostics': {
      if (typeof cmd.filePath !== 'string') {
        return { valid: false, error: 'filePath must be a string' }
      }
      return { valid: true, command: { action: 'lsp_get_diagnostics', filePath: cmd.filePath } }
    }

    case 'lsp_is_running': {
      if (typeof cmd.language !== 'string') {
        return { valid: false, error: 'language must be a string' }
      }
      return { valid: true, command: { action: 'lsp_is_running', language: cmd.language } }
    }

    case 'mcp_add_server': {
      if (
        typeof cmd.id !== 'string' ||
        typeof cmd.name !== 'string' ||
        typeof cmd.command !== 'string'
      ) {
        return { valid: false, error: 'id, name, and command must be strings' }
      }
      return {
        valid: true,
        command: {
          action: 'mcp_add_server',
          id: cmd.id,
          name: cmd.name,
          command: cmd.command,
          args: cmd.args as string[] | undefined,
          env: cmd.env as Record<string, string> | undefined,
        },
      }
    }

    case 'mcp_remove_server': {
      if (typeof cmd.serverId !== 'string') {
        return { valid: false, error: 'serverId must be a string' }
      }
      return { valid: true, command: { action: 'mcp_remove_server', serverId: cmd.serverId } }
    }

    case 'mcp_list_servers':
      return { valid: true, command: { action: 'mcp_list_servers' } }

    case 'mcp_get_server': {
      if (typeof cmd.serverId !== 'string') {
        return { valid: false, error: 'serverId must be a string' }
      }
      return { valid: true, command: { action: 'mcp_get_server', serverId: cmd.serverId } }
    }

    case 'mcp_start_server': {
      if (typeof cmd.serverId !== 'string') {
        return { valid: false, error: 'serverId must be a string' }
      }
      return { valid: true, command: { action: 'mcp_start_server', serverId: cmd.serverId } }
    }

    case 'mcp_stop_server': {
      if (typeof cmd.serverId !== 'string') {
        return { valid: false, error: 'serverId must be a string' }
      }
      return { valid: true, command: { action: 'mcp_stop_server', serverId: cmd.serverId } }
    }

    case 'mcp_call_tool': {
      if (typeof cmd.serverId !== 'string' || typeof cmd.toolName !== 'string') {
        return { valid: false, error: 'serverId and toolName must be strings' }
      }
      return {
        valid: true,
        command: {
          action: 'mcp_call_tool',
          serverId: cmd.serverId,
          toolName: cmd.toolName,
          args: cmd.args || {},
        },
      }
    }

    case 'mcp_read_resource': {
      if (typeof cmd.uri !== 'string') {
        return { valid: false, error: 'uri must be a string' }
      }
      return { valid: true, command: { action: 'mcp_read_resource', uri: cmd.uri } }
    }

    case 'mcp_list_tools':
      return { valid: true, command: { action: 'mcp_list_tools' } }

    case 'mcp_list_resources':
      return { valid: true, command: { action: 'mcp_list_resources' } }

    case 'tts_synthesize': {
      if (typeof cmd.text !== 'string' || cmd.text.length === 0) {
        return { valid: false, error: 'text must be a non-empty string' }
      }
      return {
        valid: true,
        command: {
          action: 'tts_synthesize',
          text: cmd.text,
          model: cmd.model as string | undefined,
          voice: cmd.voice as string | undefined,
          format: cmd.format as string | undefined,
          style: cmd.style as string | undefined,
          voiceDescription: cmd.voiceDescription as string | undefined,
          audioBase64: cmd.audioBase64 as string | undefined,
          audioMimeType: cmd.audioMimeType as string | undefined,
        },
      }
    }

    case 'tts_get_config':
      return { valid: true, command: { action: 'tts_get_config' } }

    case 'tts_set_config': {
      return {
        valid: true,
        command: {
          action: 'tts_set_config',
          apiKey: cmd.apiKey as string | undefined,
          api: cmd.api as string | undefined,
          model: cmd.model as string | undefined,
          voice: cmd.voice as string | undefined,
        },
      }
    }

    case 'image_generate': {
      if (typeof cmd.prompt !== 'string' || cmd.prompt.length === 0) {
        return { valid: false, error: 'prompt must be a non-empty string' }
      }
      return {
        valid: true,
        command: {
          action: 'image_generate',
          prompt: cmd.prompt,
          negativePrompt: cmd.negativePrompt as string | undefined,
          width: cmd.width as number | undefined,
          height: cmd.height as number | undefined,
          steps: cmd.steps as number | undefined,
          cfgScale: cmd.cfgScale as number | undefined,
          seed: cmd.seed as number | undefined,
          sampler: cmd.sampler as string | undefined,
          batchSize: cmd.batchSize as number | undefined,
          backend: cmd.backend as string | undefined,
          model: cmd.model as string | undefined,
        },
      }
    }

    case 'image_cancel':
      return { valid: true, command: { action: 'image_cancel' } }

    case 'image_get_backends':
      return { valid: true, command: { action: 'image_get_backends' } }

    default:
      return { valid: false, error: `Unknown action: ${cmd.action}` }
  }
}
