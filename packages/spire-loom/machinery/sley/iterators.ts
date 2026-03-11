/**
 * Iterator Utilities 🌀
 *
 * Lazy iterator utilities for BoundQuery and Iterable chains.
 *
 * "Stream through the spiral, don't materialize the whole."
 *
 * Provides functional-style operations on any Iterable:
 * - map: Transform items lazily
 * - filter: Select items lazily
 * - flat: Flatten nested iterables
 * - reduce: Accumulate to single value
 * - toArray: Materialize when needed
 *
 * All operations are lazy (return Generators) except terminal
 * operations like reduce and toArray.
 *
 * @example
 * ```typescript
 * const query = createQueryAPI(methods, 'methods');
 *
 * // Lazy chain - no materialization until iteration
 * const names = map(
 *   filter(query, m => m.crudOperation === 'create'),
 *   m => m.name.pascalCase
 * );
 *
 * // Terminal operation - materializes result
 * const nameArray = toArray(names);
 * ```
 */

// ============================================================================
// Lazy Transformations (return Generators)
// ============================================================================

/**
 * Lazily map over an iterable.
 *
 * @example
 * ```typescript
 * const doubled = map([1, 2, 3], x => x * 2);
 * // Yields: 2, 4, 6 (one at a time)
 * ```
 */
export function* map<T, U>(iterable: Iterable<T>, fn: (item: T) => U): Generator<U> {
  for (const item of iterable) {
    yield fn(item);
  }
}

/**
 * Lazily filter an iterable.
 *
 * @example
 * ```typescript
 * const evens = filter([1, 2, 3, 4], x => x % 2 === 0);
 * // Yields: 2, 4 (one at a time)
 * ```
 */
export function* filter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): Generator<T> {
  for (const item of iterable) {
    if (predicate(item)) {
      yield item;
    }
  }
}

/**
 * Lazily flatten nested iterables.
 *
 * @example
 * ```typescript
 * const nested = [[1, 2], [3, 4]];
 * const flat = flatMap(nested);
 * // Yields: 1, 2, 3, 4 (one at a time)
 * ```
 */
export function* flat<T>(iterable: Iterable<Iterable<T>>): Generator<T> {
  for (const inner of iterable) {
    for (const item of inner) {
      yield item;
    }
  }
}

/**
 * Lazily map then flatten (flatMap).
 *
 * @example
 * ```typescript
 * const words = ['hello', 'world'];
 * const chars = flatMap(words, w => w.split(''));
 * // Yields: 'h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd'
 * ```
 */
export function* flatMap<T, U>(
  iterable: Iterable<T>,
  fn: (item: T) => Iterable<U>
): Generator<U> {
  for (const item of iterable) {
    yield* fn(item);
  }
}

/**
 * Take first n items lazily.
 *
 * @example
 * ```typescript
 * const first3 = take([1, 2, 3, 4, 5], 3);
 * // Yields: 1, 2, 3
 * ```
 */
export function* take<T>(iterable: Iterable<T>, n: number): Generator<T> {
  let i = 0;
  for (const item of iterable) {
    if (i >= n) break;
    yield item;
    i++;
  }
}

/**
 * Skip first n items lazily.
 *
 * @example
 * ```typescript
 * const rest = skip([1, 2, 3, 4, 5], 2);
 * // Yields: 3, 4, 5
 * ```
 */
export function* skip<T>(iterable: Iterable<T>, n: number): Generator<T> {
  let i = 0;
  for (const item of iterable) {
    if (i < n) {
      i++;
      continue;
    }
    yield item;
  }
}

/**
 * Zip two iterables together lazily.
 *
 * Stops when either iterable is exhausted.
 *
 * @example
 * ```typescript
 * const zipped = zip(['a', 'b', 'c'], [1, 2, 3]);
 * // Yields: ['a', 1], ['b', 2], ['c', 3]
 * ```
 */
export function* zip<T, U>(
  iterableA: Iterable<T>,
  iterableB: Iterable<U>
): Generator<[T, U]> {
  const iterA = iterableA[Symbol.iterator]();
  const iterB = iterableB[Symbol.iterator]();

  while (true) {
    const resultA = iterA.next();
    const resultB = iterB.next();

    if (resultA.done || resultB.done) break;

    yield [resultA.value, resultB.value];
  }
}

/**
 * Enumerate items with index lazily.
 *
 * @example
 * ```typescript
 * const enumerated = enumerate(['a', 'b', 'c']);
 * // Yields: [0, 'a'], [1, 'b'], [2, 'c']
 * ```
 */
export function* enumerate<T>(
  iterable: Iterable<T>,
  start = 0
): Generator<[number, T]> {
  let i = start;
  for (const item of iterable) {
    yield [i++, item];
  }
}

/**
 * Chain multiple iterables sequentially.
 *
 * @example
 * ```typescript
 * const chained = chain([1, 2], [3, 4], [5, 6]);
 * // Yields: 1, 2, 3, 4, 5, 6
 * ```
 */
export function* chain<T>(...iterables: Iterable<T>[]): Generator<T> {
  for (const iterable of iterables) {
    yield* iterable;
  }
}

