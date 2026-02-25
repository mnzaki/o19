/**
 * Tests for rust-module hookup handler
 *
 * Verifies APP-010: RustModuleHookup requirements
 * - Module declarations (mod spire;)
 * - Use statements
 * - Tauri generate_handler![] injection
 * - Plugin setup code
 */

import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyRustModuleHookup } from '../machinery/shuttle/hookups/rust-module.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { RustModuleHookup } from '../machinery/shuttle/hookups/types.js';

// ============================================================================
// Test Helpers
// ============================================================================

async function createTempFile(content: string): Promise<string> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rust-module-test-'));
  const filePath = path.join(tmpDir, 'lib.rs');
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
// Module Declarations
// ============================================================================

describe('rust-module: module declarations', () => {
  test('adds simple module declaration', async () => {
    const filePath = await createTempFile(`// Empty lib.rs`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());

    assert.strictEqual(result.status, 'applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('mod spire;'));
  });

  test('adds pub mod declaration', async () => {
    const filePath = await createTempFile(`mod existing;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['pub mod spire;'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('mod existing;'));
    assert.ok(content.includes('pub mod spire;'));
  });

  test('adds module with path attribute', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: [{ name: 'spire', path: 'src/spire.rs', pub: true }],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('#[path = "src/spire.rs"]'));
    assert.ok(content.includes('pub mod spire;'));
  });

  test('skips existing modules', async () => {
    const filePath = await createTempFile(`mod spire;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });

  test('handles multiple module declarations', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;', 'pub mod commands;', { name: 'utils', pub: false }],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('mod spire;'));
    assert.ok(content.includes('pub mod commands;'));
    assert.ok(content.includes('mod utils;'));
  });
});

// ============================================================================
// Use Statements
// ============================================================================

describe('rust-module: use statements', () => {
  test('adds use statement after existing use', async () => {
    const filePath = await createTempFile(`use std::fs::File;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      useStatements: ['use crate::spire::commands;'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('use std::fs::File;'));
    assert.ok(content.includes('use crate::spire::commands;'));
  });

  test('adds use statement after attributes', async () => {
    const filePath = await createTempFile(`#![feature(test)]`);
    const hookup: RustModuleHookup = {
      path: filePath,
      useStatements: ['use tauri::command;'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('#![feature(test)]'));
    assert.ok(content.includes('use tauri::command;'));
  });

  test('skips existing use statements', async () => {
    const filePath = await createTempFile(`use crate::spire;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      useStatements: ['use crate::spire;'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'skipped');
  });
});

// ============================================================================
// Tauri Commands
// ============================================================================

describe('rust-module: Tauri commands', () => {
  test('injects command into generate_handler', async () => {
    const filePath = await createTempFile(`
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![existing_cmd])
        .run(tauri::generate_context!())
        .expect("error");
}
`);
    const hookup: RustModuleHookup = {
      path: filePath,
      tauriCommands: ['my_spire_cmd'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('tauri::generate_handler!['));
    assert.ok(content.includes('my_spire_cmd'));
    assert.ok(content.includes('existing_cmd'));
  });

  test('handles empty generate_handler', async () => {
    const filePath = await createTempFile(`
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!());
}
`);
    const hookup: RustModuleHookup = {
      path: filePath,
      tauriCommands: ['cmd1', 'cmd2'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    assert.ok(content.includes('cmd1'));
    assert.ok(content.includes('cmd2'));
  });

  test('skips existing commands', async () => {
    const filePath = await createTempFile(`
tauri::generate_handler![existing_cmd]
`);
    const hookup: RustModuleHookup = {
      path: filePath,
      tauriCommands: ['existing_cmd'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    // May be skipped if no other changes, or applied if just module/use checks run
    // The important thing is no duplicate command
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(/existing_cmd/g);
    assert.strictEqual(matches?.length, 1);
  });
});

// ============================================================================
// Full Integration
// ============================================================================

describe('rust-module: full integration', () => {
  test('handles complex Tauri lib.rs', async () => {
    const filePath = await createTempFile(`#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;', { name: 'commands', pub: true }],
      useStatements: ['use crate::spire::api;', 'use crate::commands::*;'],
      tauriCommands: ['spire_ping', 'spire_get_state'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    assert.strictEqual(result.status, 'applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Module declarations
    assert.ok(content.includes('mod spire;'));
    assert.ok(content.includes('pub mod commands;'));
    
    // Use statements
    assert.ok(content.includes('use crate::spire::api;'));
    assert.ok(content.includes('use crate::commands::*;'));
    assert.ok(content.includes('use tauri::Manager;'));
    
    // Tauri commands
    assert.ok(content.includes('spire_ping'));
    assert.ok(content.includes('spire_get_state'));
    assert.ok(content.includes('greet'));
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('rust-module: error handling', () => {
  test('returns error for non-existent file', async () => {
    const hookup: RustModuleHookup = {
      path: '/non/existent/file.rs',
      moduleDeclarations: ['mod spire;'],
    };

    const result = await applyRustModuleHookup('/non/existent/file.rs', hookup, createMockContext());

    assert.strictEqual(result.status, 'error');
    assert.ok(result.message?.includes('File not found'));
  });
});
