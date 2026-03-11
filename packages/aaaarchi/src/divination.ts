/**
 * Divination 🌀
 * 
 * Async, multi-round computation with dependency-aware resolution.
 * 
 * A Divination wraps a computation that resolves over multiple rounds,
 * with each round potentially depending on previous rounds. The solver
 * discovers the optimal resolution order from the dependency graph.
 * 
 * Core concept: "Program as structure, execution as filling"
 * 
 * This is the foundation layer - generic and not tied to any specific
 * domain. Scrim-loom builds upon this for architectural validation.
 * 
 * @example
 * ```typescript
 * const divination = new Divination({
 *   shape: {
 *     deps: ['userId'],
 *     rounds: [
 *       { name: 'fetch', validate: async (ctx) => ({ valid: true, value: await fetchUser(ctx.get('userId')) }) }
 *     ],
 *     compute: (deps) => deps.fetch
 *   },
 *   tags: ['user-service']
 * });
 * 
 * const user = await divination.resolve();
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * A single round of divination resolution.
 */
export interface DivinationRound<T> {
  /** Round number (0 = initial state) */
  round: number;
  /** Values resolved so far */
  resolved: Map<string, unknown>;
  /** Whether all rounds are complete */
  complete: boolean;
  /** Current value (if any) */
  value?: T;
  /** Error message if round failed */
  error?: string;
}

/**
 * Context available during validation rounds.
 */
export interface ValidationContext {
  /** Access resolved values from previous rounds */
  get(path: string): unknown;
  /** Access all resolved values */
  getAll(): Record<string, unknown>;
}

/**
 * Result of a validation round.
 */
export interface ValidationResult<T = unknown> {
  /** Whether this round passed validation */
  valid: boolean;
  /** Optional error message if invalid */
  error?: string;
  /** Value produced by this round */
  value?: T;
}

/**
 * A validation round definition.
 */
export interface ValidationRound<T = unknown> {
  /** Name of this round (for tracking) */
  name: string;
  /** Dependencies required before this round can execute */
  deps?: string[];
  /** Validation function - async to support I/O */
  validate: (current: Partial<T>, ctx: ValidationContext) => Promise<ValidationResult<T>>;
}

/**
 * The shape/structure of a divination computation.
 */
export interface DivinationShape<T> {
  /** External dependencies (paths to other values) */
  deps: string[];
  /** Validation rounds - each round is a step in resolution */
  rounds: ValidationRound<T>[];
  /** Final computation given all resolved deps and rounds */
  compute?: (deps: Record<string, unknown>) => Promise<T> | T;
}

/**
 * Configuration for creating a Divination.
 */
export interface DivinationConfig<T> {
  /** The shape/structure of the result */
  shape: DivinationShape<T>;
  /** Optional tags for filtering/categorization */
  tags?: string[];
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

// ============================================================================
// Divination Class
// ============================================================================

let divinationIdCounter = 0;

/**
 * A promise-like container for multi-round async computation.
 * 
 * Unlike a Promise:
 * - Returns stub values immediately for template rendering
 * - Resolves over N discovered rounds (not just one)
 * - Provides progress watching via AsyncGenerator
 * - Dependencies are tracked and resolved automatically
 */
export class Divination<T = unknown> {
  readonly id: string;
  readonly tags: string[];
  readonly meta: Record<string, unknown>;
  
  private _shape: DivinationShape<T>;
  private _resolved = false;
  private _value?: T;
  private _currentRound = 0;
  private _resolvedValues = new Map<string, unknown>();
  private _errors: string[] = [];
  
  constructor(config: DivinationConfig<T>) {
    this.id = `divination_${++divinationIdCounter}_${Math.random().toString(36).slice(2, 7)}`;
    this.tags = config.tags || [];
    this.meta = config.meta || {};
    this._shape = config.shape;
  }
  
  // ===== Status =====
  
  /** Whether the divination has fully resolved */
  get resolved(): boolean {
    return this._resolved;
  }
  
  /** The final resolved value (throws if not resolved) */
  get value(): T {
    if (!this._resolved) {
      throw new Error(`Divination ${this.id} not resolved yet. Call resolve() first.`);
    }
    return this._value!;
  }
  
  /** Current round number (0 = not started) */
  get currentRound(): number {
    return this._currentRound;
  }
  
  /** Errors encountered during resolution */
  get errors(): string[] {
    return [...this._errors];
  }
  
  /** Whether any errors occurred */
  get hasErrors(): boolean {
    return this._errors.length > 0;
  }
  
  // ===== Resolution =====
  
  /**
   * Resolve the divination over multiple rounds.
   * Each round may depend on values from previous rounds.
   * 
   * @returns The final resolved value
   */
  async resolve(): Promise<T> {
    if (this._resolved) return this._value!;
    
    for await (const round of this.watch()) {
      if (round.complete) break;
    }
    
    return this._value!;
  }
  
