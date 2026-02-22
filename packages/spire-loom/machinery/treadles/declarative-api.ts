/**
 * Declarative Treadle API
 *
 * Define treadles declaratively instead of writing generator functions by hand.
 * This lives alongside existing treadles - new treadles can use either style.
 *
 * > *"The loom learns new patterns without forgetting the old."*
 */

import * as path from 'node:path';
import type {
  SpiralNode,
  GeneratedFile,
  GeneratorContext,
  GeneratorFunction,
} from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import { filterByReach } from '../reed/index.js';
import { generateCode, type RawMethod } from '../bobbin/index.js';
import type {
  MethodPipeline,
  MgmtMethod,
} from '../sley/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A transform function from the Sley pipeline.
 * Import these directly from '../sley/index.js'
 */
export type TransformFn = (pipeline: MethodPipeline) => MethodPipeline;

/**
 * Match pattern for the generator matrix.
 */
export interface MatchPattern {
  /** The outer ring type (e.g., AndroidSpiraler) */
  current: string;
  /** The inner ring type (e.g., RustCore) */
  previous: string;
}

/**
 * Method filtering and transformation configuration.
 */
export interface MethodConfig {
  /**
   * Filter by reach level.
   * - 'core': Core only (includes Private reach)
   * - 'platform': Core + Platform (Local reach)
   * - 'front': All rings (Global reach)
   */
  filter: 'core' | 'platform' | 'front';

  /**
   * Pipeline transformations to apply.
   * Import these directly from '../sley/index.js'
   * @example
   *   import { addManagementPrefix, crudInterfaceMapping } from '../sley/index.js';
   *   pipeline: [addManagementPrefix, crudInterfaceMapping]
   */
  pipeline: Array<(methods: MgmtMethod[]) => MgmtMethod[]>;
}

/**
 * Output file specification.
 */
export interface OutputSpec {
  /** Template path (relative to machinery/bobbin/templates/) */
  template: string;

  /**
   * Output path template.
   * Supports placeholders: {packageDir}, {name}, {coreName}, etc.
   */
  path: string;

  /** Target language for method transformation */
  language: 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript';

  /**
   * Optional condition for generating this file.
   * Return false to skip this output.
   */
  condition?: (context: GeneratorContext) => boolean;
}

/**
 * Package hookup configuration.
 */
export interface HookupConfig {
  /** Hookup type */
  type: 'rust-crate' | 'tauri-plugin' | 'npm-package' | 'android-gradle' | 'custom';

  /** Type-specific configuration */
  config?: Record<string, unknown>;

  /**
   * Custom hookup function (for 'custom' type).
   * Called after all files are generated.
   */
  customHookup?: (
    context: GeneratorContext,
    files: GeneratedFile[],
    data: Record<string, unknown>
  ) => Promise<void> | void;
}

/**
 * Declarative treadle definition.
 *
 * This is the primary interface for defining new treadles declaratively.
 * Use defineTreadle() to create one, then register it with the matrix.
 *
 * @example
 * ```typescript
 * import { defineTreadle } from './declarative-api.js';
 * import { addManagementPrefix } from '../sley/index.js';
 *
 * export const myTreadle = defineTreadle({
 *   matches: [{ current: 'MySpiraler', previous: 'RustCore' }],
 *   methods: {
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix]
 *   },
 *   outputs: [
 *     {
 *       template: 'my-platform/service.ts.ejs',
 *       path: '{packageDir}/spire/{name}.ts',
 *       language: 'typescript'
 *     }
 *   ],
 *   hookup: { type: 'rust-crate', config: { moduleName: 'spire' } }
 * });
 * ```
 */
export interface TreadleDefinition {
  /** Matrix match patterns - when should this treadle run? */
  matches: MatchPattern[];

  /** Method filtering and transformation */
  methods: MethodConfig;

  /** Output files to generate */
  outputs: OutputSpec[];

  /** Package hookup configuration (optional) */
  hookup?: HookupConfig;

