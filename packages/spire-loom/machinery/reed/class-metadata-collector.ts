/**
 * Class Metadata Collector 🔍
 *
 * Generic pattern for collecting metadata from class instances.
 *
 * "The collector walks the spiral, gathering what blooms."
 *
 * This provides a reusable foundation for extracting metadata from any
 * class that uses the "instance property assignment" pattern (like
 * RustStruct fields, Entity fields, etc.).
 *
 * Architecture:
 * ```
 * Instantiate Class → Inspect Properties → Extract Metadata
 *        ↓                    ↓                  ↓
 *   new EntityClass()    for..of props       predicate()
 *                             ↓                  ↓
 *                        check instanceof    extractor()
 * ```
 */

/**
 * A function that determines if a property value should be collected.
 */
export type PredicateFn = (value: unknown, propName: string) => boolean;

/**
 * A function that extracts metadata from a matching property.
 */
export type ExtractorFn<T> = (value: unknown, propName: string) => T;

/**
 * Configuration for a class metadata collector.
 */
export interface CollectorConfig<T> {
  /** Predicate to determine if a property should be collected */
  predicate: PredicateFn;
  /** Extractor to convert the property value to metadata */
  extractor: ExtractorFn<T>;
}

/**
 * A collector that can extract metadata from class instances.
 */
export interface ClassMetadataCollector<T> {
  /**
   * Instantiate the class and collect metadata from its properties.
   *
   * @param Class - The class to instantiate and inspect
   * @returns Array of extracted metadata
   */
  collect(Class: new (...args: any[]) => any): T[];
}

/**
 * Create a metadata collector for a specific pattern.
 *
 * Usage:
 * ```typescript
 * const collectEntityFields = createCollector({
 *   predicate: (value) => value instanceof Field,
 *   extractor: (value, prop) => {
 *     (value as Field).name = prop;
 *     return extractFieldMetadata(value);
 *   }
 * });
 *
 * const fields = collectEntityFields.collect(Bookmark);
 * ```
 *
 * @param config - Collector configuration
 * @returns A collector instance
 */
export function createCollector<T>(config: CollectorConfig<T>): ClassMetadataCollector<T> {
  return {
    collect(Class): T[] {
      // Instantiate to trigger property initializers
      const instance = new Class();
      const results: T[] = [];

      // Inspect all own properties (includes inherited via prototype chain)
      for (const prop of Object.getOwnPropertyNames(instance)) {
        const value = (instance as Record<string, unknown>)[prop];

        if (config.predicate(value, prop)) {
          results.push(config.extractor(value, prop));
        }
      }

      return results;
    }
  };
}

/**
 * Create a collector that also walks the prototype chain.
 *
 * Use this when metadata might be defined in parent classes.
 *
 * @param config - Collector configuration
 * @returns A collector that walks the inheritance chain
 */
export function createDeepCollector<T>(config: CollectorConfig<T>): ClassMetadataCollector<T> {
  return {
    collect(Class): T[] {
      const results: T[] = [];
      const seen = new Set<string>(); // Track property names to avoid duplicates

      // Walk the prototype chain
      let currentClass: new (...args: any[]) => any | null = Class;

      while (currentClass && currentClass !== Object.prototype) {
        try {
          const instance = new currentClass();

          for (const prop of Object.getOwnPropertyNames(instance)) {
            // Skip if already collected from a subclass
            if (seen.has(prop)) continue;
            seen.add(prop);

            const value = (instance as Record<string, unknown>)[prop];

            if (config.predicate(value, prop)) {
              results.push(config.extractor(value, prop));
            }
          }
        } catch {
          // Some classes can't be instantiated without arguments
          // In that case, we skip this level of the chain
        }

        // Move up the prototype chain
        currentClass = Object.getPrototypeOf(currentClass)?.constructor;
      }

      return results;
    }
  };
}

/**
 * Utility: Create a simple predicate that checks instanceof.
 *
 * @param Class - The class to check against
 * @returns A predicate function
 */
export function isInstanceOf<T>(Class: new (...args: any[]) => T): PredicateFn {
  return (value): value is T => value instanceof Class;
}

/**
 * Utility: Create an extractor that just returns the value with name set.
 *
 * @returns An extractor that sets .name and returns the value
 */
export function withName<T extends { name: string }>(): ExtractorFn<T> {
  return (value, prop) => {
    (value as T).name = prop;
    return value as T;
  };
}
