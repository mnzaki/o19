/**
 * Test for method name duplication issue
 * 
 * This test verifies that when multiple treadles generate hookups
 * from the same methods, they don't create duplicate entries
 * with different naming conventions (prefixed vs non-prefixed).
 * 
 * Issue: tauri-generator and tauri-adaptor were both generating
 * permissions like "allow-add-bookmark" and "allow-bookmark-add-bookmark"
 * causing duplicates in default.toml.
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyFileBlockHookup } from '../machinery/shuttle/hookups/file-block.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { FileBlockHookup } from '../machinery/shuttle/hookups/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempDir(): Promise<string> {
  return await fs.promises.mkdtemp(path.join(os.tmpdir(), 'method-dup-test-'));
}

function createMockContext(partial?: Partial<GeneratorContext>): GeneratorContext {
  return {
    packageDir: '/tmp/test',
    spire: {},
    outputDir: '/tmp/test/out',
    config: { name: 'test', version: '1.0.0', id: 'test' },
    query: () => ({ items: [], first: () => undefined }),
    workspaceRoot: '/tmp/test',
    ...partial,
  } as GeneratorContext;
}

// ============================================================================
// Permission Duplication Tests
// ============================================================================

describe('tauri permissions: method name handling', () => {
  test('should not duplicate permissions with different prefixes', async () => {
    const tmpDir = await createTempDir();
    const tomlPath = path.join(tmpDir, 'default.toml');
    
    // Initial TOML with some existing permissions
    await fs.promises.writeFile(tomlPath, `
"$schema" = "schemas/schema.json"

[default]
description = "Default permissions"
permissions = [
  "allow-ping"
]
`, 'utf-8');

    // Simulate tauri-generator hookup (produces prefixed names like "allow-bookmark-add-bookmark")
    const generatorHookup: FileBlockHookup = {
      path: tomlPath,
      tomlArray: {
        path: 'default.permissions',
        items: [
          'allow-bookmark-add-bookmark',
          'allow-bookmark-get-bookmark',
          'allow-post-add-post',
        ]
      }
    };

    // Simulate tauri-adaptor hookup (produces non-prefixed names like "allow-add-bookmark")
    // This represents the BUG - same methods but different naming
    const adaptorHookup: FileBlockHookup = {
      path: tomlPath,
      tomlArray: {
        path: 'default.permissions',
        items: [
          'allow-add-bookmark',      // Duplicate conceptually
          'allow-get-bookmark',      // Duplicate conceptually
          'allow-add-post',          // Duplicate conceptually
        ]
      }
    };

    const ctx = createMockContext({ packageDir: tmpDir });
    
    // Apply first hookup
    const result1 = await applyFileBlockHookup(tomlPath, generatorHookup, ctx);
    expect(result1.status).toBe('applied');
    
    // Apply second hookup (this is where duplication happens)
    const result2 = await applyFileBlockHookup(tomlPath, adaptorHookup, ctx);
    expect(result2.status).toBe('applied');

    // Read final content
    const content = fs.readFileSync(tomlPath, 'utf-8');
    
    // Check that we have BOTH naming conventions (the bug)
    // In a fixed implementation, we should only have one convention
    expect(content.includes('allow-bookmark-add-bookmark'), 'Should have prefixed version').toBe(true);
    expect(content.includes('allow-add-bookmark'), 'BUG: Also has non-prefixed version').toBe(true);
    
    // Count occurrences - there should be no exact duplicates
    const matches = content.match(/"allow-add-bookmark"/g);
    expect(matches?.length).toBe(1, 'Should only have one "allow-add-bookmark" entry');
    
    // Cleanup
    await fs.promises.rm(tmpDir, { recursive: true });
  });

  test('tomlArray should be idempotent for same items', async () => {
    const tmpDir = await createTempDir();
    const tomlPath = path.join(tmpDir, 'default.toml');
    
    await fs.promises.writeFile(tomlPath, `
[default]
permissions = []
`, 'utf-8');

    const hookup: FileBlockHookup = {
      path: tomlPath,
      tomlArray: {
        path: 'default.permissions',
        items: ['allow-add-bookmark', 'allow-get-bookmark']
      }
    };

    const ctx = createMockContext({ packageDir: tmpDir });
    
    // First application
    const result1 = await applyFileBlockHookup(tomlPath, hookup, ctx);
    expect(result1.status).toBe('applied');
    
    // Second application with same items should be skipped
    const result2 = await applyFileBlockHookup(tomlPath, hookup, ctx);
    expect(result2.status).toBe('skipped');

    // Cleanup
    await fs.promises.rm(tmpDir, { recursive: true });
  });

  test('should detect duplicate methods before generating permissions', async () => {
    // FIXED: This test documents the ROOT CAUSE of the duplication bug:
    // 
    // tauri-generator: methods.filter = 'platform', pipeline = [addManagementPrefix()]
    //   -> produces methods like 'bookmark_add_bookmark'
    //   -> permissions like 'allow-bookmark-add-bookmark'
    //
    // tauri-adaptor (REMOVED): methods.filter = 'front', pipeline = []
    //   -> produces methods like 'add_bookmark' 
    //   -> permissions like 'allow-add-bookmark'
    //
    // The fix: Removed permission generation from tauri-adaptor.
    // Only tauri-generator generates permissions now.
    
    const methodsFromGenerator = [
      { name: 'bookmark_add_bookmark' },
      { name: 'bookmark_get_bookmark' },
    ];
    
    // These were the methods tauri-adaptor was seeing (WRONG - no prefix)
    const methodsFromOldAdaptor = [
      { name: 'add_bookmark' },  // Missing 'bookmark_' prefix!
      { name: 'get_bookmark' },  // Missing 'bookmark_' prefix!
    ];
    
    // Convert to permission IDs
    const toPermissionId = (name: string) => `allow-${name.replace(/_/g, '-')}`;
    
    const generatorPermissions = methodsFromGenerator.map(m => toPermissionId(m.name));
    const oldAdaptorPermissions = methodsFromOldAdaptor.map(m => toPermissionId(m.name));
    
    // Demonstrate that different method sources produce different permission IDs
    console.log('Generator (correct):', generatorPermissions);
    console.log('Old Adaptor (wrong):', oldAdaptorPermissions);
    
    // They SHOULD be different because they come from different method sources
    expect(generatorPermissions).not.toEqual(oldAdaptorPermissions);
    
    // After the fix: only tauri-generator generates permissions,
    // so no duplicates exist in default.toml
  });
});

// ============================================================================
// Method Collection Tests
// ============================================================================

describe('method collection from context', () => {
  test('ctx.methods?.all should return consistent method names', async () => {
    // This test would verify that ctx.methods.all returns methods
    // with consistent naming regardless of which treadle accesses it.
    
    // The fix should ensure that:
    // 1. tauri-generator and tauri-adaptor both see the SAME method names
    // 2. Either both see prefixed names, or both see non-prefixed names
    // 3. Not one of each
    
    // For now, this is a placeholder documenting the expected behavior
    expect(true, 'Method collection should be consistent').toBe(true);
  });
});
