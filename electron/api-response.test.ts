import { describe, it, expect } from 'vitest'
import { createSuccess, createError, wrapHandler } from './api-response'

describe('api-response', () => {
  describe('createSuccess', () => {
    it('creates success response without data', () => {
      const result = createSuccess()
      expect(result).toEqual({ success: true, data: undefined })
    })

    it('creates success response with data', () => {
      const result = createSuccess({ name: 'test' })
      expect(result).toEqual({ success: true, data: { name: 'test' } })
    })

    it('creates success response with primitive data', () => {
      expect(createSuccess(42)).toEqual({ success: true, data: 42 })
      expect(createSuccess('ok')).toEqual({ success: true, data: 'ok' })
      expect(createSuccess(true)).toEqual({ success: true, data: true })
    })
  })

  describe('createError', () => {
    it('creates error response with message', () => {
      const result = createError('something failed')
      expect(result).toEqual({ success: false, error: 'something failed', code: undefined })
    })

    it('creates error response with code', () => {
      const result = createError('not found', 'NOT_FOUND')
      expect(result).toEqual({ success: false, error: 'not found', code: 'NOT_FOUND' })
    })
  })

  describe('wrapHandler', () => {
    it('wraps sync success', async () => {
      const result = await wrapHandler(() => 42)
      expect(result).toEqual({ success: true, data: 42 })
    })

    it('wraps async success', async () => {
      const result = await wrapHandler(async () => 'hello')
      expect(result).toEqual({ success: true, data: 'hello' })
    })

    it('wraps sync error', async () => {
      const result = await wrapHandler(() => {
        throw new Error('fail')
      })
      expect(result).toEqual({ success: false, error: 'fail' })
    })

    it('wraps async error', async () => {
      const result = await wrapHandler(async () => {
        throw new Error('async fail')
      })
      expect(result).toEqual({ success: false, error: 'async fail' })
    })

    it('handles non-Error thrown values', async () => {
      const result = await wrapHandler(() => {
        throw 'string error'
      })
      expect(result).toEqual({ success: false, error: 'Unknown error' })
    })

    it('handles void return', async () => {
      const result = await wrapHandler(() => {})
      expect(result).toEqual({ success: true, data: undefined })
    })
  })
})
