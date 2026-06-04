// Rasterize the SVG app icons to PNG (for iOS apple-touch + Android/PWA).
// Run:  node scripts/gen-icons.mjs   (or: npm run icons)
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pub = (p) => resolve(root, 'public', p)

const anySvg = readFileSync(pub('icon.svg'))
const maskSvg = readFileSync(pub('icon-maskable.svg'))

const jobs = [
  [anySvg, 192, 'icon-192.png'],
  [anySvg, 512, 'icon-512.png'],
  [maskSvg, 512, 'icon-512-maskable.png'],
  [maskSvg, 180, 'apple-touch-icon.png'],
]

for (const [buf, size, out] of jobs) {
  await sharp(buf, { density: 400 }).resize(size, size).png().toFile(pub(out))
  console.log('wrote', out, `${size}x${size}`)
}
