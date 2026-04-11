#!/usr/bin/env node
/**
 * Generates black-frame Y4M stub files for Playwright fake-webcam testing.
 *
 * Run once: node tests/playwright/fixtures/generate-stubs.js
 *
 * Output: tests/playwright/fixtures/black-frame-320x240.y4m
 * Size:   ~115 KB (1 frame at 320x240 YUV420)
 *
 * Y4M format (YUV4MPEG2):
 *   Header: "YUV4MPEG2 W<width> H<height> F<fps_num>:<fps_den> Ip A0:0 C420\n"
 *   Per frame: "FRAME\n" + Y-plane (W*H bytes) + Cb-plane (W/2*H/2) + Cr-plane (W/2*H/2)
 *   Black pixel: Y=16, Cb=128, Cr=128 (limited-range YUV, compatible with most decoders)
 */

const fs = require('fs');
const path = require('path');

function makeY4M(width, height, fps = '1:1') {
  const header = `YUV4MPEG2 W${width} H${height} F${fps} Ip A0:0 C420\n`;
  const frameHeader = Buffer.from('FRAME\n');

  // Luma plane: 16 = black in limited-range YUV (0 also works, using 16 for spec compliance)
  const yPlane = Buffer.alloc(width * height, 16);
  // Chroma planes: 128 = neutral (zero chroma)
  const chromaSize = (width >> 1) * (height >> 1);
  const cbPlane = Buffer.alloc(chromaSize, 128);
  const crPlane = Buffer.alloc(chromaSize, 128);

  return Buffer.concat([
    Buffer.from(header),
    frameHeader,
    yPlane, cbPlane, crPlane,
  ]);
}

const outDir = path.join(__dirname);

// 320x240 @ 1fps — Chromium's fake video device loops this single black frame
const buf = makeY4M(320, 240, '1:1');
const outPath = path.join(outDir, 'black-frame-320x240.y4m');
fs.writeFileSync(outPath, buf);
console.log(`Written ${outPath} (${buf.length} bytes, ${(buf.length / 1024).toFixed(1)} KB)`);
