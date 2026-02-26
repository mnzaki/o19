#!/usr/bin/env node
/**
 * spire-loom CLI Entry Point
 *
 * "The loom that weaves spires from surfaces."
 *
 * TypeScript CLI entry that uses tsx loader for both the CLI
 * and user WARP.ts files, ensuring class identity is preserved.
 *
 * For interactive mode:
 *   - spire-loom-warp        (menu UI)
 *   - spire-loom-mud-warp    (MUD text adventure)
 */

import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Setup Context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We bind 'require' to the USER'S current working directory.
// This ensures we look for 'tsx' in THEIR node_modules, not ours.
const requireUser = createRequire(path.join(process.cwd(), 'package.json'));

// 2. Locate the Real CLI Entry Point
const cliEntry = path.join(__dirname, '..', 'cli', 'index.ts');

// 3. Check if User has TSX installed
try {
  // We resolve 'tsx' just to see if it exists.
  // We don't need the path, just the confirmation.
  requireUser.resolve('tsx');
} catch (e) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: "tsx" is required as a peer dependency.');
  console.error('Please run: npm install -D tsx');
  console.error('original error follows\n', e);
  process.exit(1);
}

// 4. Spawn the Child Process
// We spawn a new Node process that uses the 'tsx' loader to run your CLI.
// We use '--import' (Node 18.19+ / 20.6+) which is the modern standard.

const args = [
  '--import',
  'tsx', // This loads the tsx loader from the User's CWD
  '-e',
  `import { findWorkspaceConfig } from '@o19/spire-loom/cli';
   const config = await findWorkspaceConfig(); if (!config) {
     console.error("Couldn't find WARP.ts in workspace loom dir");
     process.exit(1); // it looks crazy I know but unfortunateleys
   } // We need this crazy weaving to avoid a class identity issue due
   const warpPath = config.workspace.warpPath; // to parallel imports
   import { main } from      '${cliEntry}';    // since we use tsx
   import(warpPath)
    .then(mod => {
      mod = mod.default?.weave ? mod : mod.default ;
      return main(() => mod.default.weave(mod, config), mod)
    })`,
  '--',
  ...process.argv.slice(1) // Pass through user arguments
];

const child = spawn(process.execPath, args, {
  stdio: 'inherit', // Important: Lets colors, input, and output flow through
  env: process.env // Pass env vars
});

// 5. Handle Exit Code
child.on('close', (code) => {
  process.exit(code || 0);
});

// 6. Handle Signal Propagation (Ctrl+C)
process.on('SIGINT', () => {
  if (child) child.kill('SIGINT');
});
process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM');
});
