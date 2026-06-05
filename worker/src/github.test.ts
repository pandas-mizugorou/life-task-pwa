import { describe, expect, it } from 'vitest'
import {
  STATUS_OPTIONS,
  STATUS_ORDER,
  isStatus,
  normalizeAfterId,
  normalizeColor,
} from './github'

describe('normalizeColor', () => {
  it('strips a leading # and lowercases', () => {
    expect(normalizeColor('#FF0000')).toBe('ff0000')
    expect(normalizeColor('AbCdEf')).toBe('abcdef')
  })
  it('falls back to neutral gray for invalid input', () => {
    expect(normalizeColor('')).toBe('8b97b8')
    expect(normalizeColor('xyz')).toBe('8b97b8')
    expect(normalizeColor('12345')).toBe('8b97b8') // too short
    expect(normalizeColor('1234567')).toBe('8b97b8') // too long
    expect(normalizeColor(undefined)).toBe('8b97b8')
  })
})

describe('isStatus', () => {
  it('accepts every known status', () => {
    for (const s of STATUS_ORDER) expect(isStatus(s)).toBe(true)
  })
  it('rejects unknown or non-string values', () => {
    expect(isStatus('Nope')).toBe(false)
    expect(isStatus(123)).toBe(false)
    expect(isStatus(null)).toBe(false)
    expect(isStatus(undefined)).toBe(false)
  })
})

describe('STATUS_OPTIONS', () => {
  it('has a hex option id for every status in STATUS_ORDER', () => {
    for (const s of STATUS_ORDER) {
      expect(STATUS_OPTIONS[s]).toMatch(/^[0-9a-f]+$/)
    }
  })
})

describe('normalizeAfterId', () => {
  it('returns the id for a non-empty string', () => {
    expect(normalizeAfterId('PVTI_abc')).toBe('PVTI_abc')
  })
  it('returns null for empty or non-string input (= top of list)', () => {
    expect(normalizeAfterId('')).toBeNull()
    expect(normalizeAfterId(null)).toBeNull()
    expect(normalizeAfterId(undefined)).toBeNull()
    expect(normalizeAfterId(42)).toBeNull()
  })
})
