/**
 * Tests for Query Builder Iterator
 *
 * Verifies APP-011: Query builder is iterable (can use in for...of loops)
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
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
    
    expect(names).toEqual(['addBookmark', 'getBookmark', 'listBookmarks', 'deleteBookmark']);
  });

  test('can spread query.methods into array', () => {
    const query = createQueryAPI(mockMethods);
    const methods = [...query.methods];
    
    expect(methods.length).toBe(4);
    expect(methods[0].name).toBe('addBookmark');
  });

  test('can iterate over filtered query', () => {
    const query = createQueryAPI(mockMethods);
    const creates: string[] = [];
    
    for (const method of query.methods.crud('create')) {
      creates.push(method.name);
    }
    
    expect(creates).toEqual(['addBookmark']);
  });

  test('can iterate over chained filters', () => {
    const query = createQueryAPI(mockMethods);
    const bookmarkMethods: string[] = [];
    
    for (const method of query.methods.management('BookmarkMgmt').crud('read', 'list')) {
      bookmarkMethods.push(method.name);
    }
    
    expect(bookmarkMethods).toEqual(['getBookmark', 'listBookmarks']);
  });

  test('can use Array.from on query', () => {
    const query = createQueryAPI(mockMethods);
    const methods = Array.from(query.methods);
    
    expect(methods.length).toBe(4);
  });

  test('iteration respects current filters', () => {
    const query = createQueryAPI(mockMethods);
    const filtered = query.methods.tag('crud:create');
    
    const names: string[] = [];
    for (const method of filtered) {
      names.push(method.name);
    }
    
    expect(names).toEqual(['addBookmark']);
  });

  test('pre-filtered entry points are iterable', () => {
    const query = createQueryAPI(mockMethods);
    const reads: string[] = [];
    
    for (const method of query.reads) {
      reads.push(method.name);
    }
    
    expect(reads).toEqual(['getBookmark']);
  });

  test('empty query is iterable (no results)', () => {
    const query = createQueryAPI([]);
    let count = 0;
    
    for (const _method of query.methods) {
      count++;
    }
    
    expect(count).toBe(0);
  });
});
