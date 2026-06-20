import { describe, it, expect } from 'vitest'
import { handleEvent, createUserMessage, createAssistantMessage, handleError } from './useBaseChat'
import type { Message } from './useBaseChat'

describe('createUserMessage', () => {
  it('creates a user message with content', () => {
    const msg = createUserMessage('hello')
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('hello')
    expect(msg.status).toBe('done')
    expect(msg.id).toBeDefined()
    expect(msg.timestamp).toBeGreaterThan(0)
  })

  it('creates a user message with attachments', () => {
    const attachments = [{ name: 'test.png', type: 'image/png', size: 100, dataUrl: 'data:...' }]
    const msg = createUserMessage('hello', attachments)
    expect(msg.attachments).toEqual(attachments)
  })

  it('sets attachments to undefined when empty', () => {
    const msg = createUserMessage('hello', [])
    expect(msg.attachments).toBeUndefined()
  })
})

describe('createAssistantMessage', () => {
  it('creates an assistant message', () => {
    const msg = createAssistantMessage()
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('')
    expect(msg.status).toBe('queued')
    expect(msg.toolCalls).toEqual([])
  })
})

describe('handleEvent', () => {
  const makeAssistantMsg = (overrides?: Partial<Message>): Message => ({
    id: '1',
    role: 'assistant',
    content: '',
    toolCalls: [],
    status: 'streaming',
    timestamp: Date.now(),
    ...overrides,
  })

  const makeUserMsg = (): Message => ({
    id: '0',
    role: 'user',
    content: 'hello',
    status: 'done',
    timestamp: Date.now(),
  })

  it('returns unchanged messages if last message is not assistant', () => {
    const messages = [makeUserMsg()]
    const result = handleEvent(
      { type: 'text', data: { content: 'hi' }, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    )
    expect(result.messages).toBe(messages)
  })

  it('appends text content', () => {
    const messages = [makeUserMsg(), makeAssistantMsg()]
    const result = handleEvent(
      { type: 'text', data: { content: 'hello ' }, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    )
    expect(result.messages[1].content).toBe('hello ')
  })

  it('accumulates text across multiple events', () => {
    let messages: Message[] = [makeUserMsg(), makeAssistantMsg()]
    messages = handleEvent(
      { type: 'text', data: { content: 'hello ' }, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    ).messages
    messages = handleEvent(
      { type: 'text', data: { content: 'world' }, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    ).messages
    expect(messages[1].content).toBe('hello world')
  })

  it('handles done event', () => {
    const messages = [makeUserMsg(), makeAssistantMsg()]
    let cleaned = false
    let streaming = true
    const result = handleEvent(
      { type: 'done', data: {}, timestamp: Date.now() },
      messages,
      null,
      () => {
        cleaned = true
      },
      (v) => {
        streaming = v
      }
    )
    expect(result.messages[1].status).toBe('done')
    expect(cleaned).toBe(true)
    expect(streaming).toBe(false)
  })

  it('handles error event', () => {
    const messages = [makeUserMsg(), makeAssistantMsg({ content: 'partial' })]
    const result = handleEvent(
      { type: 'error', data: { message: 'API error' }, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    )
    expect(result.messages[1].status).toBe('error')
    expect(result.messages[1].content).toContain('API error')
  })

  it('handles tool_use event', () => {
    const messages = [makeUserMsg(), makeAssistantMsg()]
    const result = handleEvent(
      {
        type: 'tool_use',
        data: { id: 'tc1', name: 'bash', input: { command: 'ls' } },
        timestamp: Date.now(),
      },
      messages,
      null,
      () => {},
      () => {}
    )
    expect(result.messages[1].toolCalls).toHaveLength(1)
    expect(result.messages[1].toolCalls![0].name).toBe('bash')
  })

  it('handles tool_result event', () => {
    const toolCall = { id: 'tc1', name: 'bash', input: {}, status: 'running' as const }
    const messages = [makeUserMsg(), makeAssistantMsg({ toolCalls: [toolCall] })]
    const result = handleEvent(
      { type: 'tool_result', data: { id: 'tc1', output: 'file.txt' }, timestamp: Date.now() },
      messages,
      toolCall,
      () => {},
      () => {}
    )
    expect(result.messages[1].toolCalls![0].status).toBe('done')
    expect(result.messages[1].toolCalls![0].output).toBe('file.txt')
    expect(result.toolCall).toBeNull()
  })

  it('handles step_finish event', () => {
    const messages = [makeUserMsg(), makeAssistantMsg({ isThinking: true })]
    const result = handleEvent(
      { type: 'step_finish', data: {}, timestamp: Date.now() },
      messages,
      null,
      () => {},
      () => {}
    )
    expect(result.messages[1].status).toBe('done')
    expect(result.messages[1].isThinking).toBe(false)
  })
})

describe('handleError', () => {
  it('appends error message to last assistant message', () => {
    const messages: Message[] = [
      { id: '0', role: 'user', content: 'hello', status: 'done', timestamp: Date.now() },
      {
        id: '1',
        role: 'assistant',
        content: 'partial',
        status: 'streaming',
        timestamp: Date.now(),
      },
    ]
    const result = handleError(new Error('something broke'), messages)
    expect(result[1].status).toBe('error')
    expect(result[1].content).toContain('something broke')
  })

  it('returns unchanged if last message is not assistant', () => {
    const messages: Message[] = [
      { id: '0', role: 'user', content: 'hello', status: 'done', timestamp: Date.now() },
    ]
    const result = handleError(new Error('err'), messages)
    expect(result).toBe(messages)
  })
})
