/**
 * Management Collector
 *
 * Collects and parses Management Imprints from loom/ files.
 * Extracts @reach and @crud metadata for code generation.
 * Uses Stage 3 decorator metadata (WeakMap-based).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * IMPORT STRATEGY NOTE:
 *
 * We import from '@o19/spire-loom/warp/imprint' (package path) instead of
 * '../../warp/imprint.js' (relative path) to ensure the SAME module instance
 * is used as Management classes that call @loom.reach().
 *
 * WHY THIS MATTERS:
 *   - Management classes in other packages import '@o19/spire-loom'
 *   - The collector was using a relative import, causing different module instances
 *   - WeakMap metadata stored by @reach() was invisible to getReach()
 *
 * GLOBAL REGISTRY SAFETY NET:
 *   Even with different import paths, the global registry in imprint.ts ensures
 *   metadata is shared. But using consistent imports reduces confusion.
 */
import {
  getReach,
  getCrudMethods,
  getMethodTags,
  getLinkTarget,
  getEntities,
  type CrudMetadata,
  type LinkMetadata,
  type EntityMetadata,
  Management
} from '@o19/spire-loom/warp/imprint';
import { getEntityFields } from './entity-field-collector.js';

// TypeScript method signature parser
interface ParsedMethod {
  name: string;
  params: Array<{ name: string; type: string; optional?: boolean }>;
  returnType: string;
}

/**
 * Split parameter string on commas, but respect generic type brackets.
 *
 * Exported for testing purposes.
 *
 * This prevents splitting on commas inside type parameters like:
 *   Record<string, unknown>
 *   Map<string, Array<number>>
 *
 * @param paramsStr - The parameter string from the method signature
 * @returns Array of individual parameter strings
 */
export function splitParamsRespectingGenerics(paramsStr: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let depth = 0; // Track nesting depth of < > brackets

  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr[i];

    if (char === '<') {
      depth++;
      currentPart += char;
    } else if (char === '>') {
      depth--;
      currentPart += char;
    } else if (char === ',' && depth === 0) {
      // Only split on commas at top level (not inside generics)
      if (currentPart.trim()) {
        parts.push(currentPart.trim());
      }
      currentPart = '';
    } else {
      currentPart += char;
    }
  }

  // Don't forget the last part
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  return parts;
}

/**
 * Parse TypeScript source file to extract method signatures.
 * This is a simple regex-based parser for Management classes.
 */
function parseMethodSignatures(sourceFile: string): Map<string, ParsedMethod> {
  const methods = new Map<string, ParsedMethod>();
  const content = fs.readFileSync(sourceFile, 'utf-8');

  // Match method signatures like:
  //   addBookmark(url: string, title?: string, notes?: string): string
  //   getNodeId(): string
  //   confirmPairing(deviceId: string, code: string): boolean
  const methodRegex = /^(\s+)(\w+)\s*\(([^)]*)\)\s*:\s*(\w+(?:\[\])?)\s*\{/gm;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, , name, paramsStr, returnType] = match;

    // Skip constructor and private methods
    if (name === 'constructor' || name.startsWith('_')) continue;

    // Parse parameters
    const params: Array<{ name: string; type: string; optional?: boolean }> = [];
    if (paramsStr.trim()) {
      // Smart split: don't split on commas inside < > brackets
      const paramParts = splitParamsRespectingGenerics(paramsStr);
      for (const param of paramParts) {
        // Match: name: type or name?: type
        // Stop at // or /* comments to avoid capturing trailing comments as type
        const paramMatch = param.match(/^(\w+)(\?)?:\s*(.+?)(?:\s*\/\/|\s*\/\*|$)/);
        if (paramMatch) {
          params.push({
            name: paramMatch[1],
            type: paramMatch[3].trim(),
            optional: !!paramMatch[2]
          });
        }
      }
    }

    methods.set(name, {
      name,
      params,
      returnType: returnType.trim()
    });
  }

  return methods;
}

/**
 * CRUD operation type.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Management reach level.
 */
export type ReachLevel = 'Private' | 'Local' | 'Global';

/**
 * Method metadata from @crud decorator.
 *
 * NOTE: This contains ONLY immediately available metadata from the loom source.
 * Computed values (useResult, wrappers) are added by heddles, not here.
 */
