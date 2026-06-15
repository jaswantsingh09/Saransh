// Generate the Saransh app icon (1024x1024 PNG) with no external deps.
// Mark: indigo→violet rounded square + three descending white "summary lines".
const zlib = require('zlib')
const fs = require('fs')

const S = 1024
const out = Buffer.alloc(S * S * 4)

// colors
const indigo = [99, 102, 241]
const violet = [139, 92, 246]
const white = [255, 255, 255]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

// signed distance to a rounded rect centered at (cx,cy) with half-extents (hx,hy) and radius r
function rrSDF(px, py, cx, cy, hx, hy, r) {
  const dx = Math.abs(px - cx) - (hx - r)
  const dy = Math.abs(py - cy) - (hy - r)
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(dx, dy), 0) - r
}
const cover = (sdf) => Math.min(Math.max(0.5 - sdf, 0), 1) // 1px AA

// three left-aligned descending pill bars (summary motif)
const barH = 96
const bx0 = 286
const widths = [452, 326, 210]
const cys = [366, 512, 658]

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    // background gradient (diagonal indigo→violet) with a soft top-left highlight
    let t = (x + y) / (2 * S)
    let bg = mix(indigo, violet, t)
    const hl = Math.max(0, 1 - Math.hypot(x - 300, y - 280) / 900) * 0.12
    bg = bg.map((v) => Math.min(255, v + 255 * hl))

    // rounded-square app shape
    const maskA = cover(rrSDF(x, y, S / 2, S / 2, S / 2, S / 2, 184))

    // bars
    let barA = 0
    for (let i = 0; i < 3; i++) {
      const w = widths[i]
      const cx = bx0 + w / 2
      barA = Math.max(barA, cover(rrSDF(x, y, cx, cys[i], w / 2, barH / 2, barH / 2)))
    }

    const col = mix(bg, white, barA)
    const o = (y * S + x) * 4
    out[o] = col[0] | 0
    out[o + 1] = col[1] | 0
    out[o + 2] = col[2] | 0
    out[o + 3] = (maskA * 255) | 0
  }
}

// ---- minimal PNG encoder (RGBA, 8-bit) ----
const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
// add filter byte 0 per scanline
const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  out.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
const dest = process.argv[2] || 'saransh-icon.png'
fs.writeFileSync(dest, png)
console.log('wrote', dest, png.length, 'bytes')
