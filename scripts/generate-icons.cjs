const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  chunk.writeUInt32BE(crc32(crcBuf), 8 + len);
  return chunk;
}

function generatePng(size) {
  const width = size;
  const height = size;
  
  // Create raw RGBA scanlines: 1 byte filter type (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.45;
  const innerR = width * 0.22;
  const coreR = width * 0.08;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 18;
      let g = 18;
      let b = 18;
      let a = 255;

      // Dark squircle background
      const cornX = Math.abs(dx) - (width * 0.35);
      const cornY = Math.abs(dy) - (height * 0.35);
      const cornerDist = Math.sqrt(Math.max(0, cornX) ** 2 + Math.max(0, cornY) ** 2);
      if (cornerDist > width * 0.12) {
        r = 10; g = 10; b = 10;
      }

      // Golden ring
      if (dist >= outerR - (width * 0.025) && dist <= outerR) {
        r = 245; g = 158; b = 11; // Amber gold
      } else if (dist <= innerR && dist >= innerR - (width * 0.02)) {
        r = 56; g = 189; b = 248; // Sky blue neon
      } else if (dist <= coreR) {
        r = 255; g = 255; b = 255; // White hot core
      } else if (dist < innerR && dist > coreR) {
        // Aperture blades
        const angle = Math.atan2(dy, dx) + Math.PI;
        const segment = Math.floor((angle / (Math.PI * 2)) * 6) % 2;
        if (segment === 0) {
          r = 217; g = 119; b = 6;
        } else {
          r = 28; g = 25; b = 23;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idatData = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', idatData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, makeChunk('IHDR', ihdr), idat, iend]);
}

const pubDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), generatePng(192));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), generatePng(512));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), generatePng(512));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), generatePng(180));
console.log('PWA PNG Icons successfully generated!');