  /**
   * Template data beyond methods.
   * Can be static object or function that receives context.
   */
  data?:
    | Record<string, unknown>
    | ((context: GeneratorContext, current: SpiralNode, previous: SpiralNode) => Record<string, unknown>);

  /**
   * Custom validation function.
   * Throw to abort generation, return false to skip silently.
   */
  validate?: (current: SpiralNode, previous: SpiralNode) => boolean | void;

  /**
   * Transform methods before they're passed to outputs.
   * Called after pipeline processing, before generation.
   */
  transformMethods?: (
    methods: RawMethod[],
    context: GeneratorContext
  ) => RawMethod[];
}

// ============================================================================
// Definition API
// ============================================================================

/**
 * Define a treadle declaratively.
 *
 * This function doesn't do anything by itself - it just validates and returns
 * the definition. Use generateFromTreadle() to convert it to a GeneratorFunction.
 *
 * @example
 * ```typescript
 * // In your treadle file:
 * import { defineTreadle } from './declarative-api.js';
 * import { addManagementPrefix } from '../sley/index.js';
 *
 * export const androidTreadle = defineTreadle({
 *   matches: [{ current: 'AndroidSpiraler', previous: 'RustCore' }],
 *   methods: { filter: 'platform', pipeline: [addManagementPrefix] },
 *   outputs: [
 *     { template: 'android/service.kt.ejs', path: '...', language: 'kotlin' }
 *   ]
 * });
 *
 * // In treadles/index.ts:
 * import { generateFromTreadle } from './declarative-api.js';
 * import { androidTreadle } from './android-treadle.js';
 *
 * matrix.setPair('AndroidSpiraler', 'RustCore', generateFromTreadle(androidTreadle));
 * ```
 */
