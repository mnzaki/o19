/**
 * Divination Provider 🌀
 * 
 * Manages multiple Divinations and resolves them optimally.
 * 
 * Discovers the optimal resolution order based on dependencies,
 * then executes rounds across all divinations in parallel where possible.
 * 
 * This is the foundation layer - works with any Divination<T>,
 * not tied to scrim-loom specifics.
 */

import { Divination, type DivinationRound } from './divination.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A batch of divination resolutions at a specific round.
 */
export interface ResolutionBatch {
  /** Round number */
  round: number;
  /** Divinations that have been fully resolved */
  resolved: Divination<unknown>[];
  /** Divinations still pending */
  pending: Divination<unknown>[];
  /** Errors by divination ID */
  errors: Map<string, Error>;
}

/**
 * Configuration for the DivinationProvider.
 */
export interface ProviderConfig {
  /** Maximum rounds before giving up */
  maxRounds?: number;
  /** Whether to continue on individual divination errors */
  continueOnError?: boolean;
  /** Callback for round completion */
  onRoundComplete?: (batch: ResolutionBatch) => void;
  /** Callback for resolution progress */
  onProgress?: (batch: ResolutionBatch) => void;
}

/**
 * Result of resolving all divinations.
 */
export interface ResolutionResult<T> {
  /** Resolved values (in same order as input) */
  values: (T | undefined)[];
  /** Number of rounds taken */
  rounds: number;
  /** Errors by divination ID */
  errors: Map<string, Error>;
  /** Whether all succeeded */
  allSucceeded: boolean;
}

// ============================================================================
// Divination Provider
// ============================================================================

/**
 * Manages batch resolution of multiple Divinations.
 * 
 * Discovers optimal resolution order based on dependencies,
 * executes independent divinations in parallel.
 * 
 * @example
 * ```typescript
 * const provider = new DivinationProvider({ maxRounds: 10 });
 * 
 * for await (const batch of provider.resolveAll([div1, div2, div3])) {
 *   console.log(`Round ${batch.round}: ${batch.resolved.length} done`);
 * }
 * ```
 */
export class DivinationProvider {
  private config: Required<ProviderConfig>;
  
  constructor(config: ProviderConfig = {}) {
    this.config = {
      maxRounds: config.maxRounds ?? 10,
      continueOnError: config.continueOnError ?? false,
      onRoundComplete: config.onRoundComplete ?? (() => {}),
      onProgress: config.onProgress ?? (() => {})
    };
  }
  
  /**
   * Resolve all divinations, yielding progress after each round.
   * 
   * Discovers optimal resolution order based on dependencies,
   * executes independent divinations in parallel.
   * 
   * @param divinations - Array of divinations to resolve
   * @yields ResolutionBatch after each round
   */
  async *resolveAll(
    divinations: Divination<unknown>[]
  ): AsyncGenerator<ResolutionBatch> {
    const pending = new Set(divinations);
    const resolved = new Map<string, Divination<unknown>>();
    const errors = new Map<string, Error>();
    let round = 0;
    
    while (pending.size > 0 && round < this.config.maxRounds) {
      round++;
      
      // Find divinations that can resolve this round
      // (those with no unresolved dependencies)
      const ready = Array.from(pending).filter(d => 
        this.canResolve(d, resolved)
      );
      
      if (ready.length === 0) {
        const pendingIds = Array.from(pending).map(d => d.id);
        throw new Error(
          `Resolution deadlock at round ${round}. ` +
          `${pending.size} divinations pending with unresolved dependencies: ` +
          pendingIds.join(', ')
        );
      }
      
      // Resolve all ready divinations in parallel
      const results = await Promise.allSettled(
        ready.map(d => d.resolve())
      );
      
      // Process results
      results.forEach((result, index) => {
        const divination = ready[index];
        
        if (result.status === 'fulfilled') {
          pending.delete(divination);
          resolved.set(divination.id, divination);
        } else {
          const error = result.reason instanceof Error 
            ? result.reason 
            : new Error(String(result.reason));
          errors.set(divination.id, error);
          
          if (!this.config.continueOnError) {
            throw new Error(
              `Divination ${divination.id} failed: ${error.message}`
            );
          }
          
          // Remove from pending so we don't retry
          pending.delete(divination);
        }
      });
      
      const batch: ResolutionBatch = {
        round,
        resolved: Array.from(resolved.values()),
        pending: Array.from(pending),
        errors: new Map(errors)
      };
      
      this.config.onRoundComplete(batch);
      this.config.onProgress(batch);
      yield batch;
    }
    
    if (pending.size > 0) {
      const pendingIds = Array.from(pending).map(d => d.id);
      throw new Error(
        `Max rounds (${this.config.maxRounds}) reached. ` +
        `${pending.size} divinations still pending: ${pendingIds.join(', ')}`
      );
    }
  }
  
