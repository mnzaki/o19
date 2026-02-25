/**
 * Treadle Kit - Discovery 🔍
 *
 * Scan for and load treadle definitions from the filesystem.
 * Enables both built-in and user-defined treadles.
 *
 * > *"The loom discovers new patterns as the weaver explores."*
 *
 * @example
 * ```typescript
 * import { buildMatrixFromTreadles, discoverTreadles } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * // Load all treadles (built-in + user)
 * const matrix = await buildMatrixFromTreadles('./my-workspace');
 * ```
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { GeneratorMatrix } from '../heddles/index.js';
import { generateFromTreadle, type TreadleDefinition } from './declarative.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Discovered treadle module structure.
 */
export interface DiscoveredTreadle {
  /** The treadle name (from filename or export) */
  name: string;
  /** The treadle definition */
  definition: TreadleDefinition;
  /** Path to the source file */
  sourcePath: string;
  /** Optional: Method contributed to spiraler API */
  contributes?: SpiralerContribution;
}

/**
 * A contribution to a spiraler's TypeScript API.
 * When a treadle is discovered, it can extend a spiraler with new methods.
 */
export interface SpiralerContribution {
  /** The spiraler to extend (e.g., 'RustAndroidSpiraler') */
  spiraler: string;
  /** The method name being contributed (e.g., 'foregroundService') */
  method: string;
  /** Return type hint for TypeScript */
  returnType?: string;
  /** Options type for the method */
  optionsType?: string;
}

// ============================================================================
// Discovery
// ============================================================================

/**
 * Scan a directory for treadle definitions.
 *
 * Looks for files matching: *.ts (excluding *.test.ts, *.spec.ts, index.ts)
 * Each file should export a treadle definition as default or named export.
 *
 * @param searchPath - Directory to scan
 * @returns Array of discovered treadles
 */
export async function discoverTreadles(searchPath: string): Promise<DiscoveredTreadle[]> {
  const discovered: DiscoveredTreadle[] = [];

  if (!fs.existsSync(searchPath)) {
    return discovered;
  }

  const entries = fs.readdirSync(searchPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip non-.ts files and test files
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;
    if (entry.name === 'index.ts') continue; // Skip index files

    const filePath = path.join(searchPath, entry.name);
    const name = entry.name.replace(/\.ts$/, '');

    try {
      const treadle = await loadTreadleFromFile(filePath, name);
      if (treadle) {
        discovered.push(treadle);
      }
    } catch (error) {
      console.warn(`[DISCOVERY] Failed to load treadle from ${filePath}:`, error);
    }
  }

  return discovered;
}

/**
 * Load a single treadle from a file.
 */
async function loadTreadleFromFile(
  filePath: string,
  name: string
): Promise<DiscoveredTreadle | undefined> {
  const moduleUrl = pathToFileURL(filePath).href;
  const module = await import(moduleUrl);

  // Look for treadle definition in exports
  // Supports: export default defineTreadle(...) or export const myTreadle = defineTreadle(...)
  let definition: TreadleDefinition | undefined;
  let contributes: SpiralerContribution | undefined;

  if (module.default && isTreadleDefinition(module.default)) {
    definition = module.default;
    contributes = module.defaultContributions ?? module.contributes;
  } else {
    // Find first export that looks like a treadle definition
    for (const [key, value] of Object.entries(module)) {
      if (isTreadleDefinition(value)) {
        definition = value as TreadleDefinition;
        const contributionKey = `${key}Contributions`;
        if (contributionKey in module) {
          contributes = module[contributionKey];
        }
        break;
      }
    }
  }

  if (!definition) {
    return undefined;
  }

  // Set the treadle name for marker scoping
  definition.name = name;

  return { name, definition, sourcePath: filePath, contributes };
}

/**
 * Type guard to check if a value is a TreadleDefinition.
 */
function isTreadleDefinition(value: unknown): value is TreadleDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'matches' in value &&
    Array.isArray((value as TreadleDefinition).matches) &&
    'methods' in value &&
    'outputs' in value &&
    Array.isArray((value as TreadleDefinition).outputs)
  );
}

