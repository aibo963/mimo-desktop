import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToastStore } from './toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToastStore', () => {
  it('adds a toast', () => {
    useToastStore.getState().addToast('Hello', 'success')
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Hello')
    expect(toasts[0].type).toBe('success')
  })

  it('auto-removes toast after 3 seconds', () => {
    useToastStore.getState().addToast('Test', 'info')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('manually removes a toast', () => {
    useToastStore.getState().addToast('Test', 'error')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().removeToast(id)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('supports multiple toasts', () => {
    useToastStore.getState().addToast('First', 'info')
    useToastStore.getState().addToast('Second', 'success')
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })

  it('defaults to info type', () => {
    useToastStore.getState().addToast('Test')
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })
})
