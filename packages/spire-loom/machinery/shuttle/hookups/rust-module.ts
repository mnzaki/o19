/**
 * Rust Module Hookup Handler
 *
 * Applies Rust module (lib.rs / main.rs) hookups declaratively.
 */

import * as fs from 'node:fs';
import type { GeneratorContext } from '../../heddles/index.js';
import type { RustModuleHookup, HookupResult } from './types.js';
import { createRustMarkers, ensureFileBlock, hasBlock } from '../markers.js';

/**
 * Apply Rust module hookup.
 */
export function applyRustModuleHookup(
  filePath: string,
  spec: RustModuleHookup,
  context: GeneratorContext
): HookupResult {
  const changes: string[] = [];
  
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'rust-module',
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  // Handle module declarations
  if (spec.moduleDeclarations) {
    for (const mod of spec.moduleDeclarations) {
      const applied = applyModuleDeclaration(filePath, mod);
      if (applied) {
        changes.push(`Added module: ${typeof mod === 'string' ? mod : mod.name}`);
      }
    }
  }
  
  // Handle use statements
  if (spec.useStatements) {
    for (const useStmt of spec.useStatements) {
      const applied = applyUseStatement(filePath, useStmt);
      if (applied) {
        changes.push(`Added use: ${useStmt}`);
      }
    }
  }
  
  // Handle Tauri plugin init
  if (spec.pluginInit) {
    const applied = applyPluginInit(filePath, spec.pluginInit, spec.tauriCommands || []);
    if (applied) {
      changes.push('Added Tauri plugin initialization');
    }
  }
  
  return {
    path: filePath,
    type: 'rust-module',
    status: changes.length > 0 ? 'applied' : 'skipped',
    message: changes.length > 0 ? changes.join(', ') : 'No changes needed',
  };
}

/**
 * Apply a single module declaration.
 */
function applyModuleDeclaration(
  filePath: string,
  mod: string | RustModuleHookup['moduleDeclarations'][number]
): boolean {
  let modName: string;
  let modPath: string | undefined;
  let isPub = false;
  
  if (typeof mod === 'string') {
    modName = mod;
  } else {
    modName = mod.name;
    modPath = mod.path;
    isPub = mod.pub ?? false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already declared
  const modPattern = new RegExp(`\\b${isPub ? 'pub\\s+' : ''}mod\\s+${modName}\\s*;`);
  if (modPattern.test(content)) {
    return false;
  }
  
  // Build declaration
  let declaration = '';
  if (modPath) {
    declaration += `#[path = "${modPath}"]\n`;
  }
  declaration += `${isPub ? 'pub ' : ''}mod ${modName};`;
  
  // Append to file
  fs.writeFileSync(filePath, content + '\n' + declaration + '\n', 'utf-8');
  
  return true;
}

/**
 * Apply a use statement.
 */
function applyUseStatement(filePath: string, useStmt: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Normalize for comparison
  const normalizedUse = useStmt.trim();
  const normalizedContent = content.replace(/\s+/g, ' ');
  
  // Check if already present
  if (normalizedContent.includes(normalizedUse)) {
    return false;
  }
  
  // Find insertion point (after existing use statements, or at top)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('use ')) {
      insertIndex = i + 1;
    }
  }
  
  lines.splice(insertIndex, 0, useStmt);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  
  return true;
}

/**
 * Apply Tauri plugin initialization.
 */
function applyPluginInit(
  filePath: string,
  pluginInit: RustModuleHookup['pluginInit'],
  commands: string[]
): boolean {
  if (!pluginInit) return false;
  
  const { fnName, stateType, setup } = pluginInit;
  const content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Check if already initialized
  if (content.includes(fnName)) {
    return false;
  }
  
  // Add plugin initialization function
  const initFn = buildPluginInitFunction(fnName, stateType, setup, commands);
  
  fs.writeFileSync(filePath, content + '\n' + initFn + '\n', 'utf-8');
  modified = true;
  
  return modified;
}

/**
 * Build the plugin initialization function.
 */
function buildPluginInitFunction(
  fnName: string,
  stateType: string,
  setup: string,
  commands: string[]
): string {
  const commandList = commands.length > 0 
    ? commands.map(c => `      ${c},`).join('\n')
    : '';
  
  return `
#[tauri::command]
pub fn ${fnName}() -> tauri::plugin::TauriPlugin<tauri::Wry> {
  tauri::plugin::Builder::new("${fnName.replace(/^init_/, '').replace(/_plugin$/, '')}")
    .invoke_handler(tauri::generate_handler![
${commandList}
    ])
    .setup(|app| {
${setup.split('\n').map(l => '      ' + l).join('\n')}
      Ok(())
    })
    .build()
}
`;
}
