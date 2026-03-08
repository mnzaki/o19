#!/usr/bin/env node
/**
 * spire-loom Interactive CLI
 *
 * "Enter the weave through the WARP."
 *
 * An interactive CLI for the spire-loom code generator,
 * built with Ink (React for terminals).
 *
 * Usage:
 *   spire-loom-warp              # Launch interactive menu
 *   spire-loom-warp --help       # Show help
 *   spire-loom-warp --version    # Show version
 *   spire-loom-warp --mud        # Launch in MUD mode
 *   spire-loom-warp --dressing   # Launch dressing editor
 *   spire-loom-warp -w ./foo     # Use different workspace
 */

import React from 'react';
import { render } from 'ink';
import { MainMenu } from './menus/main.js';
import { DressingEditor } from './dressing/editor.js';
import { MudMode } from './mud/mode.js';
import { DressingService } from './dressing/service.js';
import { parseArgs, showVersion, showHelp, handleCommonArgs } from '../lib.js';
import type { WeaverConfig } from '@o19/spire-loom/machinery/weaver';

export { parseArgs, showVersion, showHelp, handleCommonArgs } from '../lib.js';

// Version info
const VERSION = '1.0.0';

// Parse arguments from process.argv
function parseFlags() {
  const args = process.argv.slice(2);
  return {
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
    mud: args.includes('--mud') || args.includes('-m'),
    dressing: args.includes('--dressing') || args.includes('-d'),
    workspace: getArgValue(args, '--workspace', '-w') || process.cwd()
  };
}

function getArgValue(args: string[], longFlag: string, shortFlag: string): string | null {
  const index = args.findIndex((arg) => arg === longFlag || arg === shortFlag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  const arg = args.find((arg) => arg.startsWith(`${longFlag}=`));
  if (arg) {
    return arg.split('=')[1];
  }
  return null;
}

/**
 * Check if running in a TTY (required for Ink)
 */
function checkTTY(): void {
  if (!process.stdin.isTTY) {
    console.error(`
🧵 spire-loom-interactive requires an interactive terminal (TTY).

The interactive CLI uses Ink (React for terminals) which needs:
  - A real terminal with stdin in raw mode
  - Cannot run through pipes, redirects, or non-interactive shells

Try running directly in a terminal:
  node packages/spire-loom/bin/spire-loom-warp.js

Or use the classic CLI:
  pnpm spire-loom
`);
    process.exit(1);
  }
}

/**
 * Main entry point for interactive CLI.
 * @param warp - The loaded WARP module (from WARP.ts)
 * @param config - Weaver configuration
 * @param mode - Which interactive mode to launch
 */
export async function main(
  warp: Record<string, any>,
  config: WeaverConfig,
  mode: 'menu' | 'mud' | 'dressing' = 'menu'
): Promise<void> {
  const args = process.argv.slice(2);

  // Handle common args (help, version, graph)
  const handled = await handleCommonArgs(args, warp, 'interactive');
  if (handled) {
    process.exit(0);
  }

  checkTTY();

  // Load dressing for the workspace
  let dressing;
  try {
    const service = new DressingService();
    dressing = await service.load(config.workspace.root, { mode: 'loose' });
  } catch (err) {
    console.error(`Failed to dress the loom: ${(err as Error).message}`);
    process.exit(1);
  }

  // Render appropriate view
  if (mode === 'mud') {
    render(
      <MudMode dressing={dressing} warp={warp} config={config} onExit={() => process.exit(0)} />
    );
  } else if (mode === 'dressing') {
    render(<DressingEditor workspaceRoot={config.workspace.root} warp={warp} config={config} />);
  } else {
    render(<MainMenu workspaceRoot={config.workspace.root} warp={warp} config={config} />);
  }
}

/**
 * Convenience function for MUD mode.
 */
export async function mud(warp: Record<string, any>, config: WeaverConfig): Promise<void> {
  return main(warp, config, 'mud');
}

/**
 * Convenience function for dressing editor mode.
 */
export async function dressing(warp: Record<string, any>, config: WeaverConfig): Promise<void> {
  return main(warp, config, 'dressing');
}

/**
 * Direct execution entry point (when run via tsx directly)
 */
async function runDirect() {
  const flags = parseFlags();

  if (flags.help) {
    showHelp('interactive');
    process.exit(0);
  }

  if (flags.version) {
    console.log(`spire-loom v${VERSION}`);
    process.exit(0);
  }

  checkTTY();

  // When run directly, we need to load the warp module ourselves
  const { detectWorkspace, loadWarp } = await import('../../machinery/sley/workspace-discovery.js');
  const workspace = detectWorkspace();

  if (workspace.type === 'unknown' || !workspace.warpPath) {
    console.error('❌ No loom/WARP.ts found in current directory');
    console.error('   Run from a workspace with loom/WARP.ts');
    process.exit(1);
  }

  console.log(`📄 Loading: ${workspace.warpPath}\n`);
  const warp = await loadWarp(workspace.warpPath, workspace.root);

  const config: WeaverConfig = {
    workspace,
    verbose: false
  };

  // Load dressing
  let dressing;
  try {
    const service = new DressingService();
    dressing = await service.load(flags.workspace, { mode: 'loose' });
  } catch (err) {
    console.error(`Failed to dress the loom: ${(err as Error).message}`);
    process.exit(1);
  }

  // Determine mode
  let mode: 'menu' | 'mud' | 'dressing' = 'menu';
  if (flags.mud) mode = 'mud';
  if (flags.dressing) mode = 'dressing';

  // Render
  if (mode === 'mud') {
    render(
      <MudMode dressing={dressing} warp={warp} config={config} onExit={() => process.exit(0)} />
    );
  } else if (mode === 'dressing') {
    render(<DressingEditor workspaceRoot={flags.workspace} warp={warp} config={config} />);
  } else {
    render(<MainMenu workspaceRoot={flags.workspace} warp={warp} config={config} />);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDirect().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
