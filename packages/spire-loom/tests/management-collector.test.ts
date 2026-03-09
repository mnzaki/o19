/**
 * Management Collector Tests
 *
 * Tests for the management metadata collection system.
 */

import { describe, test, expect, assert } from 'vitest';
import { splitParamsRespectingGenerics } from '../machinery/heddles/management-collector.js';

describe('management-collector', () => {
  test('splitParamsRespectingGenerics handles simple types', () => {
    const result = splitParamsRespectingGenerics('name: string, age: number');
    expect(result).toEqual(['name: string', 'age: number']);
  });

  test('splitParamsRespectingGenerics handles generic types with commas', () => {
    const result = splitParamsRespectingGenerics('data: Record<string, unknown>');
    expect(result).toEqual(['data: Record<string, unknown>']);
  });

  test('splitParamsRespectingGenerics handles multiple params with generics', () => {
    const result = splitParamsRespectingGenerics(
      'data: Record<string, unknown>, options: Partial<{ name: string }>'
    );
    assert.deepStrictEqual(result, [
      'data: Record<string, unknown>',
      'options: Partial<{ name: string }>'
    ]);
  });

  test('splitParamsRespectingGenerics handles nested generics', () => {
    const result = splitParamsRespectingGenerics('data: Map<string, Array<number>>');
    expect(result).toEqual(['data: Map<string, Array<number>>']);
  });

  test('splitParamsRespectingGenerics handles optional params with generics', () => {
    const result = splitParamsRespectingGenerics(
      'data?: Record<string, unknown>, opts?: Partial<Config>'
    );
    assert.deepStrictEqual(result, ['data?: Record<string, unknown>', 'opts?: Partial<Config>']);
  });
});
