import { describe, expect, it } from 'vitest'
import {
  STATUS_OPTIONS,
  STATUS_ORDER,
  isStatus,
  normalizeAfterId,
  normalizeColor,
  safeImagePath,
  signPath,
  verifyPath,
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

describe('image path signing (HMAC)', () => {
  const secret = 'a-long-random-passphrase'
  const path = 'assets/2026/07/1783182639671-ttioruug.png'

  it('signPath is deterministic for the same secret + path', async () => {
    const a = await signPath(secret, path)
    const b = await signPath(secret, path)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/) // 32-byte SHA-256 in hex
  })

  it('verifyPath accepts a signature produced for that exact path', async () => {
    const sig = await signPath(secret, path)
    expect(await verifyPath(secret, path, sig)).toBe(true)
  })

  it('rejects a signature made for a DIFFERENT path (no path swapping)', async () => {
    const sig = await signPath(secret, path)
    const other = 'assets/2026/07/evil.png'
    expect(await verifyPath(secret, other, sig)).toBe(false)
  })

  it('rejects a signature made with a DIFFERENT secret (key is required)', async () => {
    const sig = await signPath('other-secret', path)
    expect(await verifyPath(secret, path, sig)).toBe(false)
  })

  it('rejects an empty / tampered signature', async () => {
    expect(await verifyPath(secret, path, '')).toBe(false)
    const sig = await signPath(secret, path)
    // Flip one hex char.
    const tampered = (sig[0] === '0' ? '1' : '0') + sig.slice(1)
    expect(await verifyPath(secret, path, tampered)).toBe(false)
  })

  it('changing a single byte of the path changes the signature', async () => {
    const a = await signPath(secret, path)
    const b = await signPath(secret, path.replace('.png', '.PNG'))
    expect(a).not.toBe(b)
  })
})

describe('safeImagePath (traversal / scope guard)', () => {
  it('accepts a well-formed image path under assets/ and returns its MIME', () => {
    expect(safeImagePath('assets/2026/07/123-abc.png')).toEqual({ ok: true, mime: 'image/png' })
    expect(safeImagePath('assets/2026/07/x.jpg')).toEqual({ ok: true, mime: 'image/jpeg' })
    expect(safeImagePath('assets/x.gif').mime).toBe('image/gif')
    expect(safeImagePath('assets/x.webp').mime).toBe('image/webp')
  })

  it('rejects path traversal even when it starts with assets/ and ends in an image ext', () => {
    expect(safeImagePath('assets/../secret.png').ok).toBe(false)
    expect(safeImagePath('assets/foo/../../etc/passwd.png').ok).toBe(false)
    expect(safeImagePath('assets/..%2f.png').ok).toBe(false) // literal ".." substring
  })

  it('rejects paths outside assets/ or with non-image extensions', () => {
    expect(safeImagePath('worker/src/github.ts').ok).toBe(false)
    expect(safeImagePath('assets/config.json').ok).toBe(false)
    expect(safeImagePath('assets/script.svg').ok).toBe(false) // SVG stays out
    expect(safeImagePath('/assets/x.png').ok).toBe(false) // leading slash
    expect(safeImagePath('README.md').ok).toBe(false)
    expect(safeImagePath('assets/noext').ok).toBe(false)
  })
})
