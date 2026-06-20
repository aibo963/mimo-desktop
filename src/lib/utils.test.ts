import { describe, it, expect } from 'vitest'
import { cn, formatTime } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const hide = false
    const result = cn('base', hide && 'hidden', 'end')
    expect(result).toBe('base end')
  })

  it('deduplicates tailwind classes', () => {
    const result = cn('p-2 p-4')
    expect(result).toBe('p-4')
  })
})

describe('formatTime', () => {
  it('returns 刚刚 for recent timestamps', () => {
    const now = Date.now()
    expect(formatTime(now)).toBe('刚刚')
  })

  it('returns minutes ago', () => {
    const fiveMinAgo = Date.now() - 5 * 60_000
    expect(formatTime(fiveMinAgo)).toBe('5分钟前')
  })

  it('returns hours ago', () => {
    const twoHoursAgo = Date.now() - 2 * 3_600_000
    expect(formatTime(twoHoursAgo)).toBe('2小时前')
  })

  it('returns date format', () => {
    const ts = new Date(2026, 0, 15, 14, 30).getTime()
    const result = formatTime(ts, 'date')
    expect(result).toBe('1/15')
  })

  it('returns datetime format', () => {
    const ts = new Date(2026, 0, 15, 14, 30).getTime()
    const result = formatTime(ts, 'datetime')
    expect(result).toBe('1/15 14:30')
  })

  it('returns relative time by default', () => {
    const now = Date.now()
    expect(formatTime(now)).toBe('刚刚')
  })
})
