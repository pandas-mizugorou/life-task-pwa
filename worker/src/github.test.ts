import { describe, expect, it } from 'vitest'
import {
  ApiError,
  STATUS_OPTIONS,
  STATUS_ORDER,
  isStatus,
  normalizeAfterId,
  normalizeColor,
  uploadImage,
} from './github'
import type { Env } from './types'

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

describe('uploadImage', () => {
  // A fake R2 bucket that records the last put() so tests can assert on the key.
  function fakeEnv(overrides: Partial<Env> = {}): { env: Env; puts: Array<{ key: string; contentType?: string }> } {
    const puts: Array<{ key: string; contentType?: string }> = []
    const env = {
      GITHUB_PAT: 'x',
      APP_PASSPHRASE: 'x',
      IMAGES_BASE_URL: 'https://img.example.com',
      IMAGES: {
        async put(key: string, _value: unknown, options?: { httpMetadata?: { contentType?: string } }) {
          puts.push({ key, contentType: options?.httpMetadata?.contentType })
          return {}
        },
      },
      ...overrides,
    } as unknown as Env
    return { env, puts }
  }

  it('rejects when the R2 bucket / base URL is not configured (501)', async () => {
    const { env } = fakeEnv({ IMAGES: undefined })
    await expect(uploadImage(env, new ArrayBuffer(4), 'image/png')).rejects.toMatchObject({ status: 501 })
    const { env: env2 } = fakeEnv({ IMAGES_BASE_URL: undefined })
    await expect(uploadImage(env2, new ArrayBuffer(4), 'image/png')).rejects.toMatchObject({ status: 501 })
  })

  it('rejects an unsupported content type (415)', async () => {
    const { env } = fakeEnv()
    await expect(uploadImage(env, new ArrayBuffer(4), 'image/svg+xml')).rejects.toMatchObject({ status: 415 })
    await expect(uploadImage(env, new ArrayBuffer(4), 'application/pdf')).rejects.toMatchObject({ status: 415 })
  })

  it('rejects an empty image (400)', async () => {
    const { env } = fakeEnv()
    await expect(uploadImage(env, new ArrayBuffer(0), 'image/png')).rejects.toMatchObject({ status: 400 })
  })

  it('rejects an oversized image (413)', async () => {
    const { env } = fakeEnv()
    const tooBig = new ArrayBuffer(8 * 1024 * 1024 + 1)
    await expect(uploadImage(env, tooBig, 'image/png')).rejects.toMatchObject({ status: 413 })
  })

  it('stores the bytes and returns a public URL under the base with the right extension', async () => {
    const { env, puts } = fakeEnv()
    const url = await uploadImage(env, new ArrayBuffer(16), 'image/jpeg')
    // URL = base + "/" + key; key ends with the mapped extension (jpeg -> jpg).
    expect(url).toMatch(/^https:\/\/img\.example\.com\/\d{4}\/\d{2}\/\d+-[a-z0-9]+\.jpg$/)
    expect(puts).toHaveLength(1)
    expect(puts[0].contentType).toBe('image/jpeg')
    // The stored key is exactly the URL with the base stripped.
    expect(`https://img.example.com/${puts[0].key}`).toBe(url)
  })

  it('trims a trailing slash on the base URL so the result never has //', async () => {
    const { env } = fakeEnv({ IMAGES_BASE_URL: 'https://img.example.com/' })
    const url = await uploadImage(env, new ArrayBuffer(16), 'image/webp')
    expect(url).toMatch(/^https:\/\/img\.example\.com\/\d{4}\//)
    expect(url).not.toContain('.com//')
    expect(url.endsWith('.webp')).toBe(true)
  })

  it('surfaces errors as ApiError instances', async () => {
    const { env } = fakeEnv()
    await expect(uploadImage(env, new ArrayBuffer(4), 'text/plain')).rejects.toBeInstanceOf(ApiError)
  })
})
