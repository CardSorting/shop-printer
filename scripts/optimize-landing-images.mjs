#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const LANDING = path.join(ROOT, 'public/images/landing');
const COUNTERS = path.join(LANDING, 'counters');

/** @param {string} file @param {number} maxWidth @param {number} quality */
async function toWebp(file, maxWidth, quality = 76) {
  const src = path.join(LANDING, file);
  const out = src.replace(/\.png$/i, '.webp');

  try {
    await fs.access(src);
  } catch {
    return null;
  }

  const before = (await fs.stat(src)).size;
  await sharp(src)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(out);
  const after = (await fs.stat(out)).size;
  return { file, before, after, out: path.basename(out) };
}

/** @param {string} name @param {number} maxWidth */
async function counterToWebp(name, maxWidth = 960) {
  const src = path.join(COUNTERS, name);
  const out = src.replace(/\.png$/i, '.webp');

  try {
    await fs.access(src);
  } catch {
    return null;
  }

  const before = (await fs.stat(src)).size;
  await sharp(src)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 74, effort: 4 })
    .toFile(out);
  const after = (await fs.stat(out)).size;
  return { file: `counters/${name}`, before, after, out: path.basename(out) };
}

const heroAndBands = [
  ['hero-food-spread.png', 1920],
  ['food-parallax-morning.png', 1920],
  ['food-parallax-pass.png', 1920],
  ['food-parallax-gather.png', 1920],
  ['getting-here-food-platter.png', 1400],
];

const counters = [
  'counter-07.png',
  'counter-deadpan.png',
  'counter-salt-city-bbq.png',
  'counter-doms-burgers.png',
  'counter-09.png',
  'counter-shwe-letyar.png',
  'counter-chunky.png',
  'counter-marcato.png',
  'counter-caracas.png',
];

const results = [];

for (const [file, width] of heroAndBands) {
  const r = await toWebp(file, width);
  if (r) results.push(r);
}

for (const name of counters) {
  const r = await counterToWebp(name);
  if (r) results.push(r);
}

let saved = 0;
for (const r of results) {
  saved += r.before - r.after;
  console.log(`${r.file}: ${(r.before / 1024 / 1024).toFixed(2)}MB → ${(r.after / 1024).toFixed(0)}KB (${r.out})`);
}

console.log(`\nTotal saved: ${(saved / 1024 / 1024).toFixed(1)}MB across ${results.length} files`);
