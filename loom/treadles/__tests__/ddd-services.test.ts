/**
 * DDD Services Treadle Tests (APP-007)
 *
 * TDD approach using Node.js built-in test runner.
 * Tests verify that dddServicesTreadle correctly:
 * - Groups methods by management
 * - Classifies methods as read/write/passthrough
 * - Generates correct service structure
 * 
 * Run with: node --test dist/__tests__/ddd-services.test.js
 * Or: npm test (if configured)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  dddServicesTreadle,
  type ManagementService,
  type ServiceMethod
} from '../ddd-services.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockMethod(options: {
  name: string;
  returnType?: string;
  isCollection?: boolean;
  params?: Array<{ name: string; type: string; optional?: boolean }>;
  crudOperation?: string;
  tags?: string[];
}): any {
  return {
    name: options.name,
    implName: options.name,
    jsName: options.name,
    returnType: options.returnType || 'void',
    isCollection: options.isCollection || false,
    params: options.params || [],
    description: `Test method ${options.name}`,
    crudOperation: options.crudOperation,
    tags: options.tags || (options.crudOperation ? [`crud:${options.crudOperation}`] : [])
  };
}

function createMockContext(methodsByMgmt: Map<string, any[]>): any {
  return {
    methods: {
      byManagement: () => methodsByMgmt,
      all: Array.from(methodsByMgmt.values()).flat()
    },
    config: {}
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('dddServicesTreadle', () => {
  describe('data function', () => {
    it('should return empty services when no methods provided', () => {
      const ctx = createMockContext(new Map());
      const data = (dddServicesTreadle as any).data(ctx);
      
      assert.equal(data.services.length, 0);
      assert.equal(data.hasServices, false);
    });

    it('should build services from management methods', () => {
      const methodsByMgmt = new Map([
        ['BookmarkMgmt', [
          createMockMethod({ name: 'addBookmark', crudOperation: 'create', returnType: 'void' }),
          createMockMethod({ name: 'listBookmarks', crudOperation: 'list', returnType: 'Bookmark', isCollection: true }),
          createMockMethod({ name: 'getBookmark', crudOperation: 'read', returnType: 'Bookmark' }),
          createMockMethod({ name: 'updateBookmark', crudOperation: 'update', returnType: 'Bookmark' }),
          createMockMethod({ name: 'deleteBookmark', crudOperation: 'delete', returnType: 'void' })
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const data = (dddServicesTreadle as any).data(ctx);
      
      assert.equal(data.hasServices, true);
      assert.equal(data.services.length, 1);
      
      const service = data.services[0];
      assert.equal(service.name, 'BookmarkMgmt');
      assert.equal(service.entityName, 'Bookmark');
      assert.equal(service.serviceName, 'BookmarkService');
      assert.equal(service.portName, 'BookmarkPort');
    });

    it('should classify methods correctly', () => {
      const methodsByMgmt = new Map([
        ['TestMgmt', [
          createMockMethod({ name: 'createItem', crudOperation: 'create' }),
          createMockMethod({ name: 'getItem', crudOperation: 'read' }),
          createMockMethod({ name: 'updateItem', crudOperation: 'update' }),
          createMockMethod({ name: 'deleteItem', crudOperation: 'delete' }),
          createMockMethod({ name: 'listItems', crudOperation: 'list' }),
          createMockMethod({ name: 'customAction' }) // No CRUD tag
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const data = (dddServicesTreadle as any).data(ctx);
      const service = data.services[0];
      
      assert.equal(service.readMethods.length, 2); // read + list
      assert.equal(service.writeMethods.length, 3); // create + update + delete
      assert.equal(service.passthroughMethods.length, 1); // customAction
    });
  });

  describe('outputs function', () => {
    it('should generate port, service, and adaptor per management', async () => {
      const methodsByMgmt = new Map([
        ['BookmarkMgmt', [
          createMockMethod({ name: 'addBookmark', crudOperation: 'create' }),
          createMockMethod({ name: 'getBookmark', crudOperation: 'read' })
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const outputsFn = (dddServicesTreadle as any).outputs[0];
      const outputs = outputsFn(ctx);
      
      // Should generate: port, service, adaptor, 3 index files, adaptor-selector
      const expectedFiles = [
        'src/ports/gen/bookmark.port.gen.ts',
        'src/services/gen/bookmark.service.gen.ts',
        'src/adaptors/gen/bookmark.adaptor.gen.ts',
        'src/ports/gen/index.gen.ts',
        'src/services/gen/index.gen.ts',
        'src/adaptors/gen/index.gen.ts',
        'src/adaptor-selector.gen.ts'
      ];
      
      assert.equal(outputs.length, expectedFiles.length);
      
      for (const expectedPath of expectedFiles) {
        const found = outputs.find((o: any) => o.path === expectedPath);
        assert.ok(found, `Expected output file ${expectedPath} not found`);
      }
    });

    it('should skip adaptor generation for management with no read/write methods', () => {
      const methodsByMgmt = new Map([
        ['UtilityMgmt', [
          createMockMethod({ name: 'customAction' }) // No CRUD
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const outputsFn = (dddServicesTreadle as any).outputs[0];
      const outputs = outputsFn(ctx);
      
      // Should generate port and service, but no adaptor (no read/write methods)
      const hasAdaptor = outputs.some((o: any) => o.path.includes('utility.adaptor'));
      assert.equal(hasAdaptor, false);
    });

    it('should handle multiple managements', () => {
      const methodsByMgmt = new Map([
        ['BookmarkMgmt', [
          createMockMethod({ name: 'addBookmark', crudOperation: 'create' }),
          createMockMethod({ name: 'getBookmark', crudOperation: 'read' })
        ]],
        ['MediaMgmt', [
          createMockMethod({ name: 'addMedia', crudOperation: 'create' }),
          createMockMethod({ name: 'getMedia', crudOperation: 'read' })
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const outputsFn = (dddServicesTreadle as any).outputs[0];
      const outputs = outputsFn(ctx);
      
      // Should have 2 of each: port, service, adaptor = 6 + 3 index files + 1 selector = 10
      const portFiles = outputs.filter((o: any) => o.path.includes('.port.gen.ts'));
      const serviceFiles = outputs.filter((o: any) => o.path.includes('.service.gen.ts'));
      const adaptorFiles = outputs.filter((o: any) => o.path.includes('.adaptor.gen.ts'));
      
      assert.equal(portFiles.length, 2);
      assert.equal(serviceFiles.length, 2);
      assert.equal(adaptorFiles.length, 2);
    });
  });

  describe('service method conversion', () => {
    it('should convert params correctly', () => {
      const methodsByMgmt = new Map([
        ['TestMgmt', [
          createMockMethod({
            name: 'createWithParams',
            crudOperation: 'create',
            returnType: 'Test',
            params: [
              { name: 'url', type: 'string', optional: false },
              { name: 'title', type: 'string', optional: true }
            ]
          })
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const data = (dddServicesTreadle as any).data(ctx);
      const method = data.services[0].methods[0];
      
      assert.equal(method.params.length, 2);
      assert.equal(method.params[0].name, 'url');
      assert.equal(method.params[0].tsType, 'string');
      assert.equal(method.params[0].optional, false);
      assert.equal(method.params[1].name, 'title');
      assert.equal(method.params[1].optional, true);
    });

    it('should handle collection returns', () => {
      const methodsByMgmt = new Map([
        ['TestMgmt', [
          createMockMethod({
            name: 'listItems',
            crudOperation: 'list',
            returnType: 'Item',
            isCollection: true
          })
        ]]
      ]);
      
      const ctx = createMockContext(methodsByMgmt);
      const data = (dddServicesTreadle as any).data(ctx);
      const method = data.services[0].methods[0];
      
      assert.equal(method.isCollection, true);
      assert.equal(method.returnType, 'Item');
    });
  });
});

// ============================================================================
// Integration Test (Optional - for when templates are available)
// ============================================================================

describe('dddServicesTreadle integration', () => {
  it('should have correct template paths', () => {
    const methodsByMgmt = new Map([
      ['TestMgmt', [
        createMockMethod({ name: 'testMethod', crudOperation: 'create' })
      ]]
    ]);
    
    const ctx = createMockContext(methodsByMgmt);
    const outputsFn = (dddServicesTreadle as any).outputs[0];
    const outputs = outputsFn(ctx);
    
    // Verify template paths exist
    const expectedTemplates = [
      'ddd/port.ts.ejs',
      'ddd/service.ts.ejs',
      'ddd/adaptor.ts.ejs',
      'ddd/ports-index.ts.ejs',
      'ddd/services-index.ts.ejs',
      'ddd/adaptors-index.ts.ejs',
      'ddd/adaptor-selector.ts.ejs'
    ];
    
    for (const template of expectedTemplates) {
      const found = outputs.find((o: any) => o.template === template);
      assert.ok(found, `Expected template ${template} not found`);
    }
  });
});
