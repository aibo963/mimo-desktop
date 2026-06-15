export interface MimoEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'step_start' | 'step_finish'
       | 'error' | 'done' | 'permission_request' | 'session_update'
  data: any
  timestamp: number
}

export type MimoCommand =
  | { action: 'send_message'; message: string; sessionId?: string }
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

export interface MimoAPI {
  invoke(command: MimoCommand): Promise<any>
  onEvent(callback: (event: MimoEvent) => void): void
  offEvent(): void
}
