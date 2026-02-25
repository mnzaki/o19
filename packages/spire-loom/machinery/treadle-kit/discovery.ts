/**
 * Treadle Kit - Discovery 🔍
 *
 * Scan for and load treadle definitions from the filesystem.
 * Enables user-defined treadles in workspace directories.
 *
 * > *"The loom discovers new patterns as the weaver explores."*
 *
 * @example
 * ```typescript
 * import { createMatrixWithDiscovery } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * // Creates matrix with built-in + discovered treadles
 * const matrix = await createMatrixWithDiscovery('./my-workspace');
 * ```
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { pathToFileURL } from 'node:url';
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
 * Scan for treadle definitions in a directory.
 *
 * Looks for files matching: *.ts (excluding *.test.ts, *.spec.ts)
 * Each file should export a treadle definition as default or named export.
 *
 * @param searchPath - Directory to scan (default: {workspace}/loom/treadles/)
 * @returns Array of discovered treadles
 */
export async function discoverTreadles(
  searchPath: string
): Promise<DiscoveredTreadle[]> {
  const discovered: DiscoveredTreadle[] = [];

  if (!fs.existsSync(searchPath)) {
    return discovered;
  }

  const entries = fs.readdirSync(searchPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip non-.ts files and test files
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) continue;

    const filePath = path.join(searchPath, entry.name);
    const name = entry.name.replace(/\.ts$/, '');

    try {
      // Dynamic import of the treadle module
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
            // Check for contributions in the module
            const contributionKey = `${key}Contributions`;
            if (contributionKey in module) {
              contributes = module[contributionKey];
            }
            break;
          }
        }
      }

      if (definition) {
        discovered.push({ name, definition, sourcePath: filePath, contributes });
      }
    } catch (error) {
      console.warn(`[DISCOVERY] Failed to load treadle from ${filePath}:`, error);
    }
  }

  return discovered;
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
// Matrix Creation
// ============================================================================

import { generateAndroidService } from '../treadles/android-generator.js';
import { generateTauriPlugin } from '../treadles/tauri-generator.js';
import { generateTypescriptDDD } from '../treadles/typescript-ddd-generator.js';

/**
 * Create the default generator matrix with built-in treadles.
 */
export function createDefaultMatrix(): GeneratorMatrix {
  const matrix = new GeneratorMatrix();

  matrix.setPair('RustAndroidSpiraler.foregroundService', 'RustCore', generateAndroidService);
  matrix.setPair('TauriSpiraler.plugin', 'RustAndroidSpiraler.foregroundService', generateTauriPlugin);
  matrix.setPair('TauriSpiraler.plugin', 'DesktopSpiraler.direct', generateTauriPlugin);
  
  // TypeScript generators
  matrix.setPair('TypescriptSpiraler.ddd', 'TsCore', generateTypescriptDDD);

  return matrix;
}

/**
 * Create a matrix including built-in treadles and discovered treadles.
 *
 * Scans the following locations for treadles:
 * 1. Built-in treadles (Android, Tauri, etc.)
 * 2. {workspaceRoot}/loom/treadles/*.ts - User-defined treadles
 *
 * @param workspaceRoot - Root of the workspace to scan
 * @returns GeneratorMatrix with all treadles registered
 */
export async function createMatrixWithDiscovery(
  workspaceRoot: string
): Promise<GeneratorMatrix> {
  const matrix = createDefaultMatrix();

  // Discover user-defined treadles
  const userTreadlesPath = path.join(workspaceRoot, 'loom', 'treadles');
  const discovered = await discoverTreadles(userTreadlesPath);

  for (const { name, definition } of discovered) {
    const generator = generateFromTreadle(definition);

    for (const match of definition.matches) {
      matrix.setPair(match.current, match.previous, generator);
      console.log(`[DISCOVERY] Registered treadle "${name}": ${match.current} → ${match.previous}`);
    }
  }

  return matrix;
}

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
