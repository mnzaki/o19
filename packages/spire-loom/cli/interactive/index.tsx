#!/usr/bin/env node
/**
 * spire-loom CLI
 * 
 * "The loom that weaves spires from surfaces."
 * 
 * An interactive CLI for the spire-loom code generator,
 * built with Ink (React for terminals).
 * 
 * Usage:
 *   spire-loom                    # Launch interactive menu
 *   spire-loom --help             # Show help
 *   spire-loom --version          # Show version
 *   spire-loom --mud              # Launch in MUD mode
 *   spire-loom --dressing         # Launch dressing editor
 *   spire-loom --workspace ./foo  # Use different workspace
 */

import React from 'react';
import { render } from 'ink';
import { MainMenu } from './menus/main.js';
import { DressingEditor } from './dressing/editor.js';
import { MudMode } from './mud/mode.js';
import { DressingService } from './dressing/service.js';

// Parse arguments
const args = process.argv.slice(2);
const flags = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
  mud: args.includes('--mud') || args.includes('-m'),
  dressing: args.includes('--dressing') || args.includes('-d'),
  workspace: getArgValue(args, '--workspace', '-w') || process.cwd()
};

function getArgValue(args: string[], longFlag: string, shortFlag: string): string | null {
  const index = args.findIndex(arg => arg === longFlag || arg === shortFlag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  // Handle --flag=value syntax
  const arg = args.find(arg => arg.startsWith(`${longFlag}=`));
  if (arg) {
    return arg.split('=')[1];
  }
  return null;
}

// Version info
const VERSION = '1.0.0';

// Help text
const HELP_TEXT = `
🧵 spire-loom v${VERSION}

Usage: spire-loom [options]

Options:
  -h, --help              Show this help message
  -v, --version           Show version number
  -m, --mud               Launch in MUD mode (text commands)
  -d, --dressing          Launch dressing editor directly
  -w, --workspace <path>  Set workspace root (default: cwd)

Interactive Menus:
  The main menu provides access to:
    • Weave All — Generate code for all spirals
    • Weave Package — Generate code for specific packages
    • Inspect Dressing — View/edit loom configuration
    • Treadle Forge — Create custom generators
    • Watch Mode — Auto-regenerate on file changes
    • Dependency Graph — Visualize spiral relationships
    • MUD Mode — Text-based command interface

Examples:
  spire-loom                    # Launch interactive menu
  spire-loom --mud              # Launch MUD mode directly
  spire-loom -w ./my-project    # Use different workspace

Documentation:
  See THE_DRESSING.md for the loom's self-loading architecture.
`;

async function main() {
  // Handle simple flags
  if (flags.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (flags.version) {
    console.log(`spire-loom v${VERSION}`);
    process.exit(0);
  }

  // Check if we're running in a TTY (required for Ink)
  if (!process.stdin.isTTY) {
    console.error(`
🧵 spire-loom-interactive requires an interactive terminal (TTY).

The interactive CLI uses Ink (React for terminals) which needs:
  - A real terminal with stdin in raw mode
  - Cannot run through pipes, redirects, or non-interactive shells

Try running directly in a terminal:
  node packages/spire-loom/bin/spire-loom-interactive.js

Or use the classic CLI:
  pnpm spire-loom
`);
    process.exit(1);
  }

  // Load the dressing first (required for all modes)
  let dressing;
  try {
    const service = new DressingService();
    dressing = await service.load(flags.workspace, { mode: 'loose' });
  } catch (err) {
    console.error(`Failed to dress the loom: ${(err as Error).message}`);
    process.exit(1);
  }

  // Render appropriate view
  if (flags.mud) {
    // MUD mode - text-based command interface
    render(<MudMode dressing={dressing} onExit={() => process.exit(0)} />);
  } else if (flags.dressing) {
    // Dressing editor directly
    render(<DressingEditor workspaceRoot={flags.workspace} />);
  } else {
    // Main interactive menu
    render(<MainMenu workspaceRoot={flags.workspace} />);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
