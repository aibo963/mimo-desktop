import { Page } from '@playwright/test'

interface MockIPCResponse {
  action: string
  result: unknown
}

const DEFAULT_RESPONSES: Record<string, unknown> = {
  get_config: {},
  get_config_raw: '{}',
  get_models: ['xiaomi/mimo-v2.5-pro', 'xiaomi/mimo-v2.5', 'xiaomi/mimo-v2.5-lite'],
  list_sessions: [],
  get_queue_status: { queueLength: 0, isProcessing: false, currentMessageId: null },
  verify_api: { success: true, message: 'API 验证成功' },
  read_file_tree: [
    {
      name: 'src',
      path: '/test/src',
      type: 'directory',
      children: [
        { name: 'App.tsx', path: '/test/src/App.tsx', type: 'file' },
        { name: 'main.tsx', path: '/test/src/main.tsx', type: 'file' },
      ],
    },
    { name: 'package.json', path: '/test/package.json', type: 'file' },
  ],
  read_file: { content: 'test file content', language: 'typescript', extension: 'ts' },
  get_tts_config: {
    apiKey: '',
    api: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.5-tts',
    voice: 'mimo_default',
  },
  get_backends: [
    {
      id: 'sd-webui',
      name: 'Stable Diffusion WebUI',
      baseUrl: 'http://127.0.0.1:7860',
      enabled: true,
    },
  ],
  memory_get_all: [],
  skill_get_all: [],
  skill_get_most_used: [],
}

export async function mockIPC(page: Page, overrides: Record<string, unknown> = {}) {
  const responses = { ...DEFAULT_RESPONSES, ...overrides }

  await page.evaluate((resps) => {
    const originalInvoke = window.mimoAPI?.invoke
    if (!originalInvoke) return

    window.mimoAPI.invoke = async (command: Record<string, unknown>) => {
      const action = command.action as string
      if (resps[action] !== undefined) {
        return resps[action]
      }
      return originalInvoke.call(window.mimoAPI, command)
    }
  }, responses)
}

export async function mockStreamingResponse(page: Page, messages: string[]) {
  await page.evaluate((msgs) => {
    const originalInvoke = window.mimoAPI?.invoke
    if (!originalInvoke) return

    window.mimoAPI.invoke = async (command: Record<string, unknown>) => {
      if (command.action === 'send_message') {
        setTimeout(() => {
          for (const msg of msgs) {
            window.mimoAPI.onEvent?.({
              type: 'text',
              data: { content: msg },
              timestamp: Date.now(),
            })
          }
          window.mimoAPI.onEvent?.({
            type: 'step_finish',
            data: {},
            timestamp: Date.now(),
          })
          window.mimoAPI.onEvent?.({
            type: 'done',
            data: { exitCode: 0 },
            timestamp: Date.now(),
          })
        }, 100)
        return { status: 'streaming' }
      }
      return { status: 'ok' }
    }
  }, messages)
}
