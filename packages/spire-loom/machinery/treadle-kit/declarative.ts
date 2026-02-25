/**
 * Treadle Kit - Declarative API 📋
 *
 * Define treadles declaratively instead of writing generator functions by hand.
 * Built on top of the core kit.
 *
 * > *"Describe what you want, not how to do it."*
 *
 * @example
 * ```typescript
 * import { defineTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
 * import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';
 *
 * const myTreadle = defineTreadle({
 *   matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
 *   methods: {
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix]
 *   },
 *   outputs: [
 *     {
 *       template: 'my-platform/service.ts.ejs',
 *       path: '{packageDir}/spire/service.ts',
 *       language: 'typescript'
 *     }
 *   ]
 * });
 *
 * matrix.setPair('MySpiraler', 'RustCore', generateFromTreadle(myTreadle));
 * ```
 */

import type {
  SpiralNode,
  GeneratedFile,
  GeneratorContext,
  GeneratorFunction,
} from '../heddles/index.js';
import type { RawMethod } from '../bobbin/index.js';
import type { MgmtMethod } from '../sley/index.js';
import { createTreadleKit } from './core.js';
import { resolveSpecs, resolveSpecsWithCondition, type SpecOrFn } from './spec-resolver.js';
import type { HookupSpec } from '../shuttle/hookups/types.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createMarkers, ensureFileBlock, type MarkerPair } from '../shuttle/markers.js';

// ============================================================================
// Types
// ============================================================================

export interface MatchPattern {
  current: string;
  previous: string;
}

export interface MethodConfig {
  filter: 'core' | 'platform' | 'front';
  pipeline: Array<(methods: MgmtMethod[]) => MgmtMethod[]>;
}

export interface OutputSpec {
  template: string;
  path: string;
  language: 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript';
  condition?: (context: GeneratorContext) => boolean;
  /**
   * Per-output context data merged with main data for this output only.
   * Useful for per-entity generation with shared templates.
   * Context properties take precedence over main data properties.
   */
  context?: Record<string, unknown>;
}

/**
 * A patch operation to modify an existing file.
 * Used for idempotent file modifications with marker-based block management.
 * 
 * The marker scope is automatically set to the treadle name.
 */
export interface PatchSpec {
  /** Type of patch operation */
  type: 'ensureBlock';
  /** Target file path (relative to packageDir, or absolute) */
  targetFile: string;
  /** Marker identifier for the block (e.g., 'spire-deps', 'module-decl') */
  marker: string;
  /** Template to render for the block content */
  template: string;
  /** Language for marker formatting */
  language: 'rust' | 'gradle' | 'xml' | 'toml';
  /** Where to insert the block if it doesn't exist */
  position?: {
    /** Insert after this pattern */
    after?: string;
    /** Insert before this pattern */
    before?: string;
  };
}

/** Patch spec or a function that returns one (or an array) based on context */
export type PatchSpecOrFn = 
  | PatchSpec 
  | ((context: GeneratorContext) => PatchSpec | PatchSpec[] | undefined);

/** Output spec or a function that returns one (or an array) based on context */
export type OutputSpecOrFn = 
  | OutputSpec 
  | ((context: GeneratorContext) => OutputSpec | OutputSpec[] | undefined);

export interface HookupConfig {
  type: 'rust-crate' | 'tauri-plugin' | 'npm-package' | 'android-gradle' | 'custom';
  config?: Record<string, unknown>;
  customHookup?: (
    context: GeneratorContext,
    files: GeneratedFile[],
    data: Record<string, unknown>
  ) => Promise<void> | void;
}

export interface TreadleDefinition {
  /** Treadle name (auto-populated during loading) */
  name?: string;
  /** 
   * Match patterns for matrix-based generation.
   * Optional for tieup treadles (invoked directly via .tieup()).
   */
  matches?: MatchPattern[];
  methods: MethodConfig;
  /** Output files to generate (into spire/). Accepts specs or functions. */
  outputs: OutputSpecOrFn[];
  /** 
   * Patches to apply to existing files (idempotent block insertion).
   * Patches run AFTER file generation and can target any file.
   * Accepts specs or functions.
   */
  patches?: PatchSpecOrFn[];
  
  /**
   * Declarative hookups - configure external files (AndroidManifest.xml, Cargo.toml, etc.)
   * Type is inferred from path. Runs after patches.
   * Accepts specs or functions.
   */
  hookups?: Array<SpecOrFn<HookupSpec, GeneratorContext>>;
  
  /**
   * Legacy hookup config (deprecated).
   * @deprecated Use hookups array instead
   */
  hookup?: HookupConfig;
  
  /**
   * Configuration schema for tieup treadles.
   * Declares expected warpData shape. Used for validation and type inference.
   * @example
   * config: {
   *   entities: [] as string[],
   *   operations: [] as ('create' | 'read')[]
   * }
   */
  config?: Record<string, unknown>;
  
  data?:
    | Record<string, unknown>
    | ((context: GeneratorContext, current: SpiralNode, previous: SpiralNode) => Record<string, unknown>);
  validate?: (current: SpiralNode, previous: SpiralNode) => boolean | void;
  transformMethods?: (methods: RawMethod[], context: GeneratorContext) => RawMethod[];
}

// ============================================================================
// Definition Function
// ============================================================================

/**
 * Define a treadle declaratively.
 *
 * Validates the definition at creation time and returns a TreadleDefinition
 * that can be used with `generateFromTreadle()`.
 */
