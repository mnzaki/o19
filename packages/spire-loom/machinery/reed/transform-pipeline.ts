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

import {
  pascalCase,
  camelCase,
  toSnakeCase,
} from '../stringing.js';
import {
  type RawMethod,
  type BaseParam,
  type LanguageMethod,
  type LanguageParam,
  type LanguageType,
  type TypeFactory,
} from './language/types.js';
import { deriveCrudMethodName } from '../../warp/crud-derivation.js';
import {
  ParamCollection,
  SignatureHelper,
  CrudNameRenderer,
  StubReturnRenderer,
  TypeDefRenderer,
  type ParamRenderConfig,
  type SignatureRenderConfig,
} from './language/template-helpers.js';

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
  /** Parameter rendering configuration */
  paramConfig: ParamRenderConfig;
  /** Signature rendering configuration */
  signatureConfig: SignatureRenderConfig;
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
 * Base type mapping enhancer.
 *
 * Maps TypeScript types to language-specific types using the TypeFactory.
 * Adds langType to params and returnTypeDef to methods.
 */
export const baseTypeMappingEnhancer: TransformEnhancer<
  RawMethod,
  LanguageParam,
  LanguageMethod
> = (methods, context) => {
  return methods.map((method) => {
    // Map return type
    const returnTypeDef = context.types.fromTsType(
      method.returnType,
      method.isCollection
    );

    // Map params
    const params = method.params.map((p) => ({
      ...p,
      langType: context.types.fromTsType(p.type, false).name,
      formattedName: context.paramConfig.formatParamName(p.name),
    }));

    return {
      ...method,
      params: params as LanguageParam[],
      returnTypeDef,
      stubReturn: returnTypeDef.stubReturn,
    } as LanguageMethod;
  });
};

/**
 * Naming enhancer.
 *
 * Adds camelCase, PascalCase, and snake_case name variants.
 */
export const namingEnhancer: TransformEnhancer<
  LanguageMethod,
  LanguageParam,
  LanguageMethod
> = (methods) => {
  return methods.map((method) => ({
    ...method,
    camelName: camelCase(method.name),
    pascalName: pascalCase(method.name),
    snakeName: toSnakeCase(method.name),
  }));
};

/**
 * CRUD enhancer.
 *
 * Copies crudName from raw method (added by CRUD pipeline).
 * The CRUD pipeline runs before language enhancement.
 */
export const crudEnhancer: TransformEnhancer<
  LanguageMethod,
  LanguageParam,
  LanguageMethod
> = (methods) => {
  return methods.map((method) => ({
    ...method,
    crudName: (method as RawMethod).crudName || ''
  }));
};

/**
 * Template helper enhancer.
 *
 * Adds ParamCollection, SignatureHelper, and other template helpers.
 */
export const templateHelperEnhancer: TransformEnhancer<
  LanguageMethod,
  LanguageParam,
  LanguageMethod
> = (methods, context) => {
  return methods.map((method) => ({
    ...method,
    // Param collection with renderers
    params: new ParamCollection(method.params, context.paramConfig),
    // Signature helper
    signature: new SignatureHelper(method, context.signatureConfig),
    // CRUD name renderer
    crudRenderer: new CrudNameRenderer(method.crudName),
    // Stub return renderer
    stubRenderer: new StubReturnRenderer(method.stubReturn),
    // Type definition renderer
    typeRenderer: new TypeDefRenderer(method.returnTypeDef),
  }));
};

// ============================================================================
// Default Pipeline
// ============================================================================

/**
 * Default enhancer pipeline.
 *
 * Applied to all languages unless overridden.
 */
export const DEFAULT_ENHANCERS: TransformEnhancer<
  RawMethod,
  LanguageParam,
  LanguageMethod
>[] = [
  baseTypeMappingEnhancer,
  namingEnhancer,
  crudEnhancer,
  templateHelperEnhancer,
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

  // Build transform context
  const paramConfig: ParamRenderConfig = {
    formatParamName: config.formatParamName,
    typeKey: `${config.language}Type`,
  };

  const signatureConfig: SignatureRenderConfig<LanguageMethod<P, T>> = {
    functionSignature: config.functionSignature,
    asyncFunctionSignature: config.asyncFunctionSignature,
  };

  const context: TransformContext<P, T> = {
    language: config.language,
    types: config.types,
    paramConfig,
    signatureConfig,
  };

  // Return transform function
  return (methods: RawMethod[]) => {
    return enhancers.reduce(
      (acc, enhancer) => enhancer(acc, context),
      methods as LanguageMethod<P, T>[]
    );
  };
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  ParamCollection,
  SignatureHelper,
  CrudNameRenderer,
  StubReturnRenderer,
  TypeDefRenderer,
  type ParamRenderConfig,
  type SignatureRenderConfig,
} from './language/template-helpers.js';

// Export LanguageType class (runtime value)
export { LanguageType } from './language/types.js';

export type {
  RawMethod,
  BaseParam,
  LanguageMethod,
  LanguageParam,
  TypeFactory,
} from './language/types.js';

// Re-export from crud-derivation for backwards compat during transition
export { deriveCrudMethodName } from '../../warp/crud-derivation.js';
