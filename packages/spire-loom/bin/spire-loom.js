#!/usr/bin/env node
/**
 * spire-loom CLI Entry Point
 * 
 * "The loom that weaves spires from surfaces."
 * 
 * Minimal command-line interface for code generation.
 * 
 * For interactive mode:
 *   - spire-loom-warp        (menu UI)
 *   - spire-loom-mud-warp    (MUD text adventure)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve tsx from spire-loom's node_modules
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const cliPath = join(__dirname, '..', 'cli', 'index.ts');

// Run tsx with the CLI
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
