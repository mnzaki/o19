#!/usr/bin/env node
/**
 * spire-loom-warp CLI Entry Point
 *
 * "Enter the weave through the WARP."
 *
 * Interactive Ink-based UI with menu navigation.
 * Uses the inversion pattern: WARP.ts exports loom, which calls the CLI.
 */

import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup Context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We bind 'require' to the USER'S current working directory.
const requireUser = createRequire(path.join(process.cwd(), 'package.json'));

// Locate the interactive CLI entry point
const interactiveEntry = path.join(__dirname, '..', 'cli', 'interactive', 'index.tsx');

// Check if User has TSX installed
try {
  requireUser.resolve('tsx');
} catch (e) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: "tsx" is required as a peer dependency.');
  console.error('Please run: npm install -D tsx');
  process.exit(1);
}

// Determine mode from args
const args = process.argv.slice(1);
const hasMudFlag = args.includes('--mud') || args.includes('-m');
const hasDressingFlag = args.includes('--dressing') || args.includes('-d');

let mode = 'menu';
if (hasMudFlag) mode = 'mud';
if (hasDressingFlag) mode = 'dressing';

// Spawn node with tsx loader
const spawnArgs = [
  '--import',
  'tsx',
  '-e',
  `import { findWorkspaceConfig } from '@o19/spire-loom/cli';
  const workspace = await findWorkspaceConfig();
  if (!workspace) {
    console.error("Couldn't find WARP.ts in workspace loom dir");
    process.exit(1);
  }
  const { /* warp: { loom }, */ warpPath } = workspace;
  import { main } from '${interactiveEntry}';
  import(warpPath)
    .then(mod => {
      const loom = mod.default?.weave ? mod.default : mod;
      // it's VERY IMPORTANT that controlled flow is reversed
      // and we pass the weave function from the loom object
      // exported BY the loaded WARP.ts! This sidesteps identity
      // (instanceof) issues
      return main(loom.weave, mod)
    })`,
  '--',
  ...args
];

const child = spawn(process.execPath, spawnArgs, {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  if (child) child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM');
});
