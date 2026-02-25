/**
 * Rust Module Hookup 🦀
 *
 * Hooks into Rust lib.rs / main.rs files to:
 * - Add module declarations (mod spire;)
 * - Add use statements
 * - Inject Tauri commands into generate_handler![]
 * - Add Tauri plugin setup code
 *
 * > *"The spire module anchors the generated code to the source."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { RustModuleHookup, HookupResult, RustModuleEntry, RustModuleDeclaration, HookupType } from './types.js';

// ============================================================================
// Types
// ============================================================================

interface ParsedModuleDecl {
  isPub: boolean;
  name: string;
  path?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Apply Rust module hookup to lib.rs or main.rs.
 *
 * Handles:
 * 1. Module declarations (with #[path] attribute support)
 * 2. Use statements
 * 3. Tauri generate_handler![] command injection
 * 4. Tauri plugin setup code injection
 */
export async function applyRustModuleHookup(
  filePath: string,
  hookup: RustModuleHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  // Ensure file exists
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'rust-module' as HookupType,
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // 1. Apply module declarations
  if (hookup.moduleDeclarations && hookup.moduleDeclarations.length > 0) {
    const declChanges = applyModuleDeclarations(content, hookup.moduleDeclarations);
    if (declChanges.modified) {
      content = declChanges.content;
      changes.push(`Added module declarations: ${hookup.moduleDeclarations.map(d => 
        typeof d === 'string' ? d : d.name
      ).join(', ')}`);
    }
  }
  
  // 2. Apply use statements
  if (hookup.useStatements && hookup.useStatements.length > 0) {
    const useChanges = applyUseStatements(content, hookup.useStatements);
    if (useChanges.modified) {
      content = useChanges.content;
      changes.push(`Added use statements: ${hookup.useStatements.join(', ')}`);
    }
  }
  
  // 3. Apply Tauri commands
  if (hookup.tauriCommands && hookup.tauriCommands.length > 0) {
    const cmdChanges = applyTauriCommands(content, hookup.tauriCommands);
    if (cmdChanges.modified) {
      content = cmdChanges.content;
      changes.push(`Added Tauri commands: ${hookup.tauriCommands.length} commands`);
    }
  }
  
  // 4. Apply Tauri plugin init
  if (hookup.pluginInit) {
    const initChanges = applyPluginInit(content, hookup.pluginInit);
    if (initChanges.modified) {
      content = initChanges.content;
      changes.push(`Added plugin init: ${hookup.pluginInit.fnName}`);
    }
  }
  
  // Write if modified
  const modified = content !== originalContent;
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'rust-module' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Updated ${path.basename(filePath)}: ${changes.join('; ')}`
      : `No changes needed for ${path.basename(filePath)}`,
  };
}

// ============================================================================
// Module Declarations
// ============================================================================

/**
 * Parse a module declaration entry to structured form.
 */
function parseModuleEntry(entry: RustModuleEntry): RustModuleDeclaration {
  if (typeof entry === 'string') {
    // Parse "pub mod name;" or "mod name;" or "#[path=..."] pub mod name;"
    const pubMatch = entry.match(/pub\s+mod\s+(\w+)/);
    const modMatch = entry.match(/mod\s+(\w+)/);
    const pathMatch = entry.match(/#\[path\s*=\s*"([^"]+)"\]/);
    
    const name = (pubMatch || modMatch)?.[1] || '';
    return {
      name,
      path: pathMatch?.[1],
      pub: !!pubMatch
    };
  }
  return entry;
}

/**
 * Format a module declaration to code.
 */
function formatModuleDecl(decl: RustModuleDeclaration): string {
  let result = '';
  if (decl.path) {
    result += `#[path = "${decl.path}"]\n`;
  }
  result += decl.pub ? 'pub ' : '';
  result += `mod ${decl.name};`;
  return result;
}

/**
 * Apply module declarations to content.
 */
