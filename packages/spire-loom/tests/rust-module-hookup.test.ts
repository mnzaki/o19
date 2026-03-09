/**
 * Tests for rust-module hookup handler
 *
 * Verifies APP-010: RustModuleHookup requirements
 * - Module declarations (mod spire;)
 * - Use statements
 * - Tauri generate_handler![] injection
 * - Plugin setup code
 */

import { test, describe } from 'vitest';
import { expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { applyRustModuleHookup } from '../machinery/sley/hookups/rust-module.js';
import type { GeneratorContext } from '../machinery/heddles/index.js';
import type { RustModuleHookup } from '../machinery/sley/hookups/types.js';

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

    expect(result.status).toBe('applied');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content.includes('mod spire;')).toBe(true);
  });

  test('adds pub mod declaration', async () => {
    const filePath = await createTempFile(`mod existing;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['pub mod spire;'],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content.includes('mod existing;')).toBe(true);
    expect(content.includes('pub mod spire;')).toBe(true);
  });

  test('adds module with path attribute', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: [{ name: 'spire', path: 'src/spire.rs', pub: true }],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content.includes('#[path = "src/spire.rs"]')).toBe(true);
    expect(content.includes('pub mod spire;')).toBe(true);
  });

  test('skips existing modules', async () => {
    const filePath = await createTempFile(`mod spire;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    expect(result.status).toBe('skipped');
  });

  test('handles multiple module declarations', async () => {
    const filePath = await createTempFile(`// Empty`);
    const hookup: RustModuleHookup = {
      path: filePath,
      moduleDeclarations: ['mod spire;', 'pub mod commands;', { name: 'utils', pub: false }],
    };

    await applyRustModuleHookup(filePath, hookup, createMockContext());
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content.includes('mod spire;')).toBe(true);
    expect(content.includes('pub mod commands;')).toBe(true);
    expect(content.includes('mod utils;')).toBe(true);
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

    expect(content.includes('use std::fs::File;')).toBe(true);
    expect(content.includes('use crate::spire::commands;')).toBe(true);
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
    expect(content.includes('use tauri::command;')).toBe(true);
  });

  test('skips existing use statements', async () => {
    const filePath = await createTempFile(`use crate::spire;`);
    const hookup: RustModuleHookup = {
      path: filePath,
      useStatements: ['use crate::spire;'],
    };

    const result = await applyRustModuleHookup(filePath, hookup, createMockContext());
    expect(result.status).toBe('skipped');
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

    expect(content.includes('tauri::generate_handler![')).toBe(true);
    expect(content.includes('my_spire_cmd')).toBe(true);
    expect(content.includes('existing_cmd')).toBe(true);
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

    expect(content.includes('cmd1')).toBe(true);
    expect(content.includes('cmd2')).toBe(true);
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
    expect(matches?.length).toBe(1);
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
    expect(result.status).toBe('applied');

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Module declarations
    expect(content.includes('mod spire;')).toBe(true);
    expect(content.includes('pub mod commands;')).toBe(true);
    
    // Use statements
    expect(content.includes('use crate::spire::api;')).toBe(true);
    expect(content.includes('use crate::commands::*;')).toBe(true);
    expect(content.includes('use tauri::Manager;')).toBe(true);
    
    // Tauri commands
    expect(content.includes('spire_ping')).toBe(true);
    expect(content.includes('spire_get_state')).toBe(true);
    expect(content.includes('greet')).toBe(true);
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

    expect(result.status).toBe('error');
    expect(result.message?.includes('File not found')).toBe(true);
  });
});
