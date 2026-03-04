/**
 * Transform Pipeline 🌀
 *
 * Composable transform enhancers for language-specific code generation.
 *
 * The pipeline transforms RawMethod[] into LanguageMethod[] through
 * a series of enhancer functions. Each enhancer adds language-specific
 * metadata and template helpers.
 *
 * @module machinery/reed/transform-pipeline
 */

import { pascalCase, camelCase, toSnakeCase } from '../stringing.js';
import { type LanguageParam, type LanguageType, type TypeFactory } from './language/types.js';
import type { LanguageMethod, RawMethod } from './language/index.js';

// ============================================================================
// Transform Context
// ============================================================================

/**
 * Context passed to all transform enhancers.
 *
 * Provides shared state and configuration for the transform pipeline.
 */
export interface TransformContext<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> {
  /** Language identifier (e.g., 'rust', 'typescript') */
  language: string;
  /** Type factory for generating language-specific types */
  types: TypeFactory<P, T>;
}

// ============================================================================
// Transform Enhancer Type
// ============================================================================

/**
 * Transform enhancer function.
 *
 * Takes methods and context, returns enhanced methods.
 * Enhancers are composed in a pipeline.
 *
 * @template M Input method type
 * @template P Parameter type
 * @template O Output method type
 */
export type TransformEnhancer<
  M extends RawMethod = RawMethod,
  P extends LanguageParam = LanguageParam,
  O extends LanguageMethod = LanguageMethod
> = (methods: M[], context: TransformContext<P>) => O[];

// ============================================================================
// Built-in Enhancers
// ============================================================================

/**
 * Naming enhancer.
 *
 * Adds camelCase, PascalCase, and snake_case name variants.
 */
export const namingEnhancer: TransformEnhancer<RawMethod, LanguageParam, LanguageMethod> = (
  methods
) => {
  return methods.map((method) => ({
    ...method,
    camelName: camelCase(method.name),
    pascalName: pascalCase(method.name),
    snakeName: toSnakeCase(method.name)
  })) as LanguageMethod[];
};

/**
 * CRUD enhancer.
 *
 * Copies crudName from raw method (added by CRUD pipeline).
 * The CRUD pipeline runs before language enhancement.
 */
export const crudEnhancer: TransformEnhancer<RawMethod, LanguageParam, LanguageMethod> = (
  methods
) => {
  return methods.map((method) => ({
    ...method,
    crudName: method.crudName || ''
  })) as LanguageMethod[];
};

// ============================================================================
// Default Pipeline
// ============================================================================

/**
 * Default enhancer pipeline.
 *
 * Applied to all languages unless overridden.
 */
export const DEFAULT_ENHANCERS: TransformEnhancer<RawMethod, LanguageParam, LanguageMethod>[] = [
  namingEnhancer,
  crudEnhancer
  // Note: templateHelperEnhancer removed - template helpers now provided by Method Enhancement system
];

// ============================================================================
// Transform Factory
// ============================================================================

/**
 * Configuration for creating a transform function.
 */
export interface TransformConfig<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
> {
  /** Language identifier */
  language: string;
  /** Type factory for generating types */
  types: TypeFactory<P, T>;
  /** Parameter name formatter */
  formatParamName: (name: string) => string;
  /** Function signature generator */
  functionSignature: (method: LanguageMethod<P, T>) => string;
  /** Async function signature generator (optional) */
  asyncFunctionSignature?: (method: LanguageMethod<P, T>) => string;
  /** Custom enhancers to add to the pipeline */
  customEnhancers?: TransformEnhancer[];
}

/**
 * Create a transform function from configuration.
 *
 * Combines default enhancers with any custom enhancers.
 *
 * @param config Transform configuration
 * @returns Transform function (RawMethod[] -> LanguageMethod[])
 */
export function createTransform<
  P extends LanguageParam = LanguageParam,
  T extends LanguageType = LanguageType
>(config: TransformConfig<P, T>): (methods: RawMethod[]) => LanguageMethod<P, T>[] {
  // Build enhancer pipeline
  const enhancers = config.customEnhancers
    ? [...DEFAULT_ENHANCERS, ...config.customEnhancers]
    : DEFAULT_ENHANCERS;

  const context: TransformContext<P, T> = {
    language: config.language,
    types: config.types
  };

  // Return transform function
  return (methods: RawMethod[]) => {
    return enhancers.reduce<LanguageMethod<P, T>[]>(
      (acc, enhancer) => enhancer(acc as any, context) as LanguageMethod<P, T>[],
      methods as LanguageMethod<P, T>[]
    );
  };
}
