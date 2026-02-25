/**
 * Tests for Query Builder Iterator
 *
 * Verifies APP-011: Query builder is iterable (can use in for...of loops)
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { createQueryAPI, BoundQueryImpl } from '../machinery/sley/query.js';

describe('query builder iterator', () => {
  const mockMethods = [
    { name: 'addBookmark', tags: ['crud:create'], crudOperation: 'create', managementName: 'BookmarkMgmt' },
    { name: 'getBookmark', tags: ['crud:read'], crudOperation: 'read', managementName: 'BookmarkMgmt' },
    { name: 'listBookmarks', tags: ['crud:list'], crudOperation: 'list', managementName: 'BookmarkMgmt' },
    { name: 'deleteBookmark', tags: ['crud:delete'], crudOperation: 'delete', managementName: 'BookmarkMgmt' }
  ];

  test('can iterate over query.methods with for...of', () => {
    const query = createQueryAPI(mockMethods);
    const names: string[] = [];
    
    for (const method of query.methods) {
      names.push(method.name);
    }
    
    assert.deepStrictEqual(names, ['addBookmark', 'getBookmark', 'listBookmarks', 'deleteBookmark']);
  });

  test('can spread query.methods into array', () => {
    const query = createQueryAPI(mockMethods);
    const methods = [...query.methods];
    
    assert.strictEqual(methods.length, 4);
    assert.strictEqual(methods[0].name, 'addBookmark');
  });

  test('can iterate over filtered query', () => {
    const query = createQueryAPI(mockMethods);
    const creates: string[] = [];
    
    for (const method of query.methods.crud('create')) {
      creates.push(method.name);
    }
    
    assert.deepStrictEqual(creates, ['addBookmark']);
  });

  test('can iterate over chained filters', () => {
    const query = createQueryAPI(mockMethods);
    const bookmarkMethods: string[] = [];
    
    for (const method of query.methods.management('BookmarkMgmt').crud('read', 'list')) {
      bookmarkMethods.push(method.name);
    }
    
    assert.deepStrictEqual(bookmarkMethods, ['getBookmark', 'listBookmarks']);
  });

  test('can use Array.from on query', () => {
    const query = createQueryAPI(mockMethods);
    const methods = Array.from(query.methods);
    
    assert.strictEqual(methods.length, 4);
  });

  test('iteration respects current filters', () => {
    const query = createQueryAPI(mockMethods);
    const filtered = query.methods.tag('crud:create');
    
    const names: string[] = [];
    for (const method of filtered) {
      names.push(method.name);
    }
    
    assert.deepStrictEqual(names, ['addBookmark']);
  });

  test('pre-filtered entry points are iterable', () => {
    const query = createQueryAPI(mockMethods);
    const reads: string[] = [];
    
    for (const method of query.reads) {
      reads.push(method.name);
    }
    
    assert.deepStrictEqual(reads, ['getBookmark']);
  });

  test('empty query is iterable (no results)', () => {
    const query = createQueryAPI([]);
    let count = 0;
    
    for (const _method of query.methods) {
      count++;
    }
    
    assert.strictEqual(count, 0);
  });
});
