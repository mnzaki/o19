/**
 * Tests for Query Builder Iterator
 *
 * Verifies APP-011: Query builder is iterable (can use in for...of loops)
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
import { createQueryAPI, BoundQuery } from '../machinery/sley/query.js';
import { LanguageType } from '../machinery/reed/language/types.js';
import type { LanguageDefinitionImperative } from '../machinery/reed/language/imperative.js';

// Simple mock language for testing
const mockLanguage: LanguageDefinitionImperative = {
  name: 'test',
  extensions: ['.test'],
  types: {
    boolean: new LanguageType('bool', 'false'),
    string: new LanguageType('string', '""'),
    number: new LanguageType('number', '0'),
    signed: new LanguageType('int', '0'),
    unsigned: null,
    void: new LanguageType('void', 'null'),
    property: null,
    class: null,
    object: () => new LanguageType('object', '{}'),
    array: (t) => new LanguageType(`Array<${t.name}>`, '[]'),
    optional: (t) => new LanguageType(`${t.name}?`, 'null'),
    promise: (t) => new LanguageType(`Promise<${t.name}>`, 'Promise.resolve()'),
    result: null,
    fromTsType: (tsType: string) => new LanguageType(tsType, 'null')
  },
  codeGen: {
    rendering: {
      formatParam: (name: string, type: LanguageType) => `${name}: ${type.name}`,
      renderParams: (params: string[]) => `(${params.join(', ')})`,
      functionSignature: (method: any) => `function ${method.name}()`,
      renderDefinition: (method: any) => `function ${method.name}() {}`
    }
  }
};

describe('query builder iterator', () => {
  const mockMethods = [
    { name: 'addBookmark', tags: ['crud:create'], crudOperation: 'create', managementName: 'BookmarkMgmt' },
    { name: 'getBookmark', tags: ['crud:read'], crudOperation: 'read', managementName: 'BookmarkMgmt' },
    { name: 'listBookmarks', tags: ['crud:list'], crudOperation: 'list', managementName: 'BookmarkMgmt' },
    { name: 'deleteBookmark', tags: ['crud:delete'], crudOperation: 'delete', managementName: 'BookmarkMgmt' }
  ];

  test('can iterate over query with for...of', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const names: string[] = [];
    for (const method of query) {
      names.push(method.name);
    }
    
    expect(names).toEqual(['addBookmark', 'getBookmark', 'listBookmarks', 'deleteBookmark']);
  });

  test('can spread query into array', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const methods = [...query];
    
    expect(methods.length).toBe(4);
    expect(methods[0].name).toBe('addBookmark');
  });

  test('can iterate over filtered query', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const creates: string[] = [];
    for (const method of query.crud('create')) {
      creates.push(method.name);
    }
    
    expect(creates).toEqual(['addBookmark']);
  });

  test('can iterate over chained filters', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const bookmarkMethods: string[] = [];
    for (const method of query.management('BookmarkMgmt').crud('read', 'list')) {
      bookmarkMethods.push(method.name);
    }
    
    expect(bookmarkMethods).toEqual(['getBookmark', 'listBookmarks']);
  });

  test('can use Array.from on query', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const methods = Array.from(query);
    
    expect(methods.length).toBe(4);
  });

  test('iteration respects current filters', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const filtered = query.tag('crud:create');
    
    const names: string[] = [];
    for (const method of filtered) {
      names.push(method.name);
    }
    
    expect(names).toEqual(['addBookmark']);
  });

  test('pre-filtered entry points are iterable', () => {
    const query = createQueryAPI(mockMethods);
    query.setLang(mockLanguage);
    
    const reads: string[] = [];
    for (const method of query.reads) {
      reads.push(method.name);
    }
    
    expect(reads).toEqual(['getBookmark']);
  });

  test('empty query is iterable (no results)', () => {
    const query = createQueryAPI([]);
    query.setLang(mockLanguage);
    
    let count = 0;
    for (const _method of query) {
      count++;
    }
    
    expect(count).toBe(0);
  });
});