  /**
   * Resolve all divinations and return final values.
   * 
   * @param divinations - Array of divinations to resolve
   * @returns ResolutionResult with values and metadata
   */
  async resolveAllToValues<T>(
    divinations: Divination<T>[]
  ): Promise<ResolutionResult<T>> {
    const values: (T | undefined)[] = new Array(divinations.length);
    let finalRound = 0;
    let finalErrors = new Map<string, Error>();
    const resolvedIndices = new Map<string, number>();
    
    // Track original indices
    divinations.forEach((div, idx) => {
      resolvedIndices.set(div.id, idx);
    });
    
    for await (const batch of this.resolveAll(divinations as Divination<unknown>[])) {
      finalRound = batch.round;
      finalErrors = batch.errors;
      
      // Collect resolved values in original order
      for (const div of batch.resolved) {
        const idx = resolvedIndices.get(div.id);
        if (idx !== undefined && div.resolved) {
          try {
            values[idx] = div.value as T;
          } catch {
            // Divination resolved but has no value
            values[idx] = undefined;
          }
        }
      }
    }
    
    return { 
      values, 
      rounds: finalRound, 
      errors: finalErrors,
      allSucceeded: finalErrors.size === 0
    };
  }
  
  /**
   * Resolve divinations and return the first successful result.
   * Useful for "race" scenarios.
   * 
   * @param divinations - Array of divinations to race
   * @returns First successful result
   */
  async race<T>(divinations: Divination<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
      let completed = 0;
      const errors: Error[] = [];
      
      for (const div of divinations) {
        div.resolve()
          .then(value => {
            resolve(value);
          })
          .catch(error => {
            errors.push(error instanceof Error ? error : new Error(String(error)));
            completed++;
            if (completed === divinations.length) {
              reject(new Error(
                `All ${divinations.length} divinations failed:\n` +
                errors.map(e => `  - ${e.message}`).join('\n')
              ));
            }
          });
      }
    });
  }
  
  /**
   * Check if a divination can be resolved given current resolved set.
   * 
   * For now, all divinations are considered independent.
   * Subclasses can override for dependency checking.
   */
  private canResolve(
    divination: Divination<unknown>,
    resolved: Map<string, Divination<unknown>>
  ): boolean {
    // All divinations are independent in the base implementation
    return !divination.resolved;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new DivinationProvider.
 * 
 * @example
 * ```typescript
 * const provider = createDivinationProvider({ maxRounds: 5 });
 * const result = await provider.resolveAllToValues([div1, div2]);
 * ```
 */
export function createDivinationProvider(
  config?: ProviderConfig
): DivinationProvider {
  return new DivinationProvider(config);
}

/**
 * Resolve multiple divinations in parallel.
 * Convenience function that creates a provider and resolves.
 * 
 * @example
 * ```typescript
 * const { values, rounds } = await resolveDivinations([div1, div2, div3]);
 * ```
 */
export async function resolveDivinations<T>(
  divinations: Divination<T>[],
  config?: ProviderConfig
): Promise<ResolutionResult<T>> {
  const provider = new DivinationProvider(config);
  return provider.resolveAllToValues(divinations);
}

/**
 * Race multiple divinations and return the first result.
 * Convenience function for racing scenarios.
 * 
 * @example
 * ```typescript
 * const fastest = await raceDivinations([cacheDiv, networkDiv]);
 * ```
 */
export async function raceDivinations<T>(
  divinations: Divination<T>[]
): Promise<T> {
  const provider = new DivinationProvider();
  return provider.race(divinations);
}
