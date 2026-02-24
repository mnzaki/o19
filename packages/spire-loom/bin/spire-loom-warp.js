#!/usr/bin/env node
/**
 * spire-loom-warp CLI Entry Point
 * 
 * "Enter the weave through the WARP."
 * 
 * Interactive Ink-based UI with menu navigation.
 * Includes access to MUD mode via menu.
 * 
 * Usage:
 *   spire-loom-warp              # Launch interactive UI
 *   spire-loom-warp --dressing   # Start in dressing editor
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve tsx from spire-loom's node_modules
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const cliPath = join(__dirname, '..', 'cli', 'interactive', 'index.tsx');

// Pass through all arguments
const child = spawn(
  tsxPath,
  [cliPath, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    cwd: process.cwd()
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
