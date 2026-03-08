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
export interface DeclarerConfig<D, T> {
  /** Unique identifier for this declarative API */
  name: string;

  /** Scope: 'declare' | 'warp' | 'weave' */
  scope: Scope;

  /** Validation function - throws if definition invalid */
  validate?: (def: D) => void;

  /** Transform definition to declaration surface */
  declare: (def: D) => T;
}

/**
 * A declared declarer function with metadata.
 */
export interface DeclarerFunction<D, T> {
  (def: D): T;
  declared: Map<string, T>;
  config: DeclarerConfig<D, T>;
}

/**
 * The self-declarer interface.
 *
 * This is the type of the 'declare' constant that declares itself,
 * then declares everything else.
 */
export type SelfDeclarer = <D, T>(config: DeclarerConfig<D, T>) => DeclarerFunction<D, T>;

/**
 * Create a declarer function.
 *
 * Internal implementation - used by the self-declarer to create
 * declarer functions for all three scopes.
 *
 * Supports both sync and async declare functions. For top-level exports
 * (like in warp/*.ts), use sync declare functions. For async operations,
 */
function createDeclarer<D, T>(config: DeclarerConfig<D, T>): DeclarerFunction<D, T> {
  const registry = scopeRegistries[config.scope];

  const declarationFn = (def: D): T => {
    // Run validation if provided
    config.validate?.(def);

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
function handleDeclarationResult<D, T>(
  result: T,
  def: D,
  registry: Map<string, any>,
  configName: string
): T {
  const name = (def as any).name || (def as any).id || 'anonymous';
  const key = `${configName}:${name}`;

  registry.set(key, result);
  return result;
}

export const declare = createDeclarer;
