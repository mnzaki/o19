/**
 * Postrequisite Diviners Tests 🌀
 *
 * "The diviner looks forward from the past, collecting what will be needed."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PostrequisiteAccumulator,
  ImportsAccumulator,
  FilesAccumulator,
  declareDiviner,
  importsDiviner,
  type ImportEntry
} from '../machinery/reed/postrequisites.js';
import { BoundQuery, createQueryAPI } from '../machinery/sley/query.js';
import { LanguageMethod } from '../machinery/reed/method.js';
import type { MethodHeddle } from '../machinery/heddles/types.js';

describe('Postrequisite Diviners', () => {
  describe('PostrequisiteAccumulator', () => {
    it('should track stage transitions', () => {
      const acc = new ImportsAccumulator({} as any, 'test');
      expect(acc._stage).toBe('collecting');
      
      acc._stage = 'rendering';
      expect(acc._stage).toBe('rendering');
    });

    it('should store context name', () => {
      const acc = new ImportsAccumulator({} as any, 'methods');
      expect((acc as any)._contextName).toBe('methods');
    });
  });

  describe('ImportsAccumulator', () => {
    it('should collect import entries', () => {
      const acc = new ImportsAccumulator({} as any, 'methods');
      
      acc.add('Bookmark', './entities/Bookmark', true, 'createBookmark');
      acc.add('User', './entities/User', true, 'getUser');
      
      // Entries query needs a language
      acc.entries.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      const entries = acc.entries.all;
      expect(entries).toHaveLength(2);
      expect(entries[0].name).toBe('Bookmark');
      expect(entries[1].isEntity).toBe(true);
    });

    it('should deduplicate imports by name', () => {
      const acc = new ImportsAccumulator({} as any, 'methods');
      
      acc.add('Bookmark', './entities/Bookmark', true, 'createBookmark');
      acc.add('Bookmark', './entities/Bookmark', true, 'updateBookmark');
      
      // Entries query needs a language
      acc.entries.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      expect(acc.entries.all).toHaveLength(1);
    });

    it('should return entries as BoundQuery for chaining', () => {
      const acc = new ImportsAccumulator({} as any, 'methods');
      acc.add('Bookmark', './entities/Bookmark', true, 'createBookmark');
      acc.add('User', './entities/User', false, 'getUser');
      
      const entriesQuery = acc.entries;
      expect(entriesQuery).toBeInstanceOf(BoundQuery);
      
      // Need to add language for BoundQuery to work
      entriesQuery.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      const entityEntries = entriesQuery.filter(e => e.isEntity).all;
      expect(entityEntries).toHaveLength(1);
      expect(entityEntries[0].name).toBe('Bookmark');
    });

    it('toString should use render with "imports" finisher', () => {
      const acc = new ImportsAccumulator({} as any, 'methods');
      acc._finishers['imports'] = () => 'import { Test } from "./test";';
      
      // Phase 1 (collecting): returns placeholder
      acc._stage = 'collecting';
      const phase1 = acc.toString();
      expect(phase1).toContain('{{ methods.imports.render');
      
      // Phase 2 (rendering): returns actual content
      acc._stage = 'rendering';
      const phase2 = acc.toString();
      expect(phase2).toBe('import { Test } from "./test";');
    });
  });

  describe('FilesAccumulator', () => {
    it('should transform imports to file specs', () => {
      // Create source query with import entries
      const entries = [
        { name: 'Bookmark', path: './entities/Bookmark', isEntity: true, sourceMethod: 'create' },
        { name: 'User', path: './entities/User', isEntity: true, sourceMethod: 'get' }
      ];
      const sourceQuery = createQueryAPI(entries as any, 'imports.entries');
      // Add a language to satisfy BoundQuery requirements
      sourceQuery.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      const filesAcc = new FilesAccumulator(sourceQuery, './entities/{{name}}', 'entities');
      
      const files = filesAcc.all;
      expect(files).toHaveLength(2);
      // name is now a Name instance - use toString() or pascalCase
      expect(files[0].name.toString()).toBe('BOOKMARK'); // Default SCREAMING_SNAKE case
      expect(files[0].name.pascalCase).toBe('Bookmark');
      // path uses name.toString() for resolution
      expect(files[0].path).toBe('./entities/BOOKMARK');
      expect(files[0].template).toBe('entity.ts.mejs');
    });

    it('should provide files as BoundQuery', () => {
      const entries = [
        { name: 'Bookmark', path: './entities/Bookmark', isEntity: true, sourceMethod: 'create' },
        { name: 'User', path: './entities/User', isEntity: true, sourceMethod: 'get' }
      ];
      const sourceQuery = createQueryAPI(entries as any, 'imports.entries');
      sourceQuery.addLang({ name: 'test', extensions: ['.ts'] } as any);
      const filesAcc = new FilesAccumulator(sourceQuery, './entities/{{name}}', 'entities');
      
      const filesQuery = filesAcc.files;
      expect(filesQuery).toBeInstanceOf(BoundQuery);
      
      filesQuery.addLang({ name: 'test', extensions: ['.ts'] } as any);
      // name is a Name instance - use pascalCase for comparison
      const filtered = filesQuery.filter(f => f.name.pascalCase === 'Bookmark').all;
      expect(filtered).toHaveLength(1);
    });

    it('toString should use render with "files" finisher', () => {
      const sourceQuery = createQueryAPI([], 'imports.entries');
      const filesAcc = new FilesAccumulator(sourceQuery, './entities/{{name}}', 'entities');
      filesAcc._finishers['files'] = () => '// Generated files';
      
      // Phase 1: placeholder
      filesAcc._stage = 'collecting';
      expect(filesAcc.toString()).toContain('{{ entities.newFiles.render');
      
      // Phase 2: actual content
      filesAcc._stage = 'rendering';
      expect(filesAcc.toString()).toBe('// Generated files');
    });
  });

  describe('declareDiviner', () => {
    it('should create factory that returns instantiated diviner', () => {
      const testDiviner = declareDiviner([
        {
          init: (items, ctx, args) => new ImportsAccumulator({} as any, 'test'),
          wrapProperty: {}
        },
        {
          test: (acc, ctx, args) => () => 'test output'
        }
      ]);
      
      const instantiated = testDiviner({ entityPath: './test' });
      // Check the interface exists (but don't access .accumulator getter before init)
      expect(instantiated).toHaveProperty('initAccumulator');
      expect(instantiated).toHaveProperty('applyWrappers');
      
      // Initialize accumulator before accessing
      const mockQuery = createQueryAPI([], 'test');
      const mockLang = { name: 'test', extensions: ['.ts'] } as any;
      mockQuery.addLang(mockLang);
      instantiated.initAccumulator(mockQuery, mockLang);
      
      // Now we can access the accumulator
      const acc = instantiated.accumulator;
      expect(acc).toBeInstanceOf(ImportsAccumulator);
      expect(acc._nameString).toBe('imports');
    });

    it('should apply property wrappers when applyToItems is called', () => {
      // Create mock items with a property to wrap
      const mockItems = [
        { 
          name: 'testMethod',
          get returnType() { return { name: 'TestEntity', isEntity: true }; }
        }
      ];
      
      let collected = false;
      const testDiviner = declareDiviner([
        {
          init: (items, ctx, args) => {
            const acc = new ImportsAccumulator({} as any, 'test');
            acc.add = () => { collected = true; };
            return acc;
          },
          wrapProperty: {
            returnType: (desc, acc) => ({
              get: function() {
                const type = desc.get!.call(this);
                if (type?.isEntity) {
                  (acc as ImportsAccumulator).add(type.name, './test', true, '');
                }
                return type;
              },
              enumerable: desc.enumerable,
              configurable: desc.configurable
            })
          }
        },
        {
          imports: (acc, ctx, args) => () => 'rendered'
        }
      ]);
      
      const instantiated = testDiviner({});
      const query = createQueryAPI(mockItems as any, 'test');
      const mockLang = { name: 'test', extensions: ['.ts'] } as any;
      query.addLang(mockLang);
      
      // Phase 1: Initialize accumulator
      instantiated.initAccumulator(query, mockLang);
      
      // Phase 2: Apply wrappers (happens during evaluate)
      instantiated.applyWrappers(query.all);
      
      // Trigger the wrapped property
      const item = query.first;
      expect(item).toBeDefined();
      const type = (item as any).returnType;
      expect(type.name).toBe('TestEntity');
      expect(collected).toBe(true);
    });
  });

  describe('importsDiviner', () => {
    it('should be a valid diviner factory', () => {
      const diviner = importsDiviner({ entityPath: './entities' });
      
      // Create a mock query and initialize accumulator
      const mockQuery = createQueryAPI([], 'methods');
      const mockLang = { name: 'test', extensions: ['.ts'] } as any;
      mockQuery.addLang(mockLang);
      diviner.initAccumulator(mockQuery, mockLang);
      
      expect(diviner.accumulator).toBeInstanceOf(ImportsAccumulator);
    });

    it('should collect entity imports from returnType access', () => {
      // Use mock types with isEntity flag instead of real language types
      const mockEntityType = { name: 'Bookmark', isEntity: true };
      const mockPrimitiveType = { name: 'string', isEntity: false };
      
      const mockMethods = [
        {
          name: 'createBookmark',
          crudOperation: 'create',
          managementName: 'BookmarkMgmt',
          tags: [],
          cloneWithLang: function(lang: any) { return { ...this, lang }; },
          get returnType() {
            return mockEntityType;
          }
        },
        {
          name: 'getUser',
          crudOperation: 'read',
          managementName: 'UserMgmt',
          tags: [],
          cloneWithLang: function(lang: any) { return { ...this, lang }; },
          get returnType() {
            return mockPrimitiveType;  // Not an entity
          }
        }
      ];
      
      const query = createQueryAPI(mockMethods as any, 'methods', {
        imports: importsDiviner({ entityPath: './entities' })
      });
      
      // Trigger accumulator initialization with mock language
      query.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      // Access returnType to trigger collection
      for (const m of query.all) {
        const _ = m.returnType;  // This should trigger the diviner wrapper
      }
      
      // Check that imports were collected
      const imports = query.imports;
      expect(imports).toBeDefined();
      
      // Entries query needs a language to evaluate
      imports!.entries.addLang({ name: 'test', extensions: ['.ts'] } as any);
      
      const entries = imports!.entries.all;
      expect(entries.some((e: ImportEntry) => e.name === 'Bookmark')).toBe(true);
      expect(entries.some((e: ImportEntry) => e.name === 'string')).toBe(false);  // Not an entity
    });
  });

  describe('Integration with fromHeddles', () => {
    it('should attach imports diviner to methods query', async () => {
      // Import typescript to register it
      await import('../warp/typescript.js');
      const { fromHeddles } = await import('../machinery/reed/index.js');
      const { languages } = await import('../machinery/reed/language/imperative.js');
      const tsLang = languages.get('typescript');
      expect(tsLang).toBeDefined();
      
      const mockHeddles = {
        methods: [
          {
            name: 'createBookmark',
            managementName: 'BookmarkMgmt',
            crudOperation: 'create',
            returnType: { name: 'Bookmark', isEntity: true },
            parameters: [],
            tags: []
          }
        ] as MethodHeddle[],
        entities: [],
        mgmts: []
      };
      
      const reed = fromHeddles(mockHeddles);
      
      // Trigger evaluation by adding a language
      reed.methods.addLang(tsLang);
      
      // Access .all to trigger evaluation
      reed.methods.all;
      
      // Methods should have imports accumulator
      expect(reed.methods.accumulators.has('imports')).toBe(true);
      
      // Entities should have newFiles accumulator attached
      expect((reed.entities as any).newFiles).toBeInstanceOf(FilesAccumulator);
    });
  });
});
