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

/** Patch spec or a function that returns one based on context */
export type PatchSpecOrFn = PatchSpec | ((context: GeneratorContext) => PatchSpec | undefined);

/** Output spec or a function that returns one based on context */
export type OutputSpecOrFn = OutputSpec | ((context: GeneratorContext) => OutputSpec | undefined);

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
  matches: MatchPattern[];
  methods: MethodConfig;
  /** Output files to generate (into spire/). Accepts specs or functions. */
  outputs: OutputSpecOrFn[];
  /** 
   * Patches to apply to existing files (idempotent block insertion).
   * Patches run AFTER file generation and can target any file.
   * Accepts specs or functions.
   */
  patches?: PatchSpecOrFn[];
  hookup?: HookupConfig;
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
  if (!definition.matches?.length) {
    throw new Error('TreadleDefinition must have at least one match pattern');
  }
  for (const match of definition.matches) {
    if (!match.current || !match.previous) {
      throw new Error('Match pattern must have both current and previous');
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
  return async (current: SpiralNode, previous: SpiralNode, context?: GeneratorContext): Promise<GeneratedFile[]> => {
    if (!context) {
      throw new Error('GeneratorContext is required for declarative treadles');
    }

    // Create the kit for this generation
    const kit = createTreadleKit(context);

    // Validation
    const currentType = current.typeName;
    const previousType = previous.typeName;

    const matches = definition.matches.some(
      (m) => m.current === currentType && m.previous === previousType
    );

    if (!matches) {
      if (process.env.DEBUG_MATRIX) {
        console.log(`[DECLARATIVE] Skipping: ${currentType} → ${previousType} not in matches`);
      }
      return [];
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

    // Resolve output specs (handle functions)
    const resolvedOutputs = definition.outputs
      .map((o) => (typeof o === 'function' ? o(context) : o))
      .filter((o): o is OutputSpec => o !== undefined);

    // Phase 1: Generate files using the kit (into spire/)
    const files = await kit.generateFiles(
      resolvedOutputs.map((o) => ({
        template: o.template,
        path: o.path,
        language: o.language,
        condition: o.condition,
      })),
      data,
      finalMethods
    );

    // Phase 2: Apply patches to files (can target any file, including spire/)
    if (definition.patches && definition.patches.length > 0) {
      await applyPatches(definition, definition.patches, data, context, finalMethods);
    }

    // Phase 3: Hookup (runs last)
    if (definition.hookup) {
      if (definition.hookup.type === 'custom' && definition.hookup.customHookup) {
        await definition.hookup.customHookup(context, files, data);
      } else if (definition.hookup.type !== 'custom') {
        console.log(`[DECLARATIVE] ${definition.hookup.type} hookup not yet implemented. Use customHookup.`);
      }
    }

    return files;
  };
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
  
  for (const patchOrFn of patches) {
    // Resolve patch spec (handle functions)
    const patch = typeof patchOrFn === 'function' ? patchOrFn(context) : patchOrFn;
    if (!patch) continue;

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
