#!/usr/bin/env node
/**
 * Temporarily wrap `next build` with --turbopack for Firebase deploys.
 * Patches node_modules/next/dist/bin/next (the real binary; .bin/next is a symlink).
 */
import fs from 'node:fs';
import path from 'node:path';

const realBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');
const backupBin = path.join('node_modules', 'next', 'dist', 'bin', 'next.real.js');

if (!fs.existsSync(realBin)) {
  console.error('Could not find node_modules/next/dist/bin/next');
  process.exit(1);
}

if (!fs.existsSync(backupBin)) {
  fs.copyFileSync(realBin, backupBin);
}

const wrapper = `#!/usr/bin/env node
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const realBin = path.join(__dirname, "next.real.js");
let args = process.argv.slice(2);

if (args[0] === "build") {
  args = args.slice(1);
  for (const flag of ["--turbopack", "--no-lint"]) {
    if (!args.includes(flag)) args.push(flag);
  }
  args = ["build", ...args];
}

const result = spawnSync(process.execPath, [realBin, ...args], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
`;

fs.writeFileSync(realBin, wrapper, { mode: 0o755 });
console.log('Patched next build to use Turbopack (--turbopack --no-lint).');
