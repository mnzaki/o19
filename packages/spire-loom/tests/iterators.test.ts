/**
 * Iterator Utilities Tests 🌀
 *
 * "Stream through the spiral, test every turn."
 */

import { describe, it, expect } from 'vitest';
import {
  map,
  filter,
  flat,
  flatMap,
  take,
  skip,
  zip,
  enumerate,
  chain,
  uniq,
  toArray,
  reduce,
  find,
  some,
  every,
  countItems,
  groupBy,
  partition,
  join,
  asyncMap,
  asyncFilter,
  asyncToArray
} from '../machinery/sley/iterators.js';

describe('Iterator Utilities', () => {
  describe('map', () => {
    it('should transform items lazily', () => {
      const doubled = map([1, 2, 3], (x) => x * 2);
      expect(toArray(doubled)).toEqual([2, 4, 6]);
    });

    it('should work with empty iterables', () => {
      const result = map([], (x: number) => x * 2);
      expect(toArray(result)).toEqual([]);
    });

    it('should be lazy - only evaluate when iterated', () => {
      let callCount = 0;
      const mapped = map([1, 2, 3], (x) => {
        callCount++;
        return x * 2;
      });
      expect(callCount).toBe(0); // Not evaluated yet

      // Consume first item
      const iter = mapped[Symbol.iterator]();
      iter.next();
      expect(callCount).toBe(1);
    });
  });

  describe('filter', () => {
    it('should select matching items', () => {
      const evens = filter([1, 2, 3, 4, 5, 6], (x) => x % 2 === 0);
      expect(toArray(evens)).toEqual([2, 4, 6]);
    });

    it('should return empty when no matches', () => {
      const result = filter([1, 3, 5], (x: number) => x % 2 === 0);
      expect(toArray(result)).toEqual([]);
    });
  });

  describe('flat', () => {
    it('should flatten nested arrays', () => {
      const nested = [[1, 2], [3, 4], [5, 6]];
      const flattened = flat(nested);
      expect(toArray(flattened)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty inner arrays', () => {
      const nested = [[1, 2], [], [3]];
      expect(toArray(flat(nested))).toEqual([1, 2, 3]);
    });
  });

  describe('flatMap', () => {
    it('should map then flatten', () => {
      const words = ['hello', 'world'];
      const chars = flatMap(words, (w) => w.split(''));
      expect(toArray(chars)).toEqual(['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
    });

    it('should handle empty results', () => {
      const result = flatMap([1, 2, 3], () => []);
      expect(toArray(result)).toEqual([]);
    });
  });

  describe('take', () => {
    it('should take first n items', () => {
      const first3 = take([1, 2, 3, 4, 5], 3);
      expect(toArray(first3)).toEqual([1, 2, 3]);
    });

    it('should handle taking more than available', () => {
      const result = take([1, 2], 5);
      expect(toArray(result)).toEqual([1, 2]);
    });

    it('should handle zero', () => {
      const result = take([1, 2, 3], 0);
      expect(toArray(result)).toEqual([]);
    });
  });

  describe('skip', () => {
    it('should skip first n items', () => {
      const rest = skip([1, 2, 3, 4, 5], 2);
      expect(toArray(rest)).toEqual([3, 4, 5]);
    });

    it('should handle skipping more than available', () => {
      const result = skip([1, 2], 5);
      expect(toArray(result)).toEqual([]);
    });
  });

  describe('zip', () => {
    it('should pair items from two iterables', () => {
      const zipped = zip(['a', 'b', 'c'], [1, 2, 3]);
      expect(toArray(zipped)).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3]
      ]);
    });

    it('should stop at shorter iterable', () => {
      const zipped = zip(['a', 'b'], [1, 2, 3, 4]);
      expect(toArray(zipped)).toEqual([
        ['a', 1],
        ['b', 2]
      ]);
    });
  });

  describe('enumerate', () => {
    it('should add indices starting from 0', () => {
      const enumerated = enumerate(['a', 'b', 'c']);
      expect(toArray(enumerated)).toEqual([
        [0, 'a'],
        [1, 'b'],
        [2, 'c']
      ]);
    });

    it('should respect start parameter', () => {
      const enumerated = enumerate(['a', 'b'], 10);
      expect(toArray(enumerated)).toEqual([
        [10, 'a'],
        [11, 'b']
      ]);
    });
  });

  describe('chain', () => {
    it('should concatenate iterables', () => {
      const chained = chain([1, 2], [3, 4], [5, 6]);
      expect(toArray(chained)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty iterables', () => {
      const chained = chain([], [1, 2], []);
      expect(toArray(chained)).toEqual([1, 2]);
    });
  });

  describe('uniq', () => {
    it('should remove duplicate primitives', () => {
      const unique = uniq([1, 2, 2, 3, 3, 3]);
      expect(toArray(unique)).toEqual([1, 2, 3]);
    });

    it('should support key function', () => {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 1, name: 'Alice Duplicate' }
      ];
      const uniqueById = uniq(users, (u) => u.id);
      expect(toArray(uniqueById)).toEqual([users[0], users[1]]);
    });

    it('should preserve first occurrence order', () => {
      const unique = uniq([3, 1, 2, 1, 3]);
      expect(toArray(unique)).toEqual([3, 1, 2]);
    });
  });

  describe('toArray', () => {
    it('should convert iterable to array', () => {
      const result = toArray(map([1, 2, 3], (x) => x * 2));
      expect(result).toEqual([2, 4, 6]);
    });

    it('should handle empty iterables', () => {
      expect(toArray([])).toEqual([]);
    });
  });

  describe('reduce', () => {
    it('should accumulate values', () => {
      const sum = reduce([1, 2, 3, 4], (acc, x) => acc + x, 0);
      expect(sum).toBe(10);
    });

    it('should work with initial value', () => {
      const product = reduce([2, 3, 4], (acc, x) => acc * x, 1);
      expect(product).toBe(24);
    });

    it('should handle empty iterables', () => {
      const result = reduce([], (acc: number, x: number) => acc + x, 42);
      expect(result).toBe(42);
    });
  });

  describe('find', () => {
    it('should return first match', () => {
      const found = find([1, 2, 3, 4], (x) => x > 2);
      expect(found).toBe(3);
    });

    it('should return undefined when not found', () => {
      const found = find([1, 2, 3], (x: number) => x > 10);
      expect(found).toBeUndefined();
    });

    it('should short-circuit', () => {
      let callCount = 0;
      const arr = [1, 2, 3, 4, 5];
      find(arr, (x) => {
        callCount++;
        return x === 3;
      });
      expect(callCount).toBe(3); // Stops at first match
    });
  });

  describe('some', () => {
    it('should return true if any match', () => {
      const hasEven = some([1, 3, 4, 5], (x) => x % 2 === 0);
      expect(hasEven).toBe(true);
    });

    it('should return false if no match', () => {
      const hasEven = some([1, 3, 5], (x: number) => x % 2 === 0);
      expect(hasEven).toBe(false);
    });

    it('should short-circuit', () => {
      let callCount = 0;
      some([2, 4, 6, 8], (x) => {
        callCount++;
        return x % 2 === 0;
      });
      expect(callCount).toBe(1); // Stops at first match
    });
  });

  describe('every', () => {
    it('should return true if all match', () => {
      const allEven = every([2, 4, 6], (x) => x % 2 === 0);
      expect(allEven).toBe(true);
    });

    it('should return false if any mismatch', () => {
      const allEven = every([2, 4, 5], (x: number) => x % 2 === 0);
      expect(allEven).toBe(false);
    });

    it('should short-circuit', () => {
      let callCount = 0;
      every([1, 2, 3, 4], (x) => {
        callCount++;
        return x % 2 === 0;
      });
      expect(callCount).toBe(1); // Stops at first mismatch
    });
  });

  describe('countItems', () => {
    it('should count items', () => {
      const count = countItems([1, 2, 3, 4, 5]);
      expect(count).toBe(5);
    });

    it('should work with filtered iterables', () => {
      const count = countItems(filter([1, 2, 3, 4], (x: number) => x > 2));
      expect(count).toBe(2);
    });

    it('should handle empty iterables', () => {
      expect(countItems([])).toBe(0);
    });
  });

  describe('groupBy', () => {
    it('should group by key function', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 }
      ];
      const grouped = groupBy(items, (item) => item.type);

      expect(grouped.get('a')).toEqual([items[0], items[2]]);
      expect(grouped.get('b')).toEqual([items[1]]);
    });

    it('should handle empty iterables', () => {
      const grouped = groupBy([], (x: number) => x);
      expect(grouped.size).toBe(0);
    });
  });

  describe('partition', () => {
    it('should split into two groups', () => {
      const [evens, odds] = partition([1, 2, 3, 4], (x) => x % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3]);
    });

    it('should handle all pass', () => {
      const [pass, fail] = partition([2, 4, 6], (x: number) => x % 2 === 0);
      expect(pass).toEqual([2, 4, 6]);
      expect(fail).toEqual([]);
    });
  });

  describe('join', () => {
    it('should join with separator', () => {
      const result = join(['a', 'b', 'c'], '-');
      expect(result).toBe('a-b-c');
    });

    it('should use comma by default', () => {
      const result = join([1, 2, 3]);
      expect(result).toBe('1,2,3');
    });

    it('should handle custom toString', () => {
      const users = [{ name: 'Alice' }, { name: 'Bob' }];
      const result = join(users, ', ', (u) => u.name);
      expect(result).toBe('Alice, Bob');
    });
  });

  describe('chaining operations', () => {
    it('should support complex chains', () => {
      const result = toArray(
        take(
          map(
            filter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (x: number) => x % 2 === 0),
            (x) => x * x
          ),
          3
        )
      );
      // Even numbers: 2, 4, 6, 8, 10
      // Squared: 4, 16, 36, 64, 100
      // Take 3: 4, 16, 36
      expect(result).toEqual([4, 16, 36]);
    });
  });

  describe('async iterators', () => {
    describe('asyncMap', () => {
      it('should map over async functions', async () => {
        const doubled = asyncMap([1, 2, 3], async (x) => x * 2);
        expect(await asyncToArray(doubled)).toEqual([2, 4, 6]);
      });
    });

    describe('asyncFilter', () => {
      it('should filter with async predicate', async () => {
        const evens = asyncFilter([1, 2, 3, 4], async (x) => x % 2 === 0);
        expect(await asyncToArray(evens)).toEqual([2, 4]);
      });
    });

    describe('asyncToArray', () => {
      it('should collect async iterable', async () => {
        async function* gen() {
          yield 1;
          yield 2;
          yield 3;
        }
        expect(await asyncToArray(gen())).toEqual([1, 2, 3]);
      });
    });
  });
});
