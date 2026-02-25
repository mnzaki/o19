/**
 * Tests for TypeScript index hookup handler
 *
 * Verifies APP-010: TypeScriptIndexHookup requirements
 * - Star exports (export * from '...')
 * - Named re-exports (export { X } from '...')
 * - Import statements
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyTypeScriptHookup } from '../machinery/shuttle/hookups/typescript.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { TypeScriptIndexHookup } from '../machinery/shuttle/hookups/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempFile(content: string, filename = 'index.ts'): Promise<string> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ts-hookup-test-'));
  const filePath = path.join(tmpDir, filename);
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return filePath;
}

function createMockContext(): GeneratorContext {
  return {
    packageDir: '/tmp/test',
    spire: {},
    outputDir: '/tmp/test/out',
    config: { name: 'test', version: '1.0.0', id: 'test' },
    query: () => ({ items: [], first: () => undefined }),
  };
}

// ============================================================================
// Star Exports
// ============================================================================

describe('typescript: star exports', () => {
  test('adds star export to empty file', async () => {
    const filePath = await createTempFile(`// Empty index.ts`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire/src/index.js', star: true }],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());

    assert.strictEqual(result.status, 'applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export * from '../spire/src/index.js';"));
  });

  test('adds star export as string line', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: ["export * from '../spire/src/index.js';"],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export * from '../spire/src/index.js';"));
  });

  test('adds multiple star exports', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [
        { source: '../spire/src/ports/index.js', star: true },
        { source: '../spire/src/services/index.js', star: true },
        { source: '../spire/src/types.gen.js', star: true },
      ],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes("export * from '../spire/src/ports/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/services/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/types.gen.js';"));
  });

  test('skips existing star export', async () => {
    const filePath = await createTempFile(`export * from '../spire/src/index.js';`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire/src/index.js', star: true }],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });

  test('adds after existing exports', async () => {
    const filePath = await createTempFile(`export * from './existing.js';`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire/src/index.js', star: true }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes("export * from './existing.js';"));
    assert.ok(content.includes("export * from '../spire/src/index.js';"));
  });
});

// ============================================================================
// Named Re-exports
// ============================================================================

describe('typescript: named re-exports', () => {
  test('adds named re-export', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire/src/types.js', names: ['Bookmark', 'Tag'] }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export { Bookmark, Tag } from '../spire/src/types.js';"));
  });

  test('adds named re-export as string line', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: ["export { X, Y } from '../spire.js';"],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export { X, Y } from '../spire.js';"));
  });

  test('skips existing named re-export', async () => {
    const filePath = await createTempFile(`export { Bookmark } from '../spire.js';`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire.js', names: ['Bookmark'] }],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });
});

// ============================================================================
// Mixed Exports
// ============================================================================

describe('typescript: mixed exports', () => {
  test('handles mixed star and named exports', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [
        { source: '../spire/src/ports/index.js', star: true },
        { source: '../spire/src/services/index.js', star: true },
        { source: '../spire/src/adaptors/index.js', star: true },
        { source: '../spire/src/types.gen.js', star: true },
      ],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export * from '../spire/src/ports/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/services/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/adaptors/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/types.gen.js';"));
  });

  test('foundframe-front style spire integration', async () => {
    const filePath = await createTempFile(`// Foundframe Front Entry Point`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [
        { source: '../spire/src/ports/index.js', star: true },
        { source: '../spire/src/services/index.js', star: true },
        { source: '../spire/src/adaptors/index.js', star: true },
        { source: '../spire/src/types.gen.js', star: true },
      ],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    // Should have all 4 star exports
    const starExports = content.match(/export \* from/g);
    assert.strictEqual(starExports?.length, 4);
  });
});

// ============================================================================
// Import Handling
// ============================================================================

describe('typescript: imports', () => {
  test('adds side-effect import', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: './polyfills.js' }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import './polyfills.js';"));
  });

  test('adds named import', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../spire.js', names: ['BookmarkService'] }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import { BookmarkService } from '../spire.js';"));
  });

  test('adds default import', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../api.js', default: 'ApiClient' }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import ApiClient from '../api.js';"));
  });

  test('adds namespace import', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../utils.js', namespace: 'Utils' }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import * as Utils from '../utils.js';"));
  });

  test('adds type-only import', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../types.js', names: ['Config'], typeOnly: true }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import type { Config } from '../types.js';"));
  });

  test('adds import after existing imports', async () => {
    const filePath = await createTempFile(`import { existing } from './existing.js';`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../spire.js', names: ['newThing'] }],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes("import { existing } from './existing.js';"));
    assert.ok(content.includes("import { newThing } from '../spire.js';"));
  });

  test('skips existing import', async () => {
    const filePath = await createTempFile(`import { Bookmark } from '../spire.js';`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [{ source: '../spire.js', names: ['Bookmark'] }],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });

  test('adds import as string line', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: ["import { X } from '../spire.js';"],
    };

    await applyTypeScriptHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("import { X } from '../spire.js';"));
  });
});

// ============================================================================
// Full Integration
// ============================================================================

describe('typescript: full integration', () => {
  test('handles complex index.ts with imports and exports', async () => {
    const filePath = await createTempFile(`// Foundframe Front Entry Point\n`);
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      imports: [
        { source: './init.js' },
        { source: '../spire/src/types.gen.js', names: ['AppConfig'], typeOnly: true },
      ],
      exports: [
        { source: '../spire/src/ports/index.js', star: true },
        { source: '../spire/src/services/index.js', star: true },
      ],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Imports
    assert.ok(content.includes("import './init.js';"));
    assert.ok(content.includes("import type { AppConfig } from '../spire/src/types.gen.js';"));
    
    // Exports
    assert.ok(content.includes("export * from '../spire/src/ports/index.js';"));
    assert.ok(content.includes("export * from '../spire/src/services/index.js';"));
  });

  test('handles index.js file extension', async () => {
    const filePath = await createTempFile(`// JS Entry`, 'index.js');
    const hookup: TypeScriptIndexHookup = {
      path: filePath,
      exports: [{ source: '../spire/index.js', star: true }],
    };

    const result = await applyTypeScriptHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("export * from '../spire/index.js';"));
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('typescript: error handling', () => {
  test('returns error for non-existent file', async () => {
    const hookup: TypeScriptIndexHookup = {
      path: '/non/existent/index.ts',
      exports: [{ source: '../spire.js', star: true }],
    };

    const result = await applyTypeScriptHookup('/non/existent/index.ts', hookup, createMockContext());

    assert.strictEqual(result.status, 'error');
    assert.ok(result.message?.includes('File not found'));
  });
});
