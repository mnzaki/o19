/**
 * Treadle Kit - Declarative API 📋
 *
 * Define treadles declaratively instead of writing generator functions by hand.
 * Built on top of the core kit.
 *
 * Pulled inward from self-declarer.ts - treadles declare themselves
 * in the 'weave' scope (weaving run).
 *
 * > *"Describe what you want, not how to do it."*
 *
 * @example
 * ```typescript
 * import { declareTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';
 * import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';
 *
 * const myTreadle = declareTreadle({
 *   matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
 *   methods: {
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix]
 *   },
 *   outputs: [
 *     {
 *       template: 'my-platform/service.ts.mejs',
 *       path: '{packageDir}/spire/service.ts',
 *       language: 'typescript'
 *     }
 *   ]
 * });
 *
 * matrix.setPair('MySpiraler', 'RustCore', generateFromTreadle(myTreadle));
 * ```
 */

import { declare } from '../self-declarer.js';
import type { SpiralNode } from '../heddles/index.js';
import { createTreadleKit } from './kit.js';
import { resolveSpecs, resolveSpecsWithCondition, type SpecOrFn } from './spec-resolver.js';
import type { hookup } from '../sley/index.js';
import type { LanguageMethod } from '../reed/index.js';
import type { MethodMetadata } from '../../warp/metadata.js';
import type { GeneratedFile, GeneratorContext, TreadleTrodder } from '../../weaver/plan-builder.js';
import { createQueryAPI } from '../sley/query.js';

// ============================================================================
// Types
// ============================================================================

export interface MatchPattern {
  current: string;
  previous: string;
}

export interface MethodConfig {
  filter: 'core' | 'platform' | 'front';
  pipeline: Array<(methods: MethodMetadata[]) => MethodMetadata[]>;
}

/**
 * New file specification for file generation.
 * Language is auto-detected from template filename extension.
 */
export interface NewFileSpec {
  template: string;
  path: string;
  condition?: (context: GeneratorContext) => boolean;
  /**
   * Per-file context data merged with main data for this file only.
   * Useful for per-entity generation with shared templates.
   * Context properties take precedence over main data properties.
   */
  context?: Record<string, unknown>;
}

/*
 * PATCHES DISABLED - Use hookups instead for file modifications
 *
 * export interface PatchSpec { ... }
 * export type PatchSpecOrFn = ...
 */

/** New file spec or a function that returns one (or an array) based on context */
export type NewFileSpecOrFn =
  | NewFileSpec
  | ((context: GeneratorContext) => NewFileSpec | NewFileSpec[] | undefined);

export interface TreadleDefinition {
  /** Treadle name (auto-populated during loading) */
  name?: string;
  /**
   * Match patterns for matrix-based generation.
   * Optional for tieup treadles (invoked directly via .tieup()).
   */
  matches?: MatchPattern[];
  methods: MethodConfig;

  /**
   * Language enhancement configuration.
   * - string: Single language (default for all methods)
   * - string[]: Multiple languages, first is default
   * - undefined: Auto-detect per output from template filename
   */
  language?: string | string[];

  /** New files to generate (into spire/). Accepts specs or functions. */
  newFiles?: NewFileSpecOrFn[];

  /**
   * Declarative hookups - configure external files (AndroidManifest.xml, Cargo.toml, etc.)
   * Type is inferred from path. Runs after patches.
   * Accepts specs or functions.
   */
  hookups?:
    | Array<SpecOrFn<hookup.HookupSpec, GeneratorContext>>
    | SpecOrFn<hookup.HookupSpec, GeneratorContext>;

  /**
   * Configuration schema for tieup treadles.
   * Declares expected config shape. Used for validation and type inference.
   * @example
   * config: {
   *   entities: [] as string[],
   *   operations: [] as ('create' | 'read')[]
   * }
   */
  config?: Record<string, unknown>;

  data?:
    | Record<string, unknown>
    | ((
        context: GeneratorContext,
        current: SpiralNode,
        previous: SpiralNode
      ) => Record<string, unknown>);
  validate?: (current: SpiralNode, previous: SpiralNode) => boolean | void;
  transformMethods?: (methods: LanguageMethod[], context: GeneratorContext) => LanguageMethod[];
}

// ============================================================================
// Treadle Declarer - 'weave' scope
// ============================================================================

