import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gif = join(root, 'public/Woodbine.gif');

const outputs = [
  { file: 'public/icon.png', size: 512 },
  { file: 'public/favicon.png', size: 192 },
  { file: 'public/favicon-32.png', size: 32 },
  { file: 'public/apple-touch-icon.png', size: 180 },
];

await Promise.all(
  outputs.map(({ file, size }) =>
    sharp(gif, { animated: false })
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(join(root, file)),
  ),
);

const icoSources = [
  join(root, 'public/favicon-32.png'),
  join(root, 'public/favicon.png'),
  join(root, 'public/apple-touch-icon.png'),
];

await new Promise((resolve, reject) => {
  execFile('magick', [...icoSources, join(root, 'public/favicon.ico')], (error) => {
    if (error) reject(error);
    else resolve(undefined);
  });
});

await new Promise((resolve, reject) => {
  execFile('cp', [join(root, 'public/favicon.ico'), join(root, 'src/app/favicon.ico')], (error) => {
    if (error) reject(error);
    else resolve(undefined);
  });
});

console.log(
  'Generated favicon assets from Woodbine.gif:',
  [...outputs.map(({ file }) => file), 'public/favicon.ico', 'src/app/favicon.ico'].join(', '),
);
