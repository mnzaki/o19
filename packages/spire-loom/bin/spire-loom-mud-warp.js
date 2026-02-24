#!/usr/bin/env node
/**
 * spire-loom-mud-warp CLI Entry Point
 * 
 * "Enter the weave through the MUD."
 * 
 * Interactive Ink-based UI starting directly in MUD mode.
 * A text adventure interface for exploring the spiral architecture.
 * 
 * Usage:
 *   spire-loom-mud-warp         # Launch directly into MUD mode
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve tsx from spire-loom's node_modules
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const cliPath = join(__dirname, '..', 'cli', 'interactive', 'index.tsx');

// Force MUD mode by passing --mud flag
const args = ['--mud', ...process.argv.slice(2)];

const child = spawn(
  tsxPath,
  [cliPath, ...args],
  {
    stdio: 'inherit',
    cwd: process.cwd()
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
