/**
 * Shared CLI Utilities
 *
 * Common code between classic and interactive CLI modes.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Weaver } from '@o19/spire-loom/weaver';
import type { WorkspaceInfo } from '../machinery/loom.js';
import { loadWorkspace } from '../weaver/workspace-discovery.js';

export interface CliOptions {
  watch?: boolean;
  package?: string;
  verbose?: boolean;
  graph?: boolean;
  help?: boolean;
  version?: boolean;
  mud?: boolean;
  dressing?: boolean;
  interactive?: boolean;
}

export function parseArgs(args: string[]): CliOptions {
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
      case '-g':
      case '--graph':
      case '-G':
        options.graph = true;
        break;
      case '--mud':
      case '-m':
        options.mud = true;
        break;
      case '--dressing':
      case '-d':
        options.dressing = true;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-V':
        options.version = true;
        break;
    }
  }

  return options;
}

export function showVersion(): void {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = join(__dirname, '..', 'package.json');

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    console.log(packageJson.version || 'unknown');
  } catch {
    console.log('unknown');
  }
}

export function showHelp(mode: 'classic' | 'interactive' = 'classic'): void {
  if (mode === 'interactive') {
    console.log(`
🧵 spire-loom - Interactive Mode

Usage: spire-loom-warp [options]

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
  spire-loom-warp              # Launch interactive menu
  spire-loom-warp --mud        # Launch MUD mode directly
  spire-loom-warp -w ./my-project  # Use different workspace
`);
  } else {
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
  -V, --version         Show version

Examples:
  spire-loom                    # Generate all packages in workspace
  spire-loom -w                 # Watch mode for development
  spire-loom -p foundframe      # Generate only foundframe package
  spire-loom -i                 # Launch interactive menu

Package Detection:
  When run from a package directory (e.g., o19/crates/foundframe-tauri),
  spire-loom automatically detects the package and only generates for it.
  Use -p <name> to override, or run from workspace root for all packages.
`);
  }
}

/**
 * Print a visual dependency graph of the WARP module.
 */
export function printGraph(warp: Record<string, any>): void {
  console.log('📊 Dependency Graph Visualization\n');
  console.log('═'.repeat(60));

  const visited = new Set<any>();
  const nodes = new Map<
    string,
    {
      id: string;
      exportName: string;
      classType: string;
      metadata: Record<string, any>;
      depth: number;
    }
  >();
  const edges: Array<{ from: string; to: string; label: string }> = [];

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

  function traverse(
    obj: any,
    exportName: string,
    parentId: string | null,
    viaProperty: string,
    depth: number = 0
  ): string | null {
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
      depth
    });

    if (parentId) {
      edges.push({
        from: parentId,
        to: id,
        label: viaProperty
      });
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'constructor') continue;

      if (value && typeof value === 'object') {
        const valueClass = value.constructor?.name;
        if (
          valueClass &&
          (valueClass.includes('Spiral') ||
            valueClass.includes('Spiraler') ||
            valueClass.includes('Core') ||
            valueClass.includes('Ring'))
        ) {
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
      const metadataStr =
        Object.keys(node.metadata).length > 0
          ? ' {' +
            Object.entries(node.metadata)
              .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
              .join(', ') +
            '}'
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

/**
 * Handle common CLI arguments (help, version, graph).
 * Returns true if an action was taken and the program should exit.
 */
export async function handleCommonArgs(
  args: string[],
  warp: Record<string, any> | null,
  mode: 'classic' | 'interactive' = 'classic'
): Promise<boolean> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp(mode);
    return true;
  }

  if (options.version) {
    showVersion();
    return true;
  }

  if (options.graph && warp) {
    printGraph(warp);
    return true;
  }

  return false;
}

export async function findWorkspaceConfig(): Promise<WorkspaceInfo | null> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const workspace = await loadWorkspace();

  if (!workspace || workspace.type === 'unknown') {
    console.error('❌ Not in a workspace or package directory');
    console.error('   Run this from a directory with:');
    console.error('   - pnpm-workspace.yaml (pnpm workspace)');
    console.error('   - Cargo.toml with [workspace] (Cargo workspace)');
    console.error('   - loom/WARP.ts (loom project)');
    return null;
  }

  if (!workspace.warpPath) {
    console.error('❌ No loom/WARP.ts found');
    console.error('   Create a WARP.ts file to define your architecture');
    return null;
  }

  if (!options.package && workspace.type === 'package' && workspace.currentPackage) {
    const suggested = workspace.currentPackage;

    console.log(`📍 Package detected: ${workspace.currentPackage}`);
    if (suggested) {
      console.log(`   Auto-filtering to: "${suggested}" (use -p all to override)\n`);
    }
  } else if (workspace.type === 'workspace') {
    console.log(`📍 Workspace detected: ${workspace.root}`);
    if (!options.package) {
      console.log(`   Generating all packages (use --package <name> to filter)\n`);
    }
  }

  console.log(`📄 Loading: ${workspace.warpPath}\n`);

  if (workspace.currentPackage) {
    console.log(`📦 Package filter: "${workspace.currentPackage}"\n`);
  }

  return workspace;
}
