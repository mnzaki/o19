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
  matches: MatchPattern[];
  methods: MethodConfig;
  outputs: OutputSpec[];
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

    // Generate files using the kit
    const files = await kit.generateFiles(
      definition.outputs.map((o) => ({
        template: o.template,
        path: o.path,
        language: o.language,
        condition: o.condition,
      })),
      data,
      finalMethods
    );

    // Hookup
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