export interface MethodMetadata {
  /** Method name */
  name: string;
  /** CRUD operation type (if CRUD-tagged) */
  operation?: CrudOperation;
  /** Parameter types (parsed from signature) */
  params: Array<{ name: string; type: string; optional?: boolean }>;
  /** Return type */
  returnType: string;
  /** JSDoc description */
  description?: string;
  /** Whether this is a collection operation (returns array) */
  isCollection?: boolean;
  /** Whether this is a soft delete */
  isSoftDelete?: boolean;
  /** Tags attached to this method (e.g., ['crud:create', 'auth:required']) */
  tags?: string[];
}

/**
 * Management Imprint metadata.
 *
 * NOTE: This contains ONLY immediately available metadata from the loom source.
 * The link is stored as-is; heddles will resolve it to compute wrappers/useResult.
 */
export interface ManagementMetadata {
  /** Management class name (e.g., "BookmarkMgmt") */
  name: string;
  /** Reach level from @reach decorator */
  reach: ReachLevel;
  /** Source file path */
  sourceFile: string;
  /** Methods with their CRUD metadata */
  methods: MethodMetadata[];
  /** Entity classes associated with this management */
  entities: EntityMetadata[];
  /** Constants defined in the management */
  constants: Record<string, unknown>;
  /** Link target for routing (raw, unresolved) */
  link?: LinkMetadata;
}

/**
 * Collect all Management Imprints from loom/ directory.
 *
 * This function uses a TWO-PHASE scanning approach:
 *
 * PHASE 1: Scan WARP.ts exports
 *   - Catches managements re-exported from other packages
 *   - Example: `export * from '@o19/foundframe'` brings in BookmarkMgmt
 *   - This is essential for monorepos where managements live in shared packages
 *
 * PHASE 2: Scan individual .ts files in loom/
 *   - Catches managements defined directly in the workspace
 *   - Example: loom/my-custom-mgmt.ts with local management classes
 *
 * DEDUPLICATION:
 *   The seenClasses Set prevents duplicates when the same class is exported
 *   from both WARP.ts (via re-export) and a local file.
 *
 * @param loomDir - Path to the loom/ directory (e.g., /project/code/loom)
 * @returns Array of ManagementMetadata for all discovered managements
 */
