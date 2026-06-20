import { describe, it, expect } from 'vitest'
import { validateCommand } from './ipc-validator'

describe('validateCommand', () => {
  describe('invalid input', () => {
    it('rejects null', () => {
      expect(validateCommand(null)).toEqual({ valid: false, error: 'Command must be an object' })
    })

    it('rejects undefined', () => {
      expect(validateCommand(undefined)).toEqual({
        valid: false,
        error: 'Command must be an object',
      })
    })

    it('rejects non-object', () => {
      expect(validateCommand('string')).toEqual({
        valid: false,
        error: 'Command must be an object',
      })
    })

    it('rejects missing action', () => {
      expect(validateCommand({})).toEqual({
        valid: false,
        error: 'Command must have an action string',
      })
    })

    it('rejects non-string action', () => {
      expect(validateCommand({ action: 123 })).toEqual({
        valid: false,
        error: 'Command must have an action string',
      })
    })

    it('rejects unknown action', () => {
      expect(validateCommand({ action: 'unknown' })).toEqual({
        valid: false,
        error: 'Unknown action: unknown',
      })
    })
  })

  describe('send_message', () => {
    it('accepts valid message', () => {
      const result = validateCommand({ action: 'send_message', message: 'hello' })
      expect(result.valid).toBe(true)
      if (result.valid && result.command.action === 'send_message') {
        expect(result.command.message).toBe('hello')
      }
    })

    it('rejects empty message', () => {
      expect(validateCommand({ action: 'send_message', message: '' })).toEqual({
        valid: false,
        error: 'message must be a non-empty string',
      })
    })

    it('rejects non-string message', () => {
      expect(validateCommand({ action: 'send_message', message: 123 })).toEqual({
        valid: false,
        error: 'message must be a non-empty string',
      })
    })

    it('rejects message exceeding max length', () => {
      const longMessage = 'x'.repeat(100_001)
      expect(validateCommand({ action: 'send_message', message: longMessage })).toEqual({
        valid: false,
        error: 'message exceeds max length of 100000',
      })
    })

    it('accepts message at max length', () => {
      const maxMessage = 'x'.repeat(100_000)
      const result = validateCommand({ action: 'send_message', message: maxMessage })
      expect(result.valid).toBe(true)
    })

    it('validates sessionId format', () => {
      expect(
        validateCommand({ action: 'send_message', message: 'hi', sessionId: 'abc-123' }).valid
      ).toBe(true)
      expect(
        validateCommand({ action: 'send_message', message: 'hi', sessionId: 'invalid id!' }).valid
      ).toBe(false)
    })

    it('accepts undefined sessionId', () => {
      const result = validateCommand({ action: 'send_message', message: 'hi' })
      expect(result.valid).toBe(true)
    })

    it('filters valid attachments', () => {
      const result = validateCommand({
        action: 'send_message',
        message: 'hi',
        attachments: [
          { name: 'test.png', type: 'image/png', size: 100 },
          { invalid: true },
          { name: 'doc.pdf', type: 'application/pdf', size: 200 },
        ],
      })
      expect(result.valid).toBe(true)
      if (result.valid && result.command.action === 'send_message') {
        expect(result.command.attachments).toHaveLength(2)
      }
    })

    it('limits attachments to 10', () => {
      const attachments = Array.from({ length: 15 }, (_, i) => ({
        name: `file${i}.txt`,
        type: 'text/plain',
        size: 100,
      }))
      const result = validateCommand({ action: 'send_message', message: 'hi', attachments })
      expect(result.valid).toBe(true)
      if (result.valid && result.command.action === 'send_message') {
        expect(result.command.attachments).toHaveLength(10)
      }
    })
  })

  describe('cancel', () => {
    it('accepts cancel', () => {
      const result = validateCommand({ action: 'cancel' })
      expect(result.valid).toBe(true)
    })
  })

  describe('verify_api', () => {
    it('accepts verify_api', () => {
      const result = validateCommand({ action: 'verify_api' })
      expect(result.valid).toBe(true)
    })
  })

  describe('list_sessions', () => {
    it('accepts list_sessions', () => {
      const result = validateCommand({ action: 'list_sessions' })
      expect(result.valid).toBe(true)
    })
  })

  describe('delete_session', () => {
    it('accepts valid sessionId', () => {
      const result = validateCommand({ action: 'delete_session', sessionId: 'abc-123' })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid sessionId', () => {
      expect(validateCommand({ action: 'delete_session', sessionId: 'bad id' }).valid).toBe(false)
    })
  })

  describe('get_session_history', () => {
    it('accepts valid sessionId', () => {
      const result = validateCommand({ action: 'get_session_history', sessionId: 'abc-123' })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid sessionId', () => {
      expect(
        validateCommand({ action: 'get_session_history', sessionId: 'invalid id!' }).valid
      ).toBe(false)
    })
  })

  describe('get_config / get_config_raw / get_stats / get_models', () => {
    it('accepts get_config', () => {
      expect(validateCommand({ action: 'get_config' }).valid).toBe(true)
    })

    it('accepts get_config_raw', () => {
      expect(validateCommand({ action: 'get_config_raw' }).valid).toBe(true)
    })

    it('accepts get_stats', () => {
      expect(validateCommand({ action: 'get_stats' }).valid).toBe(true)
    })

    it('accepts get_models', () => {
      expect(validateCommand({ action: 'get_models' }).valid).toBe(true)
    })
  })

  describe('set_config', () => {
    it('accepts valid key', () => {
      const result = validateCommand({ action: 'set_config', key: 'theme', value: 'dark' })
      expect(result.valid).toBe(true)
    })

    it('accepts nested key', () => {
      const result = validateCommand({
        action: 'set_config',
        key: 'provider.openai.apiKey',
        value: 'sk-123',
      })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid key characters', () => {
      expect(
        validateCommand({ action: 'set_config', key: 'key with space', value: 'v' }).valid
      ).toBe(false)
    })

    it('rejects key exceeding max length', () => {
      expect(
        validateCommand({ action: 'set_config', key: 'x'.repeat(201), value: 'v' }).valid
      ).toBe(false)
    })
  })

  describe('set_config_raw', () => {
    it('accepts valid content', () => {
      const result = validateCommand({ action: 'set_config_raw', content: '{"key":"value"}' })
      expect(result.valid).toBe(true)
    })

    it('rejects non-string content', () => {
      expect(validateCommand({ action: 'set_config_raw', content: 123 }).valid).toBe(false)
    })

    it('rejects content exceeding max length', () => {
      expect(
        validateCommand({ action: 'set_config_raw', content: 'x'.repeat(1_000_001) }).valid
      ).toBe(false)
    })
  })

  describe('read_file_tree / read_file', () => {
    it('accepts valid dirPath', () => {
      expect(validateCommand({ action: 'read_file_tree', dirPath: '/src' }).valid).toBe(true)
    })

    it('accepts undefined dirPath', () => {
      expect(validateCommand({ action: 'read_file_tree' }).valid).toBe(true)
    })

    it('rejects path traversal', () => {
      expect(validateCommand({ action: 'read_file_tree', dirPath: '../secret' }).valid).toBe(false)
    })

    it('rejects null byte in path', () => {
      expect(validateCommand({ action: 'read_file', filePath: '/path\x00file' }).valid).toBe(false)
    })

    it('rejects path exceeding max length', () => {
      expect(validateCommand({ action: 'read_file', filePath: '/'.repeat(2001) }).valid).toBe(false)
    })
  })

  describe('memory commands', () => {
    it('memory_get_all accepts', () => {
      expect(validateCommand({ action: 'memory_get_all' }).valid).toBe(true)
    })

    it('memory_search accepts query', () => {
      expect(validateCommand({ action: 'memory_search', query: 'test' }).valid).toBe(true)
    })

    it('memory_search rejects non-string query', () => {
      expect(validateCommand({ action: 'memory_search', query: 123 }).valid).toBe(false)
    })

    it('memory_add accepts valid data', () => {
      const result = validateCommand({
        action: 'memory_add',
        content: 'fact',
        category: 'fact',
        tags: [],
      })
      expect(result.valid).toBe(true)
    })

    it('memory_add rejects empty content', () => {
      expect(
        validateCommand({ action: 'memory_add', content: '', category: 'fact', tags: [] }).valid
      ).toBe(false)
    })

    it('memory_add rejects invalid category', () => {
      expect(
        validateCommand({ action: 'memory_add', content: 'x', category: 'invalid', tags: [] }).valid
      ).toBe(false)
    })

    it('memory_update accepts', () => {
      expect(validateCommand({ action: 'memory_update', id: '123' }).valid).toBe(true)
    })

    it('memory_remove accepts', () => {
      expect(validateCommand({ action: 'memory_remove', id: '123' }).valid).toBe(true)
    })

    it('memory_clear accepts', () => {
      expect(validateCommand({ action: 'memory_clear' }).valid).toBe(true)
    })

    it('memory_extract accepts messages array', () => {
      const result = validateCommand({
        action: 'memory_extract',
        messages: [{ role: 'user', content: 'hi' }],
      })
      expect(result.valid).toBe(true)
    })

    it('memory_extract rejects non-array messages', () => {
      expect(validateCommand({ action: 'memory_extract', messages: 'not array' }).valid).toBe(false)
    })
  })

  describe('knowledge commands', () => {
    it('knowledge_get_files accepts', () => {
      expect(validateCommand({ action: 'knowledge_get_files' }).valid).toBe(true)
    })

    it('knowledge_index_file accepts valid path', () => {
      expect(
        validateCommand({ action: 'knowledge_index_file', filePath: '/src/file.ts' }).valid
      ).toBe(true)
    })

    it('knowledge_index_file rejects invalid path', () => {
      expect(validateCommand({ action: 'knowledge_index_file', filePath: '../bad' }).valid).toBe(
        false
      )
    })

    it('knowledge_search accepts query', () => {
      expect(validateCommand({ action: 'knowledge_search', query: 'test' }).valid).toBe(true)
    })

    it('knowledge_get_context accepts query', () => {
      expect(validateCommand({ action: 'knowledge_get_context', query: 'test' }).valid).toBe(true)
    })
  })

  describe('skill commands', () => {
    it('skill_get_all accepts', () => {
      expect(validateCommand({ action: 'skill_get_all' }).valid).toBe(true)
    })

    it('skill_search accepts query', () => {
      expect(validateCommand({ action: 'skill_search', query: 'test' }).valid).toBe(true)
    })

    it('skill_get_by_category accepts', () => {
      expect(validateCommand({ action: 'skill_get_by_category', category: 'general' }).valid).toBe(
        true
      )
    })

    it('skill_add accepts valid data', () => {
      const result = validateCommand({ action: 'skill_add', name: 'test', content: 'code' })
      expect(result.valid).toBe(true)
    })

    it('skill_add rejects missing name', () => {
      expect(validateCommand({ action: 'skill_add', name: 123, content: 'code' }).valid).toBe(false)
    })

    it('skill_update accepts', () => {
      expect(validateCommand({ action: 'skill_update', id: '123' }).valid).toBe(true)
    })

    it('skill_remove accepts', () => {
      expect(validateCommand({ action: 'skill_remove', id: '123' }).valid).toBe(true)
    })

    it('skill_use accepts', () => {
      expect(validateCommand({ action: 'skill_use', id: '123' }).valid).toBe(true)
    })

    it('skill_get_most_used accepts with default limit', () => {
      const result = validateCommand({ action: 'skill_get_most_used' })
      expect(result.valid).toBe(true)
      if (result.valid && result.command.action === 'skill_get_most_used') {
        expect(result.command.limit).toBe(10)
      }
    })
  })

  describe('lsp commands', () => {
    it('lsp_start accepts language', () => {
      expect(validateCommand({ action: 'lsp_start', language: 'typescript' }).valid).toBe(true)
    })

    it('lsp_stop accepts language', () => {
      expect(validateCommand({ action: 'lsp_stop', language: 'typescript' }).valid).toBe(true)
    })

    it('lsp_open_file accepts', () => {
      expect(
        validateCommand({
          action: 'lsp_open_file',
          filePath: '/f.ts',
          content: 'code',
          language: 'typescript',
        }).valid
      ).toBe(true)
    })

    it('lsp_update_file accepts', () => {
      expect(
        validateCommand({
          action: 'lsp_update_file',
          filePath: '/f.ts',
          content: 'code',
          language: 'typescript',
        }).valid
      ).toBe(true)
    })

    it('lsp_close_file accepts', () => {
      expect(
        validateCommand({ action: 'lsp_close_file', filePath: '/f.ts', language: 'typescript' })
          .valid
      ).toBe(true)
    })

    it('lsp_get_diagnostics accepts', () => {
      expect(validateCommand({ action: 'lsp_get_diagnostics', filePath: '/f.ts' }).valid).toBe(true)
    })

    it('lsp_is_running accepts', () => {
      expect(validateCommand({ action: 'lsp_is_running', language: 'typescript' }).valid).toBe(true)
    })

    it('rejects missing language', () => {
      expect(validateCommand({ action: 'lsp_start' }).valid).toBe(false)
    })
  })

  describe('mcp commands', () => {
    it('mcp_add_server accepts', () => {
      const result = validateCommand({
        action: 'mcp_add_server',
        id: 's1',
        name: 'server',
        command: 'node',
      })
      expect(result.valid).toBe(true)
    })

    it('mcp_add_server rejects missing fields', () => {
      expect(validateCommand({ action: 'mcp_add_server', id: 's1' }).valid).toBe(false)
    })

    it('mcp_remove_server accepts', () => {
      expect(validateCommand({ action: 'mcp_remove_server', serverId: 's1' }).valid).toBe(true)
    })

    it('mcp_list_servers accepts', () => {
      expect(validateCommand({ action: 'mcp_list_servers' }).valid).toBe(true)
    })

    it('mcp_get_server accepts', () => {
      expect(validateCommand({ action: 'mcp_get_server', serverId: 's1' }).valid).toBe(true)
    })

    it('mcp_start_server accepts', () => {
      expect(validateCommand({ action: 'mcp_start_server', serverId: 's1' }).valid).toBe(true)
    })

    it('mcp_stop_server accepts', () => {
      expect(validateCommand({ action: 'mcp_stop_server', serverId: 's1' }).valid).toBe(true)
    })

    it('mcp_call_tool accepts', () => {
      const result = validateCommand({
        action: 'mcp_call_tool',
        serverId: 's1',
        toolName: 't1',
        args: {},
      })
      expect(result.valid).toBe(true)
    })

    it('mcp_call_tool rejects missing toolName', () => {
      expect(validateCommand({ action: 'mcp_call_tool', serverId: 's1' }).valid).toBe(false)
    })

    it('mcp_read_resource accepts', () => {
      expect(validateCommand({ action: 'mcp_read_resource', uri: 'file:///path' }).valid).toBe(true)
    })

    it('mcp_list_tools accepts', () => {
      expect(validateCommand({ action: 'mcp_list_tools' }).valid).toBe(true)
    })

    it('mcp_list_resources accepts', () => {
      expect(validateCommand({ action: 'mcp_list_resources' }).valid).toBe(true)
    })
  })

  describe('get_queue_status', () => {
    it('accepts', () => {
      expect(validateCommand({ action: 'get_queue_status' }).valid).toBe(true)
    })
  })
})
