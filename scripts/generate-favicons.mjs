import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public/icon.svg'));

const outputs = [
  { file: 'public/icon.png', size: 512 },
  { file: 'public/favicon.png', size: 192 },
  { file: 'public/favicon-32.png', size: 32 },
];

await Promise.all(
  outputs.map(({ file, size }) =>
    sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(join(root, file)),
  ),
);

const icoSizes = outputs.map(({ file }) => join(root, file));
await new Promise((resolve, reject) => {
  import('node:child_process').then(({ execFile }) => {
    execFile('magick', [...icoSizes, join(root, 'public/favicon.ico')], (error) => {
      if (error) reject(error);
      else resolve(undefined);
    });
  });
});

console.log('Generated favicon assets:', [...outputs.map(({ file }) => file), 'public/favicon.ico'].join(', '));