export function defineTreadle(definition: TreadleDefinition): TreadleDefinition {
  // Basic validation
  if (!definition.matches || definition.matches.length === 0) {
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

  if (!definition.outputs || definition.outputs.length === 0) {
    throw new Error('TreadleDefinition must have at least one output');
  }

  return definition;
}

// ============================================================================
// Generation
// ============================================================================

/**
 * Convert a TreadleDefinition to a GeneratorFunction.
 *
 * This is where the magic happens - it creates a standard generator function
 * that the heddles can call, implementing all the declarative configuration.
 */
export function generateFromTreadle(definition: TreadleDefinition): GeneratorFunction {
  return async (
    current: SpiralNode,
    previous: SpiralNode,
    context?: GeneratorContext
  ): Promise<GeneratedFile[]> => {
    // -------------------------------------------------------------------------
    // Phase 1: Validation
    // -------------------------------------------------------------------------

    // Check if this generator should handle this node pair
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

    // Custom validation
    if (definition.validate) {
      const result = definition.validate(current, previous);
      if (result === false) {
        return [];
      }
    }

    // -------------------------------------------------------------------------
    // Phase 2: Method Collection & Transformation
    // -------------------------------------------------------------------------

    const plan = context?.plan;
    if (!plan) {
      throw new Error('GeneratorContext with plan is required for declarative treadles');
    }

    ensurePlanComplete(plan, 'collect methods in declarative treadle');

    const rawMethods = collectMethods(plan.managements, definition.methods);

    // Apply custom method transformation if provided
    const finalMethods = definition.transformMethods
      ? definition.transformMethods(rawMethods, context)
      : rawMethods;

    // -------------------------------------------------------------------------
    // Phase 3: Build Template Data
    // -------------------------------------------------------------------------

    // Base data
    let data: Record<string, unknown> = {
      currentType,
      previousType,
      currentRing: current.ring,
      previousRing: previous.ring,
    };

    // Merge user data
    if (definition.data) {
      const userData =
        typeof definition.data === 'function'
          ? definition.data(context, current, previous)
          : definition.data;
      data = { ...data, ...userData };
    }

    // -------------------------------------------------------------------------
    // Phase 4: Generate Output Files
    // -------------------------------------------------------------------------

    const files: GeneratedFile[] = [];

    for (const output of definition.outputs) {
      // Check condition
      if (output.condition && context) {
        const shouldGenerate = output.condition(context);
        if (!shouldGenerate) {
          continue;
        }
      }

      // Resolve path template
      const outputPath = resolvePathTemplate(output.path, data);

      // Generate the file
      const file = await generateCode({
        template: output.template,
        outputPath,
        data,
        methods: finalMethods,
      });

      files.push(file);
    }

    // -------------------------------------------------------------------------
    // Phase 5: Hookup
    // -------------------------------------------------------------------------

    if (definition.hookup && context) {
      await executeHookup(definition.hookup, context, files, data);
    }

    return files;
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Collect and transform methods according to the configuration.
 */
function collectMethods(
  managements: ManagementMetadata[],
  config: MethodConfig
): RawMethod[] {
  // Filter by reach
  const filtered = filterByReach(managements, config.filter);

  // Convert to MgmtMethod format
  const mgmtMethods: MgmtMethod[] = [];

  for (const mgmt of filtered) {
    for (const method of mgmt.methods) {
      mgmtMethods.push({
        id: `${mgmt.name}.${method.name}`,
        managementName: mgmt.name,
        name: method.name,
        jsName: method.name,
        params: method.params.map((p) => ({
          name: p.name,
          tsType: p.type,
          optional: p.optional ?? false,
        })),
        returnType: method.returnType,
        isCollection: method.operation === 'list' || method.name.startsWith('list'),
        tags: [`crud:${method.operation}`],
        crudOperation: method.operation,
      });
    }
  }

  // Apply pipeline transformations
  let processedMethods = mgmtMethods;
  for (const transform of config.pipeline) {
    processedMethods = transform(processedMethods);
  }

  // Convert to RawMethod
  return processedMethods.map((m) => ({
    name: m.name,
    implName: m.name,
    jsName: m.jsName,
    returnType: m.returnType,
    isCollection: m.isCollection,
    params: m.params.map((p) => ({
      name: p.name,
      type: p.tsType,
      optional: p.optional,
    })),
    description: `${m.managementName}.${m.name}`,
  }));
}

/**
 * Resolve path template with placeholders.
 *
 * Supported placeholders:
 * - {packageDir} - Package directory (e.g., 'o19/crates/foundframe-android')
 * - {coreName} - Core package name (e.g., 'foundframe')
 * - {name} - Service/class name
 * - Any key from the data object
 */
function resolvePathTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in data) {
      return String(data[key]);
    }
    return match; // Keep original if not found
  });
}

/**
 * Execute hookup based on configuration.
 */
async function executeHookup(
  config: HookupConfig,
  context: GeneratorContext,
  files: GeneratedFile[],
  data: Record<string, unknown>
): Promise<void> {
  switch (config.type) {
    case 'custom':
      if (config.customHookup) {
        await config.customHookup(context, files, data);
      }
      break;

    case 'rust-crate':
      // TODO: Import and call hookupRustCrate when needed
      // For now, this is a placeholder - users can use customHookup
      console.log(
        `[DECLARATIVE] Rust crate hookup not yet implemented in declarative API. Use customHookup.`
      );
      break;

    case 'tauri-plugin':
      // TODO: Implement when needed
      console.log(
        `[DECLARATIVE] Tauri plugin hookup not yet implemented in declarative API. Use customHookup.`
      );
      break;

    case 'android-gradle':
      // TODO: Implement when needed
      console.log(
        `[DECLARATIVE] Android Gradle hookup not yet implemented in declarative API. Use customHookup.`
      );
      break;

    case 'npm-package':
      // TODO: Implement when needed
      console.log(
        `[DECLARATIVE] NPM package hookup not yet implemented in declarative API. Use customHookup.`
      );
      break;

    default:
      console.warn(`[DECLARATIVE] Unknown hookup type: ${config.type}`);
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

// Re-export types that are commonly needed when defining treadles
export type { SpiralNode, GeneratedFile, GeneratorContext } from '../heddles/index.js';
export type { ManagementMetadata } from '../reed/index.js';
export type { MgmtMethod } from '../sley/index.js';
export type { RawMethod } from '../bobbin/index.js';