  /**
   * Watch the resolution progress round by round.
   * 
   * Yields after each round, allowing progress tracking.
   * 
   * @example
   * ```typescript
   * for await (const round of divination.watch()) {
   *   console.log(`Round ${round.round}: ${round.resolved.size} values`);
   * }
   * ```
   */
  async *watch(): AsyncGenerator<DivinationRound<T>> {
    // Yield initial state
    yield {
      round: 0,
      resolved: new Map(this._resolvedValues),
      complete: false
    };
    
    // Execute each validation round
    for (let i = 0; i < this._shape.rounds.length; i++) {
      this._currentRound = i + 1;
      const roundDef = this._shape.rounds[i];
      
      // Check if dependencies are met
      if (roundDef.deps) {
        const missing = roundDef.deps.filter(d => !this._resolvedValues.has(d));
        if (missing.length > 0) {
          const error = `Round "${roundDef.name}" missing dependencies: ${missing.join(', ')}`;
          this._errors.push(error);
          
          yield {
            round: this._currentRound,
            resolved: new Map(this._resolvedValues),
            complete: false,
            error
          };
          
          continue;
        }
      }
      
      // Perform validation for this round
      const ctx: ValidationContext = {
        get: (path: string) => this._resolvedValues.get(path),
        getAll: () => Object.fromEntries(this._resolvedValues)
      };
      
      try {
        const result = await roundDef.validate(
          this._value || {},
          ctx
        );
        
        // Store error if any
        if (!result.valid && result.error) {
          this._errors.push(result.error);
        }
        
        // Store resolved value
        if (result.value !== undefined) {
          this._resolvedValues.set(roundDef.name, result.value);
          this._value = result.value as T;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this._errors.push(`Round "${roundDef.name}" threw: ${errorMsg}`);
      }
      
      yield {
        round: this._currentRound,
        resolved: new Map(this._resolvedValues),
        complete: false,
        value: this._value
      };
    }
    
    // Final computation if needed
    if (this._shape.compute && !this._value) {
      try {
        const depValues: Record<string, unknown> = {};
        for (const dep of this._shape.deps) {
          if (this._resolvedValues.has(dep)) {
            depValues[dep] = this._resolvedValues.get(dep);
          }
        }
        // Also include round results
        for (const [key, value] of this._resolvedValues) {
          if (!(key in depValues)) {
            depValues[key] = value;
          }
        }
        this._value = await this._shape.compute(depValues);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this._errors.push(`Final computation threw: ${errorMsg}`);
      }
    }
    
    this._resolved = true;
    
    // Yield final state
    yield {
      round: this._currentRound,
      resolved: new Map(this._resolvedValues),
      complete: true,
      value: this._value
    };
  }
  
  // ===== Utility =====
  
  /**
   * For filtering - returns value if resolved, undefined otherwise.
   */
  getFilterValue(): T | undefined {
    return this._resolved ? this._value : undefined;
  }
  
  /**
   * For template rendering - placeholder pattern.
   * Returns placeholder if not resolved, JSON string if resolved.
   */
  toString(): string {
    if (this._resolved) {
      try {
        return JSON.stringify(this._value);
      } catch {
        return '[object Object]';
      }
    }
    return `{{ ${this.id} }}`;
  }
  
  /**
   * Create a new divination with additional tags.
   */
  withTags(...tags: string[]): Divination<T> {
    return new Divination({
      shape: this._shape,
      tags: [...this.tags, ...tags],
      meta: this.meta
    });
  }
  
  /**
   * Create a new divination with additional metadata.
   */
  withMeta(meta: Record<string, unknown>): Divination<T> {
    return new Divination({
      shape: this._shape,
      tags: this.tags,
      meta: { ...this.meta, ...meta }
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new Divination.
 * 
 * @example
 * ```typescript
 * const divination = createDivination({
 *   shape: {
 *     deps: ['userId'],
 *     rounds: [
 *       { name: 'auth', validate: async (_, ctx) => ({ valid: true, value: await auth(ctx.get('userId')) }) }
 *     ],
 *     compute: (deps) => deps.auth
 *   }
 * });
 * ```
 */
export function createDivination<T>(config: DivinationConfig<T>): Divination<T> {
  return new Divination(config);
}

/**
 * Create a simple single-round divination.
 * 
 * @example
 * ```typescript
 * const divination = createSimpleDivination(async () => {
 *   return await fetchUser(userId);
 * });
 * ```
 */
export function createSimpleDivination<T>(
  compute: () => Promise<T> | T,
  options?: { tags?: string[]; meta?: Record<string, unknown> }
): Divination<T> {
  return new Divination<T>({
    shape: {
      deps: [],
      rounds: [
        {
          name: 'compute',
          validate: async () => {
            const value = await compute();
            return { valid: true, value };
          }
        }
      ]
    },
    tags: options?.tags,
    meta: options?.meta
  });
}

/**
 * Create a divination that depends on other divinations.
 * 
 * @example
 * ```typescript
 * const userDiv = createSimpleDivination(() => fetchUser(id));
 * const postsDiv = createDependentDivination(
 *   { user: userDiv },
 *   async (deps) => fetchPosts(deps.user.id)
 * );
 * ```
 */
export async function createDependentDivination<
  T,
  Deps extends Record<string, Divination<unknown>>
>(
  dependencies: Deps,
  compute: (values: { [K in keyof Deps]: Deps[K] extends Divination<infer V> ? V : never }) => Promise<T> | T,
  options?: { tags?: string[]; meta?: Record<string, unknown> }
): Promise<Divination<T>> {
  // Resolve all dependencies first
  type DepsType = { [K in keyof Deps]: Deps[K] extends Divination<infer V> ? V : never };
  const resolvedValues = {} as DepsType;
  
  for (const [key, div] of Object.entries(dependencies)) {
    resolvedValues[key as keyof Deps] = await div.resolve() as DepsType[keyof Deps];
  }
  
  // Create a resolved divination
  const value = await compute(resolvedValues);
  
  // Since everything is pre-resolved, create a simple single-round divination
  return new Divination<T>({
    shape: {
      deps: Object.keys(dependencies),
      rounds: [
        {
          name: 'resolve',
          validate: async () => ({ valid: true, value })
        }
      ],
      compute: () => value
    },
    tags: options?.tags,
    meta: { ...options?.meta, _precomputed: true, _resolvedDeps: resolvedValues }
  });
}
