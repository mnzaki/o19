/**
 * Tests for Cargo.toml hookup handler
 *
 * Verifies APP-010: CargoTomlHookup requirements
 * - Dependencies (simple and complex)
 * - Dev-dependencies and build-dependencies
 * - Features
 * - [lib] configuration
 * - Workspace dependencies support
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyCargoTomlHookup } from '../machinery/shuttle/hookups/cargo-toml.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { CargoTomlHookup } from '../machinery/shuttle/hookups/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempFile(content: string, filename = 'Cargo.toml'): Promise<string> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cargo-test-'));
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
// Dependencies
// ============================================================================

describe('cargo-toml: dependencies', () => {
  test('adds simple dependency', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: { 'serde': '1.0' },
    };

    const result = await applyCargoTomlHookup(filePath, hookup, createMockContext());

    assert.strictEqual(result.status, 'applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[dependencies]'));
    assert.ok(content.includes('serde = "1.0"'));
  });

  test('adds dependency with path', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: {
        'o19-foundframe': { path: '../foundframe' }
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[dependencies.o19-foundframe]'));
    assert.ok(content.includes('path = "../foundframe"'));
  });

  test('adds dependency with features', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: {
        'tauri': {
          version: '2',
          features: ['test', 'isolation']
        }
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[dependencies.tauri]'));
    assert.ok(content.includes('version = "2"'));
    assert.ok(content.includes('features = ["test", "isolation"]'));
  });

  test('adds git dependency', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: {
        'some-lib': {
          git: 'https://github.com/user/repo.git',
          branch: 'main'
        }
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[dependencies.some-lib]'));
    assert.ok(content.includes('git = "https://github.com/user/repo.git"'));
    assert.ok(content.includes('branch = "main"'));
  });

  test('skips existing dependency', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"

[dependencies]
serde = "1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: { 'serde': '1.0' },
    };

    const result = await applyCargoTomlHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });

  test('adds multiple dependencies', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: {
        'serde': '1.0',
        'tokio': { version: '1', features: ['full'] },
        'local-crate': { path: '../local' }
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert.ok(content.includes('serde = "1.0"'));
    assert.ok(content.includes('[dependencies.tokio]'));
    assert.ok(content.includes('[dependencies.local-crate]'));
  });
});

// ============================================================================
// Dev Dependencies
// ============================================================================

describe('cargo-toml: dev-dependencies', () => {
  test('adds dev-dependency', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      devDependencies: { 'tokio-test': '0.4' },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[dev-dependencies]'));
    assert.ok(content.includes('tokio-test = "0.4"'));
  });

  test('adds dev and build dependencies together', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      devDependencies: { 'criterion': '0.5' },
      buildDependencies: { 'cc': '1.0' },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert.ok(content.includes('[dev-dependencies]'));
    assert.ok(content.includes('criterion = "0.5"'));
    assert.ok(content.includes('[build-dependencies]'));
    assert.ok(content.includes('cc = "1.0"'));
  });
});

// ============================================================================
// Features
// ============================================================================

describe('cargo-toml: features', () => {
  test('adds feature', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      features: {
        'spire': ['o19-foundframe/spire']
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[features]'));
    assert.ok(content.includes('spire = ["o19-foundframe/spire"]'));
  });

  test('adds multiple features', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      features: {
        'default': ['std'],
        'std': [],
        'spire': ['o19-foundframe/spire', 'tauri']
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    assert.ok(content.includes('default = ["std"]'));
    assert.ok(content.includes('std = []'));
    assert.ok(content.includes('spire = ["o19-foundframe/spire", "tauri"]'));
  });

  test('skips existing feature', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"

[features]
default = ["std"]
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      features: { 'default': ['std'] },
    };

    const result = await applyCargoTomlHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });
});

// ============================================================================
// Lib Configuration
// ============================================================================

describe('cargo-toml: lib configuration', () => {
  test('creates [lib] section', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      lib: {
        'crate-type': ['staticlib', 'cdylib', 'rlib']
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('[lib]'));
    assert.ok(content.includes('crate-type = ["staticlib", "cdylib", "rlib"]'));
  });

  test('adds lib with name and path', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      lib: {
        name: 'my_lib',
        path: 'src/lib.rs',
        'crate-type': ['cdylib']
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('name = "my_lib"'));
    assert.ok(content.includes('path = "src/lib.rs"'));
    assert.ok(content.includes('crate-type = ["cdylib"]'));
  });

  test('updates existing [lib] section', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"

[lib]
name = "old_name"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      lib: {
        'crate-type': ['staticlib']
      },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('name = "old_name"'));
    assert.ok(content.includes('crate-type = ["staticlib"]'));
  });
});

// ============================================================================
// Full Integration
// ============================================================================

describe('cargo-toml: full integration', () => {
  test('handles complex Cargo.toml configuration', async () => {
    const filePath = await createTempFile(`[package]
name = "foundframe-tauri"
version = "0.1.0"
edition = "2021"
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: {
        'tauri': {
          version: '2',
          features: ['test']
        },
        'o19-foundframe': { path: '../foundframe' },
        'serde': '1.0'
      },
      devDependencies: {
        'tokio-test': '0.4'
      },
      features: {
        'spire': ['o19-foundframe/spire']
      },
      lib: {
        'crate-type': ['staticlib', 'cdylib', 'rlib']
      }
    };

    const result = await applyCargoTomlHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Package info preserved
    assert.ok(content.includes('name = "foundframe-tauri"'));
    
    // Dependencies
    assert.ok(content.includes('[dependencies.tauri]'));
    assert.ok(content.includes('version = "2"'));
    assert.ok(content.includes('serde = "1.0"'));
    
    // Dev dependencies
    assert.ok(content.includes('[dev-dependencies]'));
    assert.ok(content.includes('tokio-test = "0.4"'));
    
    // Features
    assert.ok(content.includes('[features]'));
    assert.ok(content.includes('spire = ["o19-foundframe/spire"]'));
    
    // Lib config
    assert.ok(content.includes('[lib]'));
    assert.ok(content.includes('crate-type = ["staticlib", "cdylib", "rlib"]'));
  });

  test('preserves existing content structure', async () => {
    const filePath = await createTempFile(`[package]
name = "test"
version = "0.1.0"

[dependencies]
serde = "1.0"

[features]
default = ["std"]
`);
    const hookup: CargoTomlHookup = {
      path: filePath,
      dependencies: { 'tokio': '1' },
      features: { 'spire': ['std'] },
    };

    await applyCargoTomlHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Original content preserved
    assert.ok(content.includes('serde = "1.0"'));
    assert.ok(content.includes('default = ["std"]'));
    
    // New content added
    assert.ok(content.includes('tokio = "1"'));
    assert.ok(content.includes('spire = ["std"]'));
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('cargo-toml: error handling', () => {
  test('returns error for non-existent file', async () => {
    const hookup: CargoTomlHookup = {
      path: '/non/existent/Cargo.toml',
      dependencies: { 'serde': '1.0' },
    };

    const result = await applyCargoTomlHookup('/non/existent/Cargo.toml', hookup, createMockContext());

    assert.strictEqual(result.status, 'error');
    assert.ok(result.message?.includes('File not found'));
  });
});