// ============================================================================
// Matrix Building
// ============================================================================

/**
 * Build a generator matrix from an array of treadles.
 *
 * Each treadle's `matches` patterns are registered in the matrix.
 */
export function buildMatrixFromTreadles(treadles: DiscoveredTreadle[]): GeneratorMatrix {
  const matrix = new GeneratorMatrix();

  for (const { name, definition } of treadles) {
    const generator = generateFromTreadle(definition);

    for (const match of definition.matches) {
      matrix.setPair(match.current, match.previous, generator);
      if (process.env.DEBUG_MATRIX) {
        console.log(`[MATRIX] Registered "${name}": ${match.current} → ${match.previous}`);
      }
    }
  }

  return matrix;
}

/**
 * Get the path to built-in treadles directory.
 * Uses import.meta.url to work at runtime with tsx.
 */
function getBuiltInTreadlesPath(): string {
  // Get the directory of this file using import.meta.url
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  // Path: machinery/treadle-kit/ -> machinery/treadles/
  // So we only need to go up one level
  return path.join(currentDir, '..', 'treadles');
}

/**
 * Create a generator matrix by discovering and loading all treadles.
 *
 * Scans the following locations:
 * 1. Built-in treadles: machinery/treadles/*.ts
 * 2. User treadles: {workspaceRoot}/loom/treadles/*.ts
 *
 * @param workspaceRoot - Root of the workspace to scan for user treadles
 * @returns GeneratorMatrix with all discovered treadles registered
 */
export async function createMatrix(workspaceRoot?: string): Promise<GeneratorMatrix> {
  const allTreadles: DiscoveredTreadle[] = [];

  // Load built-in treadles
  const builtInPath = getBuiltInTreadlesPath();
  const builtInTreadles = await discoverTreadles(builtInPath);
  allTreadles.push(...builtInTreadles);

  if (process.env.DEBUG_MATRIX) {
    console.log(`[DISCOVERY] Loaded ${builtInTreadles.length} built-in treadle(s)`);
  }

  // Load user treadles if workspace provided
  if (workspaceRoot) {
    const userPath = path.join(workspaceRoot, 'loom', 'treadles');
    const userTreadles = await discoverTreadles(userPath);
    allTreadles.push(...userTreadles);

    if (userTreadles.length > 0) {
      console.log(`[DISCOVERY] Loaded ${userTreadles.length} user treadle(s) from ${userPath}`);
    }
  }

  return buildMatrixFromTreadles(allTreadles);
}

// ============================================================================
// Legacy Exports (deprecated, for compatibility)
// ============================================================================

/**
 * @deprecated Use `createMatrix()` instead
 */
export async function createMatrixWithDiscovery(workspaceRoot: string): Promise<GeneratorMatrix> {
  return createMatrix(workspaceRoot);
}

/**
 * @deprecated Built-in treadles are now auto-discovered. Use `createMatrix()` instead.
 */
export function createDefaultMatrix(): GeneratorMatrix {
  console.warn('[DEPRECATED] createDefaultMatrix() is deprecated. Use createMatrix() instead.');
  // Return empty matrix - built-in treadles will be discovered
  return new GeneratorMatrix();
}

// ============================================================================
// Spiraler Contributions
// ============================================================================

/**
 * Collect all spiraler contributions from discovered treadles.
 *
 * This enables TypeScript-level API extension where treadles can
 * contribute methods to spiralers.
 *
 * @param discovered - Array of discovered treadles
 * @returns Map of spiraler name -> contributed methods
 */
export function collectSpiralerContributions(
  discovered: DiscoveredTreadle[]
): Map<string, SpiralerContribution[]> {
  const contributions = new Map<string, SpiralerContribution[]>();

  for (const treadle of discovered) {
    if (treadle.contributes) {
      const { spiraler } = treadle.contributes;
      if (!contributions.has(spiraler)) {
        contributions.set(spiraler, []);
      }
      contributions.get(spiraler)!.push(treadle.contributes);
    }
  }

  return contributions;
}
