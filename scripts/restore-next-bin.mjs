#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const realBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');
const backupBin = path.join('node_modules', 'next', 'dist', 'bin', 'next.real.js');

if (fs.existsSync(backupBin)) {
  fs.copyFileSync(backupBin, realBin);
  fs.unlinkSync(backupBin);
  console.log('Restored original next CLI.');
}
