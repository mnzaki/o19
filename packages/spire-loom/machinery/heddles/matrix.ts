/**
 * Heddles Generator Matrix
 *
 * The matrix defines what to generate based on spiral type transitions.
 */

import type { GeneratorFunction } from './types.js';

/**
 * The Generator Matrix: [CurrentType, PreviousType] → Generator
 *
 * This matrix defines what to generate based on the transition
 * from one ring type to another.
 */
export class GeneratorMatrix extends Map<string, GeneratorFunction> {
  /**
   * Set a generator for a type pair.
   *
   * @param currentType - The outer ring type (e.g., 'RustAndroidSpiraler')
   * @param previousType - The inner ring type (e.g., 'RustCore')
   * @param generator - The generator function
   */
  setPair(currentType: string, previousType: string, generator: GeneratorFunction): this {
    const key = `${currentType}→${previousType}`;
    return this.set(key, generator);
  }

  /**
   * Get a generator for a type pair.
   */
  getPair(currentType: string, previousType: string): GeneratorFunction | undefined {
    const key = `${currentType}→${previousType}`;
    return this.get(key);
  }
}

/**
 * The default generator matrix.
 *
 * Entries are added as we implement generators.
 */
export const DEFAULT_MATRIX = new GeneratorMatrix();

// Example entries (to be implemented):
// DEFAULT_MATRIX.setPair('RustAndroidSpiraler', 'RustCore', generateAndroidBridge);
// DEFAULT_MATRIX.setPair('TauriSpiraler', 'RustAndroidSpiraler', generateTauriAndroid);
// DEFAULT_MATRIX.setPair('TauriSpiraler', 'RustCore', generateTauriDesktop);
// DEFAULT_MATRIX.setPair('DDDTypescriptSpiraler', 'TauriSpiraler', generateDDDLayers);