export async function collectManagements<T extends typeof Management>(
  loomDir: string
): Promise<ManagementMetadata[]> {
  const managements: ManagementMetadata[] = [];
  // Track seen classes to prevent duplicates between phase 1 and phase 2
  const seenClasses = new Set<T>();

  // Determine workspace root from loomDir (parent of loom/)
  const workspaceRoot = path.dirname(loomDir);
  const originalCwd = process.cwd();

  // Temporarily change to workspace root for consistent module resolution
  // This ensures imports like @o19/foundframe-front resolve correctly
  // regardless of where spire-loom is run from
  process.chdir(workspaceRoot);

  if (process.env.DEBUG_MANAGEMENT) {
    console.log(`[DEBUG] Changed cwd to workspace root: ${workspaceRoot}`);
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: Scan exports from WARP.ts
    // ═══════════════════════════════════════════════════════════════════════════
    // WARP.ts is the central registry that re-exports managements from other
    // packages. We scan it first to pick up shared managements.
    const warpPath = path.join(loomDir, 'WARP.ts');
    if (fs.existsSync(warpPath)) {
      try {
        const moduleUrl = pathToFileURL(warpPath).href;
        const warpModule = await import(moduleUrl);

        for (const [exportName, exported] of Object.entries(warpModule)) {
          // Check if this export is a class with @reach decorator
          if (typeof exported === 'function' && getReach(exported)) {
            if (!seenClasses.has(exported as T)) {
              seenClasses.add(exported as T);
              const mgmt = extractMetadata(exported as T, warpPath);
              managements.push(mgmt);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan WARP.ts exports:`, error);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: Scan individual .ts files in loom/
    // ═══════════════════════════════════════════════════════════════════════════
    // This picks up any managements defined locally, not via re-export.
    const files = fs
      .readdirSync(loomDir)
      .filter((f) => f.endsWith('.ts') && f !== 'WARP.ts')
      .map((f) => path.join(loomDir, f));

    if (process.env.DEBUG_MANAGEMENT) {
      console.log(`[DEBUG] Phase 2: Scanning ${files.length} files in ${loomDir}`);
      console.log(`[DEBUG] Files: ${files.map((f) => path.basename(f)).join(', ')}`);
    }

    for (const file of files) {
      try {
        const mgmt = await loadManagement(file, seenClasses);
        if (mgmt) {
          if (process.env.DEBUG_MANAGEMENT) {
            console.log(`[DEBUG] Loaded management: ${mgmt.name} from ${path.basename(file)}`);
          }
          managements.push(mgmt);
        } else if (process.env.DEBUG_MANAGEMENT) {
          console.log(`[DEBUG] No management found in ${path.basename(file)}`);
        }
      } catch (error) {
        console.warn(`Warning: Could not load ${file}:`, error);
        if (process.env.DEBUG_MANAGEMENT) {
          console.log(`[DEBUG] Error loading ${path.basename(file)}:`, error);
        }
      }
    }
  } finally {
    // Always restore original cwd
    process.chdir(originalCwd);
    if (process.env.DEBUG_MANAGEMENT) {
      console.log(`[DEBUG] Restored cwd to: ${originalCwd}`);
    }
  }

  return managements;
}

/**
 * Load a single Management from a file.
 *
 * @param seenClasses - Optional Set of already-seen classes to avoid duplicates
 */
async function loadManagement<T extends typeof Management>(
  filePath: string,
  seenClasses?: Set<T>
): Promise<ManagementMetadata | null> {
  // Import the module
  const moduleUrl = pathToFileURL(filePath).href;

  if (process.env.DEBUG_MANAGEMENT) {
    console.log(`[DEBUG] Loading: ${path.basename(filePath)}`);
  }

  const module = await import(moduleUrl);

  if (process.env.DEBUG_MANAGEMENT) {
    console.log(`[DEBUG]   Exports: ${Object.keys(module).join(', ')}`);
  }

  // Find classes with @reach decorator (indicated by reachMetadata)
  for (const [exportName, exported] of Object.entries(module)) {
    const hasReach = getReach(exported as T);
    if (process.env.DEBUG_MANAGEMENT) {
      console.log(`[DEBUG]   ${exportName}: type=${typeof exported}, hasReach=${!!hasReach}`);
    }
    if (typeof exported === 'function' && hasReach) {
      const mgmtClass = exported as T;

      // Skip if already seen (prevents duplicates from WARP.ts scanning)
      if (seenClasses?.has(mgmtClass)) {
        if (process.env.DEBUG_MANAGEMENT) {
          console.log(`[DEBUG]   Skipping ${exportName} - already seen`);
        }
        continue;
      }
      seenClasses?.add(mgmtClass);

      // This is a Management class
      if (process.env.DEBUG_MANAGEMENT) {
        console.log(`[DEBUG]   Found management: ${exportName}`);
      }
      return extractMetadata(mgmtClass, filePath);
    }
  }

  return null;
}

/**
 * Extract metadata from a Management class.
 */
function extractMetadata<T extends typeof Management>(
  mgmtClass: T,
  sourceFile: string
): ManagementMetadata {
  // Get reach from decorator metadata (Stage 3)
  const reach = getReach(mgmtClass) ?? 'Private';

  // Get link target from decorator metadata
  const rawLink = getLinkTarget(mgmtClass);

  // Build link metadata (raw, unresolved - heddles will compute useResult/wrappers)
  const link: LinkMetadata | undefined = rawLink
    ? {
        structClass: rawLink.structClass ?? (rawLink as any).constructor,
        fieldName: rawLink.fieldName ?? ''
        // useResult and wrappers are NOT computed here - heddles will resolve them
      }
    : undefined;

  // Get CRUD methods from decorator metadata
  const crudMethods = getCrudMethods(mgmtClass);

  // Get method tags from decorator metadata
  const methodTags = getMethodTags(mgmtClass);

  // Parse method signatures from source file
  const parsedMethods = parseMethodSignatures(sourceFile);

  const methods: MethodMetadata[] = [];
  const processedMethods = new Set<string>();

  // First, collect all CRUD-tagged methods
  if (crudMethods) {
    for (const [methodName, metadata] of crudMethods) {
      // Get parsed signature if available
      const parsed = parsedMethods.get(methodName);

      // Get tags for this method
      const tags = methodTags?.get(methodName);

      methods.push({
        name: methodName,
        operation: metadata.operation as CrudOperation,
        params: parsed?.params ?? [],
        returnType: parsed?.returnType ?? 'void',
        isCollection: metadata.collection,
        isSoftDelete: metadata.soft,
        tags
        // useResult is NOT set here - heddles will compute it from struct config
      });
      processedMethods.add(methodName);
    }
  }

  // Then, collect all other parsed methods (non-CRUD)
  for (const [methodName, parsed] of parsedMethods.entries()) {
    if (processedMethods.has(methodName)) continue;

    // Get tags for this method (if any)
    const tags = methodTags?.get(methodName);

    methods.push({
      name: methodName,
      params: parsed.params,
      returnType: parsed.returnType,
      isCollection: false,
      isSoftDelete: false,
      tags
      // useResult is NOT set here - heddles will compute it from struct config
    });
  }

  // Get constants from prototype
  const constants: Record<string, unknown> = {};
  const prototype = mgmtClass.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const name of propertyNames) {
    if (name === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor?.value !== undefined && typeof descriptor.value !== 'function') {
      constants[name] = descriptor.value;
    }
  }

  // Get entities from decorator metadata
  const entities = getEntities(mgmtClass) ?? [];

  // Collect field metadata for each entity
  for (const entity of entities) {
    try {
      entity.fields = getEntityFields(entity.entityClass);
    } catch (error) {
      console.warn(`Warning: Could not collect fields for entity ${entity.name}:`, error);
      entity.fields = [];
    }
  }

  return {
    name: mgmtClass.name,
    reach,
    sourceFile,
    methods,
    entities,
    constants,
    link
  };
}

/**
 * Filter managements by reach level for a specific ring.
 *
 * Reach levels:
 * - Global: Available in all rings (core → platform → tauri → ddd → front)
 * - Local:  Available in core, platform, tauri, ddd (NOT front/typescript)
 * - Private: Core only
 */
export function filterByReach(
  managements: ManagementMetadata[],
  ringType: 'core' | 'platform' | 'tauri' | 'ddd' | 'front'
): ManagementMetadata[] {
  const reachMap: Record<string, ReachLevel[]> = {
    core: ['Private', 'Local', 'Global'],
    platform: ['Local', 'Global'],
    tauri: ['Local', 'Global'], // Local includes tauri
    ddd: ['Local', 'Global'], // Local includes ddd
    front: ['Global'] // Only Global reaches front
  };

  const allowedReach = reachMap[ringType] || ['Global'];

  return managements.filter((m) => allowedReach.includes(m.reach));
}

/**
 * Filter methods by CRUD operation.
 */
export function filterByCrud(
  management: ManagementMetadata,
  operations: CrudOperation[]
): MethodMetadata[] {
  return management.methods.filter((m) => m.operation && operations.includes(m.operation));
}

/**
 * Group managements by their reach level.
 */
export function groupByReach(
  managements: ManagementMetadata[]
): Map<ReachLevel, ManagementMetadata[]> {
  const grouped = new Map<ReachLevel, ManagementMetadata[]>();

  for (const mgmt of managements) {
    if (!grouped.has(mgmt.reach)) {
      grouped.set(mgmt.reach, []);
    }
    grouped.get(mgmt.reach)!.push(mgmt);
  }

  return grouped;
}

/**
 * Generate AIDL methods from Management metadata.
 */
export function toAidlMethods(managements: ManagementMetadata[]): Array<{
  name: string;
  returnType: string;
  params: Array<{ name: string; type: string }>;
  description?: string;
}> {
  const methods: Array<{
    name: string;
    returnType: string;
    params: Array<{ name: string; type: string }>;
    description?: string;
  }> = [];

  for (const mgmt of managements) {
    for (const method of mgmt.methods) {
      methods.push({
        name: method.name,
        returnType: method.returnType === 'void' ? 'void' : 'String',
        params: method.params.map((p) => ({
          name: p.name,
          type: mapTsToAidlType(p.type)
        })),
        description: method.description || `${mgmt.name}.${method.name}`
      });
    }
  }

  return methods;
}

/**
 * Map TypeScript types to AIDL types.
 */
function mapTsToAidlType(tsType: string): string {
  const typeMap: Record<string, string> = {
    string: 'String',
    String: 'String',
    number: 'int',
    boolean: 'boolean',
    void: 'void',
    any: 'String'
  };

  // Handle arrays
  if (tsType.endsWith('[]')) {
    const inner = tsType.slice(0, -2);
    return `${mapTsToAidlType(inner)}[]`;
  }

  // Handle optionals
  if (tsType.endsWith('?')) {
    const inner = tsType.slice(0, -1);
    return mapTsToAidlType(inner);
  }

  return typeMap[tsType] || 'String';
}
