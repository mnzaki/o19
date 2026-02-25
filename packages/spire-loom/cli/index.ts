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
      case '--interactive':
      case '-i':
        // Handled by bin/spire-loom.js, skip here
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
  -w, --watch           Watch mode - regenerate on WARP.ts changes
  -p, --package <name>  Generate specific package only
  -v, --verbose         Verbose output
  -G, --graph           Show dependency graph visualization
  -i, --interactive     Launch interactive menu (Ink-based UI)
  -h, --help            Show this help

Examples:
  spire-loom                    # Generate all packages in workspace
  spire-loom -w                 # Watch mode for development
  spire-loom -p foundframe      # Generate only foundframe package
  spire-loom -i                 # Launch interactive menu

Interactive Mode:
  Use --interactive for the new Ink-based UI with:
    • Visual dressing inspector
    • Treadle forge for creating generators
    • MUD mode for text commands
    • Watch mode with live reload

Package Detection:
  When run from a package directory (e.g., o19/crates/foundframe-tauri),
  spire-loom automatically detects the package and only generates for it.
  Use -p <name> to override, or run from workspace root for all packages.
`);
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
    
    if (obj.prototype?._reach) {
      metadata.reach = obj.prototype._reach;
    }
    
    if (obj.serviceOptions) {
      metadata.serviceOptions = obj.serviceOptions;
    }
    
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
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'constructor') continue;
      
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
  
  for (const [exportName, value] of Object.entries(warp)) {
    if (value && typeof value === 'object') {
      traverse(value, exportName, null, 'export', 0);
    }
  }
  
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
  
  console.log('\n\n📈 Summary:');
  console.log(`   Total nodes: ${nodes.size}`);
  console.log(`   Total edges: ${edges.length}`);
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
    
    // Graph visualization mode
    if (options.graph) {
      printDependencyGraph(warp, workspace.root);
      return;
    }
    
    if (options.verbose) {
      console.log('Exports found:', Object.keys(warp).join(', '));
      console.log();
    }
    
    const config: WeaverConfig = {
      workspace,
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
