#!/usr/bin/env node
/**
 * spire-loom CLI
 * 
 * "The loom that weaves spires from surfaces."
 * 
 * Minimal command-line interface for code generation.
 * For the interactive UI, use spire-loom-warp or spire-loom-mud-warp.
 * 
 * Usage:
 *   spire-loom                    # Generate all
 *   spire-loom -p foundframe      # Generate specific package
 *   spire-loom -v                 # Verbose output
 */

// Polyfill for decorator metadata
import 'reflect-metadata';

import { weave, type WeaverConfig } from '../machinery/weaver.js';
import { 
  detectWorkspace, 
  loadWarp, 
  getSuggestedPackageFilter 
} from '../machinery/reed/index.js';

interface CliOptions {
  watch?: boolean;
  package?: string;
  verbose?: boolean;
  graph?: boolean;
  help?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--package':
      case '-p':
        options.package = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--graph':
      case '-G':
        options.graph = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
🧵 spire-loom - The loom that weaves spires from surfaces

Usage:
  spire-loom [options]

Options:
  -p, --package <name>  Generate specific package only
  -v, --verbose         Verbose output
  -G, --graph           Show dependency graph visualization
  -h, --help            Show this help

Examples:
  spire-loom                    # Generate all packages
  spire-loom -p foundframe      # Generate only foundframe package

Interactive Modes:
  spire-loom-warp               # Interactive menu UI
  spire-loom-mud-warp           # Interactive MUD mode (text adventure)
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('🧵 Spire-Loom - Weaving spires from surfaces\n');
  
  const workspace = detectWorkspace();
  
  if (workspace.type === 'unknown') {
    console.error('❌ Not in a workspace or package directory');
    console.error('   Run this from a directory with:');
    console.error('   - pnpm-workspace.yaml (pnpm workspace)');
    console.error('   - Cargo.toml with [workspace] (Cargo workspace)');
    console.error('   - loom/WARP.ts (loom project)');
    process.exit(1);
  }
  
  if (!workspace.warpPath) {
    console.error('❌ No loom/WARP.ts found');
    console.error('   Create a WARP.ts file to define your architecture');
    process.exit(1);
  }
  
  let packageFilter = options.package;
  
  if (!packageFilter && workspace.type === 'package' && workspace.currentPackage) {
    const suggested = getSuggestedPackageFilter(workspace);
    
    console.log(`📍 Package detected: ${workspace.currentPackage}`);
    if (suggested) {
      console.log(`   Suggested filter: "${suggested}" (derived from package name)`);
      console.log(`   Run with -p ${suggested} to generate, or -p all for all packages\n`);
    }
  } else if (workspace.type === 'workspace') {
    console.log(`📍 Workspace detected: ${workspace.root}`);
    if (!packageFilter) {
      console.log(`   Generating all packages (use --package <name> to filter)\n`);
    }
  }
  
  console.log(`📄 Loading: ${workspace.warpPath}\n`);
  
  try {
    const warp = await loadWarp(workspace.warpPath);
    
    if (options.verbose) {
      console.log('Exports found:', Object.keys(warp).join(', '));
      console.log();
    }
    
    const loomDir = new URL('../loom/', import.meta.url).pathname;
    const config: WeaverConfig = {
      workspaceRoot: workspace.root,
      loomDir,
      verbose: options.verbose,
      packageFilter,
    };
    
    if (packageFilter) {
      console.log(`📦 Package filter: "${packageFilter}"\n`);
    }
    
    const result = await weave(warp, config);
    
    console.log('\n✅ Weaving complete!');
    console.log(`   Files generated: ${result.filesGenerated}`);
    console.log(`   Files modified: ${result.filesModified}`);
    console.log(`   Files unchanged: ${result.filesUnchanged}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.error(`   - ${error.message}`);
      }
      process.exit(1);
    }
    
    if (options.watch) {
      console.log('\n👀 Watch mode enabled - waiting for changes...');
      // TODO: Implement watch mode
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