export function defineTreadle(definition: TreadleDefinition): TreadleDefinition {
  // Matrix treadles (with matches) need match validation
  // Tieup treadles (without matches) are invoked directly
  if (definition.matches && definition.matches.length > 0) {
    for (const match of definition.matches) {
      if (!match.current || !match.previous) {
        throw new Error('Match pattern must have both current and previous');
      }
    }
  }
  if (!definition.methods) {
    throw new Error('TreadleDefinition must have methods configuration');
  }
  if (!definition.outputs?.length) {
    throw new Error('TreadleDefinition must have at least one output');
  }
  return definition;
}

// ============================================================================
// Generation Function
// ============================================================================

/**
 * Convert a TreadleDefinition into a GeneratorFunction.
 *
 * This bridges the declarative and imperative worlds. The definition describes
 * what to generate, and this function creates the actual generator that the
 * matrix can call.
 * 
 * ## Phase Order
 * 1. **File Generation** - Outputs are generated into spire/ directory
 * 2. **Patching** - Patches are applied to any file (including spire/ files)
 * 3. **Hookup** - Custom hookup runs last
 */
export function generateFromTreadle(definition: TreadleDefinition): GeneratorFunction {
  const generator = async (current: SpiralNode, previous: SpiralNode, context?: GeneratorContext): Promise<GeneratedFile[]> => {
    if (!context) {
      throw new Error('GeneratorContext is required for declarative treadles');
    }

    // Create the kit for this generation
    const kit = createTreadleKit(context);

    // Validation
    const currentType = current.typeName;
    const previousType = previous.typeName;

    // Skip match validation for tieup treadles (no matches defined)
    // Tieup treadles are invoked directly, not via matrix lookup
    if (definition.matches && definition.matches.length > 0) {
      const matches = definition.matches.some(
        (m) => m.current === currentType && m.previous === previousType
      );

      if (!matches) {
        if (process.env.DEBUG_MATRIX) {
          console.log(`[DECLARATIVE] Skipping: ${currentType} → ${previousType} not in matches`);
        }
        return [];
      }
    }

    if (definition.validate) {
      const result = definition.validate(current, previous);
      if (result === false) return [];
    }

    // Method collection using the kit
    const rawMethods = kit.collectMethods(definition.methods);
    const finalMethods = definition.transformMethods
      ? definition.transformMethods(rawMethods, context)
      : rawMethods;

    // Build data
    let data: Record<string, unknown> = {
      currentType,
      previousType,
      currentRing: current.ring,
      previousRing: previous.ring,
    };

    if (definition.data) {
      const userData =
        typeof definition.data === 'function'
          ? definition.data(context, current, previous)
          : definition.data;
      data = { ...data, ...userData };
    }

    // Resolve output specs (handle functions returning single OR array)
    const resolvedOutputs = resolveSpecs(definition.outputs, context);

    // Phase 1: Generate files using the kit (into spire/)
    const files = await kit.generateFiles(
      resolvedOutputs.map((o) => ({
        template: o.template,
        path: o.path,
        language: o.language,
        condition: o.condition,
        context: o.context,
      })),
      data,
      finalMethods
    );

    // Phase 2: Apply patches to files (can target any file, including spire/)
    if (definition.patches && definition.patches.length > 0) {
      await applyPatches(definition, definition.patches, data, context, finalMethods);
    }

    // Phase 3: Hookup (runs last)
    
    // 3a: New declarative hookups (preferred)
    if (definition.hookups && definition.hookups.length > 0) {
      const { runHookups } = await import('../shuttle/hookups/index.js');
      
      // Resolve hookup specs (handle functions returning single OR array)
      const resolvedHookups = resolveSpecsWithCondition(definition.hookups, context);
      
      if (resolvedHookups.length > 0) {
        const results = await runHookups(resolvedHookups, context);
        
        if (process.env.DEBUG_MATRIX) {
          for (const result of results) {
            console.log(`[HOOKUP] ${result.type}: ${result.status} - ${result.message}`);
          }
        }
      }
    }
    
    // 3b: Legacy hookup config (backward compatibility)
    if (definition.hookup) {
      if (definition.hookup.type === 'custom' && definition.hookup.customHookup) {
        await definition.hookup.customHookup(context, files, data);
      } else if (definition.hookup.type !== 'custom') {
        console.log(`[DECLARATIVE] ${definition.hookup.type} hookup not yet implemented. Use customHookup or declarative hookups.`);
      }
    }

    return files;
  };
  
  // Attach treadle name for logging
  (generator as any).treadleName = definition.name || 'anonymous';
  
  return generator;
}

/**
 * Apply patches to files.
 * 
 * Patches are applied after file generation and can target any file,
 * including files in the spire/ directory or existing package files.
 */
async function applyPatches(
  definition: TreadleDefinition,
  patches: PatchSpecOrFn[],
  data: Record<string, unknown>,
  context: GeneratorContext,
  methods: RawMethod[]
): Promise<void> {
  // Get the treadle name for marker scope
  const treadleName = definition.name || 'treadle';
  
  // Resolve patches (handle functions returning single OR array)
  const resolvedPatches = resolveSpecs(patches, context);
  
  for (const patch of resolvedPatches) {
    // Resolve target file path
    const targetPath = path.isAbsolute(patch.targetFile)
      ? patch.targetFile
      : path.join(context.packageDir, patch.targetFile);

    // Generate block content from template
    const { generateCode } = await import('../bobbin/index.js');
    const blockContent = await generateCode({
      template: patch.template,
      outputPath: targetPath,
      data,
      methods,
    });

    // Create markers using treadle name as scope
    const markers = createMarkers(patch.language, treadleName, patch.marker);

    // Apply the patch
    ensureFileBlock(targetPath, markers, blockContent.content, {
      insertAfter: patch.position?.after,
      insertBefore: patch.position?.before,
    });

    if (process.env.DEBUG_MATRIX) {
      console.log(`[PATCH] Applied ${patch.marker} to ${patch.targetFile}`);
    }
  }
}
