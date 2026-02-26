#!/usr/bin/env node
/**
 * spire-loom-mud-warp CLI Entry Point
 *
 * "Enter the weave through the MUD."
 *
 * Interactive Ink-based UI starting directly in MUD mode.
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

// Spawn node with tsx loader, forcing MUD mode
const spawnArgs = [
  '--import',
  'tsx',
  '-e',
  `import { findWorkspaceConfig } from '@o19/spire-loom/cli';
   import { main } from '${interactiveEntry}';
   const config = await findWorkspaceConfig();
   if (!config) {
     console.error("Couldn't find WARP.ts in workspace loom dir");
     process.exit(1);
   }
   const warpPath = config.workspace.warpPath;
   import(warpPath)
    .then(mod => {
      mod = mod.default?.weave ? mod : mod.default;
      return main(mod, config, 'mud');
    })`,
  '--',
  ...process.argv.slice(1)
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