function applyModuleDeclarations(
  content: string,
  declarations: RustModuleEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  
  for (const entry of declarations) {
    const decl = parseModuleEntry(entry);
    const declCode = formatModuleDecl(decl);
    
    // Check if already exists
    const declRegex = new RegExp(`mod\\s+${decl.name}\\s*;`);
    if (declRegex.test(content)) {
      // Module already declared, skip
      continue;
    }
    
    // Find insertion point: after last mod declaration, or at end
    const lastModMatch = content.match(/mod\s+\w+\s*;\s*$/m);
    if (lastModMatch) {
      const insertPos = content.lastIndexOf(lastModMatch[0]) + lastModMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + declCode + content.slice(insertPos);
    } else {
      // No existing mod declarations, add at end
      content += '\n' + declCode + '\n';
    }
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Use Statements
// ============================================================================

/**
 * Apply use statements to content.
 */
function applyUseStatements(
  content: string,
  useStatements: string[]
): { content: string; modified: boolean } {
  let modified = false;
  
  // Find the use section
  const useRegex = /^(use\s+[^;]+;\s*)+/m;
  const useMatch = content.match(useRegex);
  
  for (const useStmt of useStatements) {
    const normalized = useStmt.trim();
    if (!normalized.endsWith(';')) {
      normalized + ';';
    }
    
    // Check if already exists
    if (content.includes(normalized)) {
      continue;
    }
    
    if (useMatch) {
      // Insert after last use statement
      const lastUse = useMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastUse) + lastUse.length;
      content = content.slice(0, insertPos) + '\n' + normalized + content.slice(insertPos);
    } else {
      // No use statements, add after any #![attributes] or at start
      const attrMatch = content.match(/^(#!?\[[^\]]+\]\s*)+/);
      if (attrMatch) {
        const insertPos = attrMatch[0].length;
        content = content.slice(0, insertPos) + '\n' + normalized + '\n' + content.slice(insertPos);
      } else {
        content = normalized + '\n' + content;
      }
    }
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Tauri Commands
// ============================================================================

/**
 * Apply Tauri commands to generate_handler![] macro.
 */
function applyTauriCommands(
  content: string,
  commands: string[]
): { content: string; modified: boolean } {
  // Find generate_handler![] macro
  const handlerRegex = /tauri::generate_handler!\s*\[([^\]]*)\]/;
  const match = content.match(handlerRegex);
  
  if (!match) {
    // No generate_handler found - that's OK, might not be a Tauri file
    return { content, modified: false };
  }
  
  let modified = false;
  let handlerContent = match[1];
  
  for (const cmd of commands) {
    const normalized = cmd.trim().replace(/,$/, '');
    
    // Check if already in handler
    if (handlerContent.includes(normalized)) {
      continue;
    }
    
    // Add to handler (prepend for cleaner diffs)
    if (handlerContent.trim()) {
      handlerContent = '\n    ' + normalized + ',' + handlerContent;
    } else {
      handlerContent = '\n    ' + normalized + ',\n  ';
    }
    modified = true;
  }
  
  if (modified) {
    content = content.replace(handlerRegex, `tauri::generate_handler![${handlerContent}]`);
  }
  
  return { content, modified };
}

// ============================================================================
// Plugin Init
// ============================================================================

/**
 * Apply Tauri plugin initialization to .setup() closure.
 */
function applyPluginInit(
  content: string,
  pluginInit: { fnName: string; stateType: string; setup: string }
): { content: string; modified: boolean } {
  // Find .setup() closure
  const setupRegex = /\.setup\s*\(\s*\|[^|]+\|[^}]*\{([^}]*)\}\s*\)/;
  const match = content.match(setupRegex);
  
  if (!match) {
    // No setup found
    return { content, modified: false };
  }
  
  const setupBody = match[1];
  
  // Check if already initialized
  if (setupBody.includes(pluginInit.fnName)) {
    return { content, modified: false };
  }
  
  // Insert setup code at end of setup body
  const insertCode = `    ${pluginInit.setup}\n`;
  const newSetupBody = setupBody + insertCode;
  
  const newContent = content.replace(setupRegex, (full, body) => {
    return full.replace(body, newSetupBody);
  });
  
  return { content: newContent, modified: true };
}
