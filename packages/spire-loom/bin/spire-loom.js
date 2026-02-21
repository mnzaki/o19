#!/usr/bin/env node
/**
 * Spire-Loom CLI Entry Point
 * 
 * This script runs the CLI via tsx, resolving it from spire-loom's
 * own dependencies regardless of where it's invoked from.
 * 
 * tsx is faster than ts-node and handles ESM out of the box.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve tsx from spire-loom's node_modules
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const cliPath = join(__dirname, '..', 'cli.ts');

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
