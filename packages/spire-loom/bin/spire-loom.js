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

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Check for early-exit args (help/version) that don't need WARP loading
const userArgs = process.argv.slice(2);
const isHelp = userArgs.includes('--help') || userArgs.includes('-h');
const isVersion = userArgs.includes('--version') || userArgs.includes('-V');

let args;
if (isHelp || isVersion) {
  // Fast path: don't load WARP, just show help/version
  args = [
    '--import',
    'tsx',
    '-e',
    `import { main, handleCommonArgs, showHelp, showVersion, parseArgs } from '${cliEntry}';
     const args = process.argv.slice(2);
     const opts = parseArgs(args);
     if (opts.help) { showHelp(); process.exit(0); }
     if (opts.version) { showVersion(); process.exit(0); }`,
    '--',
    ...userArgs
  ];
} else {
  // Normal path: load WARP and run full CLI
  args = [
    '--import',
    'tsx',
    '-e',
    `
    import * as path from 'node:path'

    import { findWorkspaceConfig } from '@o19/spire-loom/cli';
    const workspace = findWorkspaceConfig();
    if (!workspace) {
      console.error("Couldn't find WARP.ts in workspace loom dir");
      process.exit(1);
    }
    const originalCwd = process.cwd();
    process.chdir(workspace.root)

    const { loomFiles } = workspace;
    const loomMods = {}
    for (const loomFile of loomFiles) {
      const parts = loomFile.split('/')
      const file = \`./\${parts[parts.length - 2]}/\${parts[parts.length - 1]}\`
      console.log({ loomPath: file })
      loomMods[path.basename(file)] = await import(file);
    }
    import { main } from '@o19/spire-loom/cli' //${cliEntry}'
    main(loomMods)
    `,
    '--',
    ...userArgs
  ];
}

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
