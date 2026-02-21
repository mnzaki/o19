#!/usr/bin/env node
/**
 * Spire-Loom CLI
 *
 * Entry point for the code generator.
 * 
 * Usage:
 *   spire-loom           # Detect workspace and generate all
 *   spire-loom --watch   # Watch mode for development
 *   spire-loom --package <name>  # Generate specific package only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { weave, type WeaverConfig } from './machinery/weaver.js';

interface CliOptions {
  watch?: boolean;
  package?: string;
  verbose?: boolean;
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
spire-loom - The loom that weaves spires from surfaces

Usage:
  spire-loom [options]

Options:
  -w, --watch          Watch mode - regenerate on WARP.ts changes
  -p, --package <name> Generate specific package only
  -v, --verbose        Verbose output
  -h, --help           Show this help

Examples:
  spire-loom                    # Generate all packages in workspace
  spire-loom -w                 # Watch mode for development
  spire-loom -p foundframe      # Generate only foundframe package
`);
}

/**
 * Detect if we're in a workspace root or a package directory.
 */
function detectWorkspace(): { 
  type: 'workspace' | 'package' | 'unknown'; 
  root: string;
  warpPath?: string;
} {
  const cwd = process.cwd();
  
  // Check for workspace indicators
  const hasPnpmWorkspace = fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'));
  const hasCargoWorkspace = fs.existsSync(path.join(cwd, 'Cargo.toml')) && 
    fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8').includes('[workspace]');
  const hasLoomDir = fs.existsSync(path.join(cwd, 'loom'));
  
  if (hasPnpmWorkspace || hasCargoWorkspace || hasLoomDir) {
    // We're in a workspace root
    const loomPath = path.join(cwd, 'loom', 'WARP.ts');
    if (fs.existsSync(loomPath)) {
      return { type: 'workspace', root: cwd, warpPath: loomPath };
    }
    return { type: 'workspace', root: cwd };
  }
  
  // Check if we're in a package directory (has Cargo.toml or package.json)
  const hasCargoToml = fs.existsSync(path.join(cwd, 'Cargo.toml'));
  const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
  
  if (hasCargoToml || hasPackageJson) {
    // Try to find workspace root by going up
    let current = cwd;
    while (current !== path.dirname(current)) {
      current = path.dirname(current);
      const loomPath = path.join(current, 'loom', 'WARP.ts');
      if (fs.existsSync(loomPath)) {
        return { type: 'package', root: current, warpPath: loomPath };
      }
    }
    return { type: 'package', root: cwd };
  }
  
  return { type: 'unknown', root: cwd };
}

/**
 * Load and execute the WARP module (compiled .js or via ts-node).
 */
async function loadWarp(warpPath: string): Promise<Record<string, any>> {
  // Check for compiled .js version first
  const jsPath = warpPath.replace(/\.ts$/, '.js');
  
  if (fs.existsSync(jsPath)) {
    // Use compiled JS
    const warpUrl = pathToFileURL(jsPath).href;
    return await import(warpUrl);
  }
  
  // Try to use ts-node
  try {
    // Register ts-node
    const tsNode = await import('ts-node');
    tsNode.register({
      esm: true,
      transpileOnly: true,
    });
    
    const warpUrl = pathToFileURL(warpPath).href;
    return await import(warpUrl);
  } catch (error: any) {
    console.error('❌ Cannot load TypeScript files.');
    console.error('   Please either:');
    console.error('   1. Compile loom/WARP.ts first:');
    console.error('      cd loom && npx tsc WARP.ts');
    console.error('   2. Install ts-node:');
    console.error('      npm install -D ts-node');
    throw new Error('TypeScript support requires ts-node');
  }
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('🧵 Spire-Loom - Weaving spires from surfaces\n');
  
  // Detect workspace
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
  
  console.log(`📍 ${workspace.type === 'workspace' ? 'Workspace' : 'Package'} detected: ${workspace.root}`);
  console.log(`📄 Loading: ${workspace.warpPath}\n`);
  
  try {
    // Load WARP.ts
    const warp = await loadWarp(workspace.warpPath);
    
    if (options.verbose) {
      console.log('Exports found:', Object.keys(warp).join(', '));
      console.log();
    }
    
    // Configure weaver
    const config: WeaverConfig = {
      workspaceRoot: workspace.root,
      verbose: options.verbose,
    };
    
    if (options.package) {
      console.log(`📦 Generating package: ${options.package}\n`);
      // TODO: Filter to specific package
    }
    
    // Run the weaver
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
