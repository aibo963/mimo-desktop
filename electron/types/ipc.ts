export interface MimoEvent {
  type:
    | 'text'
    | 'tool_use'
    | 'tool_result'
    | 'step_start'
    | 'step_finish'
    | 'error'
    | 'done'
    | 'permission_request'
    | 'session_update'
    | 'stats'
  data: any
  timestamp: number
}

export type MimoCommand =
  | {
      action: 'send_message'
      message: string
      sessionId?: string
      attachments?: Array<{ name: string; type: string; size: number; dataUrl?: string }>
      agentMode?: boolean
    }
  | { action: 'cancel' }
  | { action: 'verify_api' }
  | { action: 'list_sessions' }
  | { action: 'delete_session'; sessionId: string }
  | { action: 'get_session_history'; sessionId: string }
  | { action: 'get_config' }
  | { action: 'get_config_raw' }
  | { action: 'set_config'; key: string; value: any }
  | { action: 'set_config_raw'; content: string }
  | { action: 'get_stats' }
  | { action: 'get_models' }
  | { action: 'read_file_tree'; dirPath?: string }
  | { action: 'read_file'; filePath: string }
  | { action: 'get_queue_status' }
  | {
      action: 'tts_synthesize'
      text: string
      model?: string
      voice?: string
      format?: string
      style?: string
      voiceDescription?: string
      audioBase64?: string
      audioMimeType?: string
    }
  | { action: 'tts_get_config' }
  | { action: 'tts_set_config'; apiKey?: string; api?: string; model?: string; voice?: string }
  | {
      action: 'image_generate'
      prompt: string
      negativePrompt?: string
      width?: number
      height?: number
      steps?: number
      cfgScale?: number
      seed?: number
      sampler?: string
      batchSize?: number
      backend?: string
      model?: string
    }
  | { action: 'image_cancel' }
  | { action: 'image_get_backends' }
  | { action: 'memory_get_all' }
  | { action: 'memory_search'; query: string }
  | {
      action: 'memory_add'
      content: string
      category: 'fact' | 'preference' | 'skill' | 'context'
      tags: string[]
      source?: string
    }
  | { action: 'memory_update'; id: string; content?: string; category?: string; tags?: string[] }
  | { action: 'memory_remove'; id: string }
  | { action: 'memory_clear' }
  | { action: 'memory_extract'; messages: Array<{ role: string; content: string }> }
  | { action: 'knowledge_index_file'; filePath: string }
  | { action: 'knowledge_remove_file'; filePath: string }
  | { action: 'knowledge_get_files' }
  | { action: 'knowledge_search'; query: string; maxResults?: number }
  | { action: 'knowledge_get_context'; query: string; maxTokens?: number }
  | { action: 'skill_get_all' }
  | { action: 'skill_search'; query: string }
  | { action: 'skill_get_by_category'; category: string }
  | {
      action: 'skill_add'
      name: string
      description: string
      category: string
      content: string
      tags: string[]
    }
  | {
      action: 'skill_update'
      id: string
      name?: string
      description?: string
      category?: string
      content?: string
      tags?: string[]
    }
  | { action: 'skill_remove'; id: string }
  | { action: 'skill_use'; id: string }
  | { action: 'skill_get_most_used'; limit?: number }
  | { action: 'lsp_start'; language: string }
  | { action: 'lsp_stop'; language: string }
  | { action: 'lsp_open_file'; filePath: string; content: string; language: string }
  | { action: 'lsp_update_file'; filePath: string; content: string; language: string }
  | { action: 'lsp_close_file'; filePath: string; language: string }
  | { action: 'lsp_get_diagnostics'; filePath: string }
  | { action: 'lsp_is_running'; language: string }
  | {
      action: 'mcp_add_server'
      id: string
      name: string
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  | { action: 'mcp_remove_server'; serverId: string }
  | { action: 'mcp_list_servers' }
  | { action: 'mcp_get_server'; serverId: string }
  | { action: 'mcp_start_server'; serverId: string }
  | { action: 'mcp_stop_server'; serverId: string }
  | { action: 'mcp_call_tool'; serverId: string; toolName: string; args: any }
  | { action: 'mcp_read_resource'; uri: string }
  | { action: 'mcp_list_tools' }
  | { action: 'mcp_list_resources' }
  | { action: 'webui_start'; cwd?: string; port?: number }
  | { action: 'webui_stop' }
  | { action: 'webui_is_running' }
  | { action: 'webui_new_session'; cwd?: string }
  | { action: 'webui_load_session'; sessionId: string; cwd?: string }
  | { action: 'webui_prompt'; sessionId: string; message: string; model?: string }
  | { action: 'webui_cancel'; sessionId: string }
  | { action: 'webui_get_sessions' }
  | { action: 'webui_get_models' }

export interface MimoAPI {
  invoke(command: MimoCommand): Promise<any>
  onEvent(callback: (event: MimoEvent) => void): void
  offEvent(): void
}
