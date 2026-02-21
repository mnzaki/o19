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
spire-loom - The loom that weaves spires from surfaces

Usage:
  spire-loom [options]

Options:
  -w, --watch          Watch mode - regenerate on WARP.ts changes
  -p, --package <name> Generate specific package only
  -v, --verbose        Verbose output
  -G, --graph          Show dependency graph visualization
  -h, --help           Show this help

Examples:
  spire-loom                    # Generate all packages in workspace
  spire-loom -w                 # Watch mode for development
  spire-loom -p foundframe      # Generate only foundframe package
  
Package Detection:
  When run from a package directory (e.g., o19/crates/foundframe-tauri),
  spire-loom automatically detects the package and only generates for it.
  Use -p <name> to override, or run from workspace root for all packages.
`);
}

/**
 * Detect if we're in a workspace root or a package directory.
 * Also returns the package name if we're in a specific package.
 */
function detectWorkspace(): { 
  type: 'workspace' | 'package' | 'unknown'; 
  root: string;
  warpPath?: string;
  currentPackage?: string;
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
    // Try to extract package name
    let packageName: string | undefined;
    
    if (hasCargoToml) {
      const cargoContent = fs.readFileSync(path.join(cwd, 'Cargo.toml'), 'utf-8');
      const nameMatch = cargoContent.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) {
        packageName = nameMatch[1];
      }
    }
    
    if (!packageName && hasPackageJson) {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
      packageName = pkgJson.name;
    }
    
    // Try to find workspace root by going up
    let current = cwd;
    while (current !== path.dirname(current)) {
      current = path.dirname(current);
      const loomPath = path.join(current, 'loom', 'WARP.ts');
      if (fs.existsSync(loomPath)) {
        return { 
          type: 'package', 
          root: current, 
          warpPath: loomPath,
          currentPackage: packageName 
        };
      }
    }
    return { type: 'package', root: cwd, currentPackage: packageName };
  }
  
  return { type: 'unknown', root: cwd };
}

/**
 * Load and execute the WARP module.
 * 
 * When running via tsx (which is how spire-loom is invoked),
 * TypeScript files can be imported directly without compilation.
 */
async function loadWarp(warpPath: string): Promise<Record<string, any>> {
  const warpUrl = pathToFileURL(warpPath).href;
  return await import(warpUrl);
}

/**
 * Print a visual dependency graph of the WARP module.
 */
function printDependencyGraph(warp: Record<string, any>, workspaceRoot: string): void {
  console.log('📊 Dependency Graph Visualization\n');
  console.log('═'.repeat(60));
  
  // Track visited nodes to avoid duplicates
  const visited = new Set<any>();
  const nodes = new Map<string, {
    id: string;
    exportName: string;
    classType: string;
    metadata: Record<string, any>;
    depth: number;
  }>();
  const edges: Array<{
    from: string;
    to: string;
    label: string;
  }> = [];
  
  let nodeIdCounter = 0;
  
  function getNodeId(obj: any, exportName: string): string {
    if (!obj) return 'null';
    // Use the object itself as key if not visited
    for (const [id, node] of nodes) {
      if (node.exportName === exportName && obj.constructor?.name === node.classType) {
        return id;
      }
    }
    const id = `n${nodeIdCounter++}`;
    return id;
  }
  
  function extractMetadata(obj: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    if (!obj) return metadata;
    
    // Check for reach metadata via _reach property (legacy) or WeakMap
    if (obj.prototype?._reach) {
      metadata.reach = obj.prototype._reach;
    }
    
    // Check for AndroidSpiraler specific data
    if (obj.serviceOptions) {
      metadata.serviceOptions = obj.serviceOptions;
    }
    
    // Check for RustCore metadata
    if (obj.getMetadata) {
      try {
        metadata.core = obj.getMetadata();
      } catch {
        // ignore
      }
    }
    
    return metadata;
  }
  
  function traverse(obj: any, exportName: string, parentId: string | null, viaProperty: string, depth: number = 0): string | null {
    if (!obj || typeof obj !== 'object') return null;
    if (visited.has(obj)) {
      // Return existing node id
      for (const [id, node] of nodes) {
        if (node.exportName === exportName && obj.constructor?.name === node.classType) {
          return id;
        }
      }
      return null;
    }
    
    visited.add(obj);
    
    const classType = obj.constructor?.name || 'Unknown';
    const id = getNodeId(obj, exportName);
    const metadata = extractMetadata(obj);
    
    nodes.set(id, {
      id,
      exportName,
      classType,
      metadata,
      depth,
    });
    
    if (parentId) {
      edges.push({
        from: parentId,
        to: id,
        label: viaProperty,
      });
    }
    
    // Traverse inner properties
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'constructor') continue;
      
      // Look for SpiralRing properties
      if (value && typeof value === 'object') {
        const valueClass = value.constructor?.name;
        if (valueClass && (
          valueClass.includes('Spiral') ||
          valueClass.includes('Spiraler') ||
          valueClass.includes('Core') ||
          valueClass.includes('Ring')
        )) {
          traverse(value, exportName, id, key, depth + 1);
        }
      }
    }
    
    return id;
  }
  
  // Build the graph starting from each export
  for (const [exportName, value] of Object.entries(warp)) {
    if (value && typeof value === 'object') {
      traverse(value, exportName, null, 'export', 0);
    }
  }
  
  // Print nodes by depth level
  console.log('\n📦 NODES (by export):\n');
  
  const nodesByExport = new Map<string, typeof nodes extends Map<any, infer V> ? V[] : never>();
  for (const node of nodes.values()) {
    if (!nodesByExport.has(node.exportName)) {
      nodesByExport.set(node.exportName, []);
    }
    nodesByExport.get(node.exportName)!.push(node);
  }
  
  for (const [exportName, exportNodes] of nodesByExport) {
    console.log(`\n┌─ ${exportName}`);
    console.log(`│`);
    
    for (const node of exportNodes.sort((a, b) => a.depth - b.depth)) {
      const indent = '│  '.repeat(node.depth);
      const icon = node.depth === 0 ? '📍' : '└─';
      const metadataStr = Object.keys(node.metadata).length > 0
        ? ' {' + Object.entries(node.metadata)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join(', ') + '}'
        : '';
      
      console.log(`${indent}${icon} [${node.classType}]${metadataStr}`);
    }
  }
  
  // Print edges
  console.log('\n\n🔗 EDGES (connections):\n');
  
  if (edges.length === 0) {
    console.log('   (no edges found)');
  } else {
    for (const edge of edges) {
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      if (fromNode && toNode) {
        console.log(`   ${fromNode.classType} ──${edge.label}──> ${toNode.classType}`);
      }
    }
  }
  
  // Summary
  console.log('\n\n📈 Summary:');
  console.log(`   Total nodes: ${nodes.size}`);
  console.log(`   Total edges: ${edges.length}`);
  console.log(`   Exports: ${Object.keys(warp).join(', ')}`);
  console.log('\n' + '═'.repeat(60));
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
  
  // Determine package filter
  let packageFilter = options.package;
  
  // Auto-detect package if we're in a package directory and no filter specified
  if (!packageFilter && workspace.type === 'package' && workspace.currentPackage) {
    // Try to map Cargo package name to WARP export name
    // e.g., "o19-foundframe-tauri" → "tauri"
    // e.g., "o19-foundframe-android" → "android"
    const cargoName = workspace.currentPackage;
    
    // Extract the last part after the last hyphen
    const possibleExport = cargoName.split('-').pop() || cargoName;
    
    console.log(`📍 Package detected: ${cargoName}`);
    console.log(`   Suggested filter: "${possibleExport}" (derived from package name)`);
    console.log(`   Run with -p ${possibleExport} to generate, or -p all for all packages\n`);
    
    // Don't auto-apply the filter since it might not match
    // Let the user explicitly specify or generate all
    packageFilter = undefined;
  } else if (workspace.type === 'workspace') {
    console.log(`📍 Workspace detected: ${workspace.root}`);
    if (!packageFilter) {
      console.log(`   Generating all packages (use --package <name> to filter)\n`);
    }
  }
  
  console.log(`📄 Loading: ${workspace.warpPath}\n`);
  
  try {
    // Load WARP.ts
    const warp = await loadWarp(workspace.warpPath);
    
    if (options.verbose) {
      console.log('Exports found:', Object.keys(warp).join(', '));
      console.log();
    }
    
    // Graph visualization mode
    if (options.graph) {
      printDependencyGraph(warp, workspace.root);
      return;
    }
    
    // Configure weaver
    const loomDir = path.join(workspace.root, 'loom');
    const config: WeaverConfig = {
      workspaceRoot: workspace.root,
      loomDir,
      verbose: options.verbose,
      packageFilter,
    };
    
    if (packageFilter) {
      console.log(`📦 Package filter: "${packageFilter}"\n`);
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
