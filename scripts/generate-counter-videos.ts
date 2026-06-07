/**
 * Generate vendor hover-loop videos from still images (ffmpeg cinematic motion).
 *
 *   npm run generate:counter-videos
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/videos/landing/counters');
const PUBLIC_DIR = path.join(ROOT, 'public');

type MotionProfile = 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left' | 'drift-up';

const COUNTERS = [
  { img: '/images/landing/counters/counter-07.png', motion: 'zoom-in' as MotionProfile },
  { img: '/images/landing/counters/counter-deadpan.png', motion: 'pan-right' as MotionProfile },
  { img: '/images/landing/counters/counter-salt-city-bbq.png', motion: 'zoom-out' as MotionProfile },
  { img: '/images/landing/counters/counter-doms-burgers.png', motion: 'pan-left' as MotionProfile },
  { img: '/images/landing/counters/counter-09.png', motion: 'drift-up' as MotionProfile },
  { img: '/images/landing/counters/counter-shwe-letyar.png', motion: 'pan-right' as MotionProfile },
  { img: '/images/landing/counters/counter-chunky.png', motion: 'zoom-in' as MotionProfile },
  { img: '/images/landing/counters/counter-marcato.png', motion: 'pan-left' as MotionProfile },
  { img: '/images/landing/counters/counter-caracas.png', motion: 'zoom-out' as MotionProfile },
];

function motionFilter(profile: MotionProfile, width: number, height: number): string {
  const frames = 72;
  const rate = 24;
  const zoomMax = profile === 'zoom-out' ? 1.12 : 1.1;

  switch (profile) {
    case 'zoom-in':
      return `zoompan=z='min(1.0+on/${frames}*${zoomMax - 1},${zoomMax})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${rate}`;
    case 'zoom-out':
      return `zoompan=z='if(lte(on,1),${zoomMax},max(1.0,${zoomMax}-on/${frames}*${zoomMax - 1}))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${rate}`;
    case 'pan-right':
      return `zoompan=z='1.08':x='min(iw-iw/zoom,on/${frames}*(iw-iw/zoom))':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${rate}`;
    case 'pan-left':
      return `zoompan=z='1.08':x='max(0,(iw-iw/zoom)-on/${frames}*(iw-iw/zoom))':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${rate}`;
    case 'drift-up':
      return `zoompan=z='1.06':x='iw/2-(iw/zoom/2)':y='max(0,(ih-ih/zoom)-on/${frames}*(ih-ih/zoom)*0.65)':d=${frames}:s=${width}x${height}:fps=${rate}`;
  }
}

function generateVideo(inputPath: string, outputPath: string, profile: MotionProfile) {
  const width = 960;
  const height = 720;
  const vf = `${motionFilter(profile, width, height)},format=yuv420p`;

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loop',
      '1',
      '-i',
      inputPath,
      '-vf',
      vf,
      '-t',
      '3',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '26',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { stdio: 'inherit' },
  );
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const counter of COUNTERS) {
    const inputPath = path.join(PUBLIC_DIR, counter.img.replace(/^\//, ''));
    const basename = path.basename(counter.img, path.extname(counter.img));
    const outputPath = path.join(OUT_DIR, `${basename}.mp4`);

    if (!existsSync(inputPath)) {
      console.warn(`Skip ${basename}: missing ${inputPath}`);
      continue;
    }

    console.log(`\n→ ${basename} (${counter.motion})`);
    generateVideo(inputPath, outputPath, counter.motion);
    console.log(`  ✓ ${outputPath}`);
  }
}

main();
