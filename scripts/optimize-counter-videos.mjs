#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VIDEO_DIR = path.join(ROOT, 'public/videos/landing/counters');

const FILES = [
  'counter-09.mp4',
  'counter-caracas.mp4',
  'counter-salt-city-bbq.mp4',
];

function hasFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!hasFfmpeg()) {
  console.error('ffmpeg not found — install ffmpeg to compress counter videos');
  process.exit(1);
}

let saved = 0;

for (const file of FILES) {
  const src = path.join(VIDEO_DIR, file);
  const tmp = path.join(VIDEO_DIR, `.${file}.tmp.mp4`);

  if (!fs.existsSync(src)) {
    console.warn(`skip missing ${file}`);
    continue;
  }

  const before = fs.statSync(src).size;

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      src,
      '-an',
      '-vf',
      'scale=960:-2',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '28',
      '-movflags',
      '+faststart',
      tmp,
    ],
    { stdio: 'ignore' },
  );

  fs.renameSync(tmp, src);
  const after = fs.statSync(src).size;
  saved += before - after;
  console.log(`${file}: ${(before / 1024 / 1024).toFixed(2)}MB → ${(after / 1024).toFixed(0)}KB`);
}

console.log(`\nTotal saved: ${(saved / 1024 / 1024).toFixed(1)}MB`);