/**
 * Return unique items (by value or key function).
 *
 * @example
 * ```typescript
 * const unique = uniq([1, 2, 2, 3, 3, 3]);
 * // Yields: 1, 2, 3
 *
 * const uniqueByName = uniq(users, u => u.name);
 * // Yields users with unique names
 * ```
 */
export function* uniq<T>(iterable: Iterable<T>): Generator<T>;
export function* uniq<T, K>(iterable: Iterable<T>, keyFn: (item: T) => K): Generator<T>;
export function* uniq<T, K>(
  iterable: Iterable<T>,
  keyFn?: (item: T) => K
): Generator<T> {
  const seen = new Set<K | T>();

  for (const item of iterable) {
    const key = keyFn ? keyFn(item) : item;
    if (!seen.has(key)) {
      seen.add(key);
      yield item;
    }
  }
}

// ============================================================================
// Terminal Operations (materialize results)
// ============================================================================

/**
 * Materialize iterable to array.
 *
 * This is a terminal operation that eagerly consumes the iterable.
 *
 * @example
 * ```typescript
 * const lazy = map([1, 2, 3], x => x * 2);
 * const array = toArray(lazy); // [2, 4, 6]
 * ```
 */
export function toArray<T>(iterable: Iterable<T>): T[] {
  return Array.from(iterable);
}

/**
 * Reduce iterable to single value.
 *
 * This is a terminal operation that eagerly consumes the iterable.
 *
 * @example
 * ```typescript
 * const sum = reduce([1, 2, 3, 4], (acc, x) => acc + x, 0);
 * // Returns: 10
 * ```
 */
export function reduce<T, U>(
  iterable: Iterable<T>,
  fn: (accumulator: U, item: T) => U,
  initial: U
): U {
  let acc = initial;
  for (const item of iterable) {
    acc = fn(acc, item);
  }
  return acc;
}

/**
 * Find first item matching predicate.
 *
 * Short-circuits on first match.
 *
 * @example
 * ```typescript
 * const found = find([1, 2, 3, 4], x => x > 2);
 * // Returns: 3
 * ```
 */
export function find<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): T | undefined {
  for (const item of iterable) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}

/**
 * Check if any item matches predicate.
 *
 * Short-circuits on first match.
 *
 * @example
 * ```typescript
 * const hasEven = some([1, 3, 4, 5], x => x % 2 === 0);
 * // Returns: true
 * ```
 */
export function some<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): boolean {
  for (const item of iterable) {
    if (predicate(item)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if all items match predicate.
 *
 * Short-circuits on first non-match.
 *
 * @example
 * ```typescript
 * const allEven = every([2, 4, 6], x => x % 2 === 0);
 * // Returns: true
 * ```
 */
export function every<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): boolean {
  for (const item of iterable) {
    if (!predicate(item)) {
      return false;
    }
  }
  return true;
}

/**
 * Count items in iterable.
 *
 * @example
 * ```typescript
 * const count = countItems(filter([1, 2, 3, 4], x => x > 2));
 * // Returns: 2
 * ```
 */
export function countItems<T>(iterable: Iterable<T>): number {
  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of iterable) {
    count++;
  }
  return count;
}

/**
 * Group items by key function.
 *
 * @example
 * ```typescript
 * const byCrud = groupBy(methods, m => m.crudOperation);
 * // Returns: Map { 'create' => [...], 'read' => [...], ... }
 * ```
 */
export function groupBy<T, K>(
  iterable: Iterable<T>,
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of iterable) {
    const key = keyFn(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

/**
 * Partition items into two groups by predicate.
 *
 * @example
 * ```typescript
 * const [evens, odds] = partition([1, 2, 3, 4], x => x % 2 === 0);
 * // evens: [2, 4], odds: [1, 3]
 * ```
 */
export function partition<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => boolean
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];

  for (const item of iterable) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }

  return [pass, fail];
}

/**
 * Join items into string with separator.
 *
 * @example
 * ```typescript
 * const names = join(map(users, u => u.name), ', ');
 * // Returns: "Alice, Bob, Carol"
 * ```
 */
export function join<T>(
  iterable: Iterable<T>,
  separator = ',',
  toString: (item: T) => string = String
): string {
  const parts: string[] = [];
  for (const item of iterable) {
    parts.push(toString(item));
  }
  return parts.join(separator);
}

// ============================================================================
// Async Variants
// ============================================================================

/**
 * Async map over iterable.
 *
 * @example
 * ```typescript
 * const results = await asyncMap(ids, async id => fetchUser(id));
 * ```
 */
export async function* asyncMap<T, U>(
  iterable: Iterable<T>,
  fn: (item: T) => Promise<U>
): AsyncGenerator<U> {
  for (const item of iterable) {
    yield await fn(item);
  }
}

/**
 * Async filter over iterable.
 *
 * @example
 * ```typescript
 * const validUsers = asyncFilter(users, async u => await checkAuth(u));
 * ```
 */
export async function* asyncFilter<T>(
  iterable: Iterable<T>,
  predicate: (item: T) => Promise<boolean>
): AsyncGenerator<T> {
  for (const item of iterable) {
    if (await predicate(item)) {
      yield item;
    }
  }
}

/**
 * Materialize async iterable to array.
 *
 * @example
 * ```typescript
 * const results = await asyncToArray(asyncGenerator());
 * ```
 */
export async function asyncToArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}
