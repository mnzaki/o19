/**
 * Self-Declarer 🌀
 *
 * The loom declares itself.
 *
 * 🛑 SPECIAL FILE NOTICE 🛑
 *
 * This file is unique in the loom's architecture. Unlike all others that push
 * dependencies outward (weaver → heddles → reed), this file is PULLED INWARD
 * by its consumers. It sits at the top, but dependencies flow REVERSE:
 * reed/language.ts and treadle-kit/declarative.ts both import FROM here.
 *
 * More radically: THIS FILE DECLARES ITSELF. It uses its own API to define
 * its API. The self-declarer is declared by 'declare' in the 'declare' scope.
 *
 * The spiral contracts before it expands. This file is the contraction.
 */

// ============================================================================
// The Three Scope Registries
// ============================================================================

/**
 * The three scopes of reification in spire-loom:
 *
 * - 'declare': spire-loom itself (this file, never reset)
 * - 'warp': loom/{WARP,*}.ts adaptors (workspace session scope)
 * - 'weave': machinery/ adaptors (weaving run scope)
 */
export type Scope = 'declare' | 'warp' | 'weave';

const scopeRegistries: Record<Scope, Map<string, any>> = {
  declare: new Map(), // spire-loom core - lives forever
  warp: new Map(), // workspace session - reset on reload
  weave: new Map() // weaving run - reset per execution
};

/**
 * Get the registry for a scope.
 */
export function getScopeRegistry(scope: Scope): Map<string, any> {
  return scopeRegistries[scope];
}

/**
 * Reset a scope registry.
 *
 * - 'warp': Call when workspace reloads
 * - 'weave': Call before each weaving run
 */
export function resetScope(scope: Exclude<Scope, 'declare'>): void {
  scopeRegistries[scope].clear();
}

// ============================================================================
// Self-Declaration: The Ur-Pattern
// ============================================================================

/**
 * Configuration for declaring a declarative API.
 */
export interface DeclarerConfig<T, D> {
  /** Unique identifier for this declarative API */
  name: string;

  /** Scope: 'declare' | 'warp' | 'weave' */
  scope: Scope;

  /** Validation function - throws if definition invalid */
  validate?: (def: D) => void | Promise<void>;

  /** Transform definition to declaration surface (can be async) */
  declare: (def: D) => T | Promise<T>;
}

/**
 * A declared declarer function with metadata.
 */
export interface DeclarerFunction<T, D> {
  (def: D): T | Promise<T>;
  declared: Map<string, T>;
  config: DeclarerConfig<T, D>;
}

/**
 * The self-declarer interface.
 *
 * This is the type of the 'declare' constant that declares itself,
 * then declares everything else.
 */
export type SelfDeclarer = <T, D>(
  config: DeclarerConfig<T, D>
) => DeclarerFunction<T, D> | Promise<DeclarerFunction<T, D>>;

/**
 * Create a declarer function.
 *
 * Internal implementation - used by the self-declarer to create
 * declarer functions for all three scopes.
 * 
 * Supports both sync and async declare functions. For top-level exports
 * (like in warp/*.ts), use sync declare functions. For async operations,
 * the declare function can return a Promise.
 */
function createDeclarer<T, D>(config: DeclarerConfig<T, D>): DeclarerFunction<T, D> {
  const registry = scopeRegistries[config.scope];

  const declarationFn = (def: D): T | Promise<T> => {
    // Run validation if provided
    const validationResult = config.validate?.(def);
    
    // Handle async validation
    if (validationResult instanceof Promise) {
      return validationResult.then(() => {
        const result = config.declare(def);
        return handleDeclarationResult(result, def, registry, config.name);
      });
    }

    // Sync path
    const result = config.declare(def);
    return handleDeclarationResult(result, def, registry, config.name);
  };

  return Object.assign(declarationFn, {
    declared: registry,
    config
  });
}

/**
 * Handle the result of a declaration, sync or async.
 */
function handleDeclarationResult<T, D>(
  result: T | Promise<T>,
  def: D,
  registry: Map<string, any>,
  configName: string
): T | Promise<T> {
  const name = (def as any).name || (def as any).id || 'anonymous';
  const key = `${configName}:${name}`;

  if (result instanceof Promise) {
    return result.then((resolved) => {
      registry.set(key, resolved);
      return resolved;
    });
  }

  registry.set(key, result);
  return result;
}

// ============================================================================
// The Self-Declaration: declare declares itself
// ============================================================================

/**
 * The self-declarer declares ITSELF in the 'declare' scope.
 *
 * This is the moment of self-reference: we use the pattern to define
 * the pattern. declare.declare exists.
 *
 * The self-declarer:
 * 1. Is declared in 'declare' scope (lives forever)
 * 2. Creates declarer functions for all scopes
 * 3. Is used by 'warp' and 'weave' scope consumers
 */
const selfDeclare: SelfDeclarer = <T, D>(config: DeclarerConfig<T, D>) => {
  return createDeclarer(config);
};

/**
 * The 'declare' export - the self-declarer.
 *
 * Use this to declare declarative APIs in any scope.
 *
 * @example
 * ```typescript
 * // Declare a language ('warp' scope)
 * export const declareLanguage = declare<LanguageDefinition, LanguageDefinition>({
 *   name: 'language',
 *   scope: 'warp',
 *   validate: (def) => { if (!def.name) throw new Error('Need name'); },
 *   declare: (def) => def
 * });
 *
 * // Use it
 * export const rustLanguage = declareLanguage({
 *   name: 'rust',
 *   codeGen: { transform: ..., fileExtensions: ['.rs.ejs'] }
 * });
 * ```
 */
export const declare = selfDeclare;

// ============================================================================
// Scope: 'declare' - spire-loom itself
// ============================================================================

/**
 * The self-declarer declares itself explicitly.
 *
 * This enables: declare.declare (meta-circular)
 */
export const declareSelf = declare<SelfDeclarer, DeclarerConfig<any, any>>({
  name: 'declarer',
  scope: 'declare',
  declare: (config) => createDeclarer(config)
});

// ============================================================================
// Type Exports
// ============================================================================

export type { Scope, DeclarerConfig, DeclarerFunction, SelfDeclarer };