/**
 * Declare a treadle.
 *
 * Creates a declarer in 'weave' scope (weaving run lifetime).
 *
 * Call this at module load time in machinery/treadles/{name}.ts.
 * The treadle becomes available in the 'weave' scope registry.
 *
 * @example
 * ```typescript
 * // machinery/treadles/my-treadle.ts
 * export const myTreadle = declareTreadle({
 *   name: 'my-treadle',
 *   matches: [{ current: 'AndroidSpiraler', previous: 'RustCore' }],
 *   methods: { filter: 'platform', pipeline: [] },
 *   newFiles: [{ template: '...', path: '...', language: 'kotlin' }]
 * });
 * ```
 */
export const declareTreadle = declare<TreadleDefinition, TreadleTrodder>({
  name: 'treadle',
  scope: 'weave',
  validate: (def) => {
    // Matrix treadles (with matches) need match validation
    if (def.matches && def.matches.length > 0) {
      for (const match of def.matches) {
        if (!match.current || !match.previous) {
          throw new Error('Match pattern must have both current and previous');
        }
      }
    }
    if (!def.methods) {
      throw new Error('TreadleDefinition must have methods configuration');
    }
  },
  declare: generateFromTreadleDefinition
});

// ============================================================================
// Generation Function
// ============================================================================

/**
 * Convert a TreadleDefinition into a TreadleMatch.
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
export function generateFromTreadleDefinition(definition: TreadleDefinition): TreadleTrodder {
  const generator = async (
    current: SpiralNode,
    previous: SpiralNode,
    context?: GeneratorContext
  ): Promise<GeneratedFile[]> => {
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
    const finalMethods = definition.transformMethods
      ? createQueryAPI(definition.transformMethods(context.methods.all, context))
      : context.methods;

    // Build data with defaults (entities and methods always available)
    let data: Record<string, unknown> = {
      // Always provide context.... entities and methods to templates
      ...context,
      currentType,
      previousType,
      currentRing: current.ring,
      previousRing: previous.ring
    };

    if (definition.data) {
      const userData =
        typeof definition.data === 'function'
          ? definition.data(context, current, previous)
          : definition.data;
      data = { ...data, ...userData };
    }

    let resolvedNewFiles = !definition.newFiles ? [] : resolveSpecs(definition.newFiles, context);

    let files: GeneratedFile[] = [];
    if (!resolvedNewFiles.length) {
      files = [];
    } else {
      // Apply declared language enhancement (if specified)
      if (definition.language) {
        const langs = Array.isArray(definition.language)
          ? definition.language
          : [definition.language];
        kit.language.add(...langs);

        // Update data with enhanced methods reference
        data.methods = context.methods;
      }

      // Phase 1: Generate files using the kit (into spire/)
      // Language is auto-detected from template filename
      files = await kit.generateFiles(
        resolvedNewFiles.map((f) => ({
          template: f.template,
          path: f.path,
          condition: f.condition,
          context: f.context
        })),
        data,
        finalMethods,
        context.entities
      );
    }

    // Phase 2: Hookup (runs after file generation) (runs last)
    const hookups = Array.isArray(definition.hookups)
      ? definition.hookups
      : definition.hookups
        ? [definition.hookups]
        : [];

    // 3a: New declarative hookups (preferred)
    if (hookups && hookups.length > 0) {
      const { runHookups } = await import('../sley/hookups/index.js');

      // Resolve hookup specs (handle functions returning single OR array)
      const resolvedHookups = resolveSpecsWithCondition(hookups, context);

      if (resolvedHookups.length > 0) {
        const results = await runHookups(resolvedHookups, data as unknown as GeneratorContext);

        if (process.env.DEBUG_MATRIX) {
          for (const result of results) {
            console.log(`[HOOKUP] ${result.type}: ${result.status} - ${result.message}`);
          }
        }
      }
    }

    return files;
  };

  // Attach treadle name for logging
  (generator as any).treadleName = definition.name || 'anonymous';
  
  // Attach definition metadata for discovery
  (generator as any).matches = definition.matches;
  (generator as any).methods = definition.methods;
  (generator as any).newFiles = definition.newFiles;
  (generator as any).hookups = definition.hookups;
  (generator as any).config = definition.config;

  return generator;
}
