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
import { generateFromTreadleDefinition, type TreadleDefinition } from './declarative.js';
import { GeneratorMatrix } from '../../weaver/matrix.js';
import type { TreadleTrodder } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Discovered treadle module structure.
 */
export interface DiscoveredTreadle {
  /** The treadle name (from filename or export) */
  name: string;
  /** The treadle definition or trodder (already-declared treadle) */
  definition: TreadleDefinition | TreadleTrodder;
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
 * Each file can export multiple treadle definitions.
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
    const baseName = entry.name.replace(/\.ts$/, '');

    try {
      const treadles = await loadTreadlesFromFile(filePath, baseName);
      for (const treadle of treadles) {
        console.log('[DISCOVERY] Discovered treadle:', treadle.name);
        discovered.push(treadle);
      }
    } catch (error) {
      console.warn(`[DISCOVERY] Failed to load treadles from ${filePath}:`, error);
    }
  }

  return discovered;
}

/**
 * Load all treadles from a file.
 */
async function loadTreadlesFromFile(
  filePath: string,
  baseName: string
): Promise<DiscoveredTreadle[]> {
  const discovered: DiscoveredTreadle[] = [];
  const moduleUrl = pathToFileURL(filePath).href;
  const module = await import(moduleUrl);

  // Look for all treadle exports in the module
  // Supports:
  // - export default declareTreadle(...)
  // - export const myTreadle = declareTreadle(...) -> returns TreadleTrodder (function)
  // - export const myTreadle = { methods: ..., newFiles: ... } -> TreadleDefinition

  // Find ALL named exports that look like treadles
  for (const [key, value] of Object.entries(module)) {
    if (isTreadleTrodder(value)) {
      const trodder = value as TreadleTrodder;
      // Use export key name if treadleName is anonymous or not set
      const trodderName = (trodder as any).treadleName;
      const name = trodderName && trodderName !== 'anonymous' ? trodderName : key;

      if (process.env.DEBUG_MATRIX) {
        const hasMatches = !!(trodder as any).matches && (trodder as any).matches.length > 0;
        console.log(
          `[DISCOVERY DEBUG] Found trodder export: ${key}, name: ${name}, hasMatches: ${hasMatches}`
        );
      }

      const contributionKey = `${key}Contributions`;
      discovered.push({
        name,
        definition: trodder,
        sourcePath: filePath,
        contributes: module[contributionKey]
      });
    } else if (isTreadleDefinition(value)) {
      if (process.env.DEBUG_MATRIX) {
        console.log(`[DISCOVERY DEBUG] Found definition export: ${key}`);
      }

      const definition = value as TreadleDefinition;
      definition.name ??= key;

      const contributionKey = `${key}Contributions`;
      discovered.push({
        name: key,
        definition,
        sourcePath: filePath,
        contributes: module[contributionKey]
      });
    }
  }

  return discovered;
}

/**
 * Type guard to check if a value is a TreadleDefinition.
 *
 * Supports both matrix treadles (with matches) and tieup treadles (without matches).
 */
function isTreadleDefinition(value: unknown): value is TreadleDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const v = value as Record<string, unknown>;

  // Must have methods
  const hasMethods = 'methods' in v && typeof v.methods === 'object' && v.methods !== null;

  // Must have outputs (old name) OR newFiles (new name)
  const hasOutputs = 'outputs' in v && Array.isArray(v.outputs);
  const hasNewFiles = 'newFiles' in v && Array.isArray(v.newFiles);

  // Matrix treadles have matches, tieup treadles don't
  // Both are valid TreadleDefinitions
  return hasMethods && (hasOutputs || hasNewFiles);
}

/**
 * Type guard to check if a value is a TreadleTrodder (already-declared treadle).
 *
 * A TreadleTrodder is an async function returned by declareTreadle().
 * It must have treadle metadata attached (methods, newFiles, etc.)
 */
function isTreadleTrodder(value: unknown): value is TreadleTrodder {
  if (typeof value !== 'function') {
    return false;
  }
  // Check for treadle metadata - any declared treadle will have these
  const trodder = value as any;
  return !!(trodder.methods || trodder.matches || trodder.treadleName);
}

// ============================================================================
// Matrix Building
// ============================================================================

/**
 * Build a generator matrix from an array of treadles.
 *
 * Each treadle's `matches` patterns are registered in the matrix.
 * Treadles without matches (tieup treadles) are skipped - they're invoked directly.
 */
export function buildMatrixFromTreadles(treadles: DiscoveredTreadle[]): GeneratorMatrix {
  const matrix = new GeneratorMatrix();

  for (const { name, definition } of treadles) {
    let matches: Array<{ current: string; previous: string }> | undefined;
    let generator: TreadleTrodder;

    // Handle already-declared treadles (TreadleTrodder function)
    // These come from: export const myTreadle = declareTreadle({...})
    if (isTreadleTrodder(definition)) {
      generator = definition as TreadleTrodder;

      // Get matches from attached metadata (if available)
      matches = generator.matches;

      if (!matches || matches.length === 0) {
        if (process.env.DEBUG_MATRIX) {
          console.log(`[MATRIX] Skipping "${name}" (trodder without matches - tieup treadle?)`);
        }
        continue;
      }
    } else {
      // Handle TreadleDefinition objects (raw definitions not yet processed)
      const treadleDef = definition as TreadleDefinition;
      matches = treadleDef.matches;

      // Skip tieup treadles (no matches) - they're invoked directly via .tieup()
      if (!matches || matches.length === 0) {
        if (process.env.DEBUG_MATRIX) {
          console.log(`[MATRIX] Skipping "${name}" (tieup treadle - no matches)`);
        }
        continue;
      }

      // Convert definition to trodder
      generator = generateFromTreadleDefinition(treadleDef);
    }

    // Register in matrix
    for (const match of matches) {
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

    if (userTreadles.length > 0 || process.env.DEBUG_MATRIX) {
      console.log(`[DISCOVERY] Loaded ${userTreadles.length} user treadle(s) from ${userPath}`);
    }
  }

  return buildMatrixFromTreadles(allTreadles);
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
