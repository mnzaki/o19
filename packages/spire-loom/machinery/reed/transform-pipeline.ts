/**
 * Transform Pipeline 🌀
 *
 * Composable transform enhancers for language-specific code generation.
 *
 * The pipeline transforms MethodMetadata[] into LanguageMethod[] through
 * a series of enhancer functions. Each enhancer adds language-specific
 * metadata and template helpers.
 *
 * @module machinery/reed/transform-pipeline
 */

import type { MethodMetadata } from '../../warp/metadata.js';
import { pascalCase, camelCase, toSnakeCase } from '../stringing.js';
import type { LanguageMethod } from './language/imperative.js';
import type { LanguageParam, LanguageType, TypeFactory } from './language/types.js';

// ============================================================================
// Transform Context
// ============================================================================

/**
 * Context passed to all transform enhancers.
 *
 * Provides shared state and configuration for the transform pipeline.
 */
export interface TransformContext<T extends LanguageType = LanguageType> {
  /** Language identifier (e.g., 'rust', 'typescript') */
  language: string;
  /** Type factory for generating language-specific types */
  types: TypeFactory<T>;
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
  M extends MethodMetadata = MethodMetadata,
  O extends LanguageMethod = LanguageMethod
> = (methods: M[], context: TransformContext) => O[];

// ============================================================================
// Default Pipeline
// ============================================================================

/**
 * Default enhancer pipeline.
 *
 * Applied to all languages unless overridden.
 */
export const DEFAULT_ENHANCERS: TransformEnhancer<MethodMetadata, LanguageMethod>[] = [
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
  types: TypeFactory<T>;
  /** Parameter name formatter */
  formatParamName: (name: string) => string;
  /** Function signature generator */
  functionSignature: (method: LanguageMethod<P, T>) => string;
  /** Async function signature generator (optional) */
  asyncFunctionSignature?: (method: LanguageMethod<P, T>) => string;
  /** Custom enhancers to add to the pipeline */
  customEnhancers?: TransformEnhancer<any, LanguageMethod<P, T>>[];
}

/**
 * Create a transform function from configuration.
 *
 * Combines default enhancers with any custom enhancers.
 *
 * @param config Transform configuration
 * @returns Transform function (RawMethod[] -> LanguageMethod[])
 */
//export function createTransform<
//  P extends LanguageParam = LanguageParam,
//  T extends LanguageType = LanguageType
//>(config: TransformConfig<P, T>): (methods: RawMethod[]) => LanguageMethod<P, T>[] {
//  // Build enhancer pipeline
//  const enhancers = config.customEnhancers
//    ? [...DEFAULT_ENHANCERS, ...config.customEnhancers]
//    : DEFAULT_ENHANCERS;
//
//  const context: TransformContext<P, T> = {
//    language: config.language,
//    types: config.types
//  };
//
//  // Return transform function
//  return (methods: RawMethod[]) => {
//    return enhancers.reduce<LanguageMethod<P, T>[]>(
//      (acc, enhancer) => enhancer(acc as any, context) as LanguageMethod<P, T>[],
//      methods as LanguageMethod<P, T>[]
//    );
//  };
//}
