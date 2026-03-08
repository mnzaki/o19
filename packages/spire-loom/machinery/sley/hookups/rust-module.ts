/**
 * Rust Module Hookup 🦀
 *
 * Hooks into Rust lib.rs / main.rs files to:
 * - Add module declarations (mod spire;)
 * - Add use statements
 * - Inject Tauri commands into generate_handler![]
 * - Add Tauri plugin setup code
 * - Modify impl block methods
 * - Modify standalone functions
 *
 * > *"The spire module anchors the generated code to the source."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { 
  RustModuleHookup, 
  HookupResult, 
  RustModuleEntry, 
  RustModuleDeclaration, 
  RustVariableDeclaration, 
  HookupType,
  ClassModifications,
  MethodModifications,
} from './types.js';
import { 
  modifyMethod, 
  findClassBody,
  RustMethodConfig, 
  RustImplPattern,
  findMatchingBrace,
} from './method-modifier.js';

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
 */
export async function applyRustModuleHookup(
  filePath: string,
  hookup: RustModuleHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
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
      changes.push(`Added modules: ${hookup.moduleDeclarations.map(d => 
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
  
  // 5. Apply variable declarations (build.rs only)
  if (hookup.variables && hookup.variables.length > 0) {
    const varChanges = applyVariableDeclarations(filePath, content, hookup.variables);
    if (varChanges.modified) {
      content = varChanges.content;
      changes.push(`Updated variables: ${hookup.variables.map(v => v.name).join(', ')}`);
    }
    if (varChanges.errors.length > 0) {
      return {
        path: filePath,
        type: 'rust-module' as HookupType,
        status: 'error',
        message: `Variable conflicts: ${varChanges.errors.join('; ')}`,
      };
    }
  }
  
  // 6. Apply impl block modifications
  if (hookup.impls) {
    for (const [typeName, implMod] of Object.entries(hookup.impls)) {
      const result = applyImplModifications(content, typeName, implMod, context);
      if (result.modified) {
        content = result.content;
        changes.push(`Modified impl: ${typeName}`);
      }
    }
  }
  
  // 7. Apply standalone function modifications
  if (hookup.functions) {
    for (const [funcName, funcMod] of Object.entries(hookup.functions)) {
      const result = modifyMethod(content, funcName, funcMod, RustMethodConfig, context);
      if (result.modified) {
        content = result.content;
        changes.push(`Modified function: ${funcName}`);
      }
    }
  }
  
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
// Impl Block Modifications
// ============================================================================

function applyImplModifications(
  content: string,
  typeName: string,
  implMod: ClassModifications,
  context: GeneratorContext
): { content: string; modified: boolean } {
  let modified = false;
  
  // Find the impl block - need to handle "impl TypeName" and "impl Trait for TypeName"
  const implPattern = new RegExp(`impl(?:<[^>]+>)?\\s+(?:(\\w+)\\s+for\\s+)?${typeName}\\b`, 'g');
  const implMatch = implPattern.exec(content);
  
  if (!implMatch) {
    return { content, modified: false };
  }
  
  const implStart = implMatch.index;
  const afterDecl = content.substring(implStart);
  const braceMatch = afterDecl.match(/\s*\{/);
  
  if (!braceMatch) {
    return { content, modified: false };
  }
  
  const bodyStart = implStart + braceMatch.index! + braceMatch[0].length - 1;
  const bodyEnd = findMatchingBrace(content, bodyStart);
  
  if (bodyEnd === -1) {
    return { content, modified: false };
  }
  
  const beforeBody = content.substring(0, bodyStart + 1);
  let implBody = content.substring(bodyStart + 1, bodyEnd);
  const afterBody = content.substring(bodyEnd);
  let bodyModified = false;
  
  // Add associated items (consts, types) - treat as "fields"
  if (implMod.fields) {
    for (const field of implMod.fields) {
      const fieldDecl = typeof field === 'function'
        ? field(context, (context as any).data || {})
        : field;
      
      if (fieldDecl && !implBody.includes(fieldDecl.trim())) {
        implBody = `    ${fieldDecl}\n${implBody}`;
        bodyModified = true;
      }
    }
  }
  
  // Add new methods
  if (implMod.newMethods) {
    for (const method of implMod.newMethods) {
      const methodDecl = typeof method === 'function'
        ? method(context, (context as any).data || {})
        : method;
      
      if (methodDecl) {
        // Extract fn name for duplicate checking
        const fnNameMatch = methodDecl.match(/fn\s+(\w+)/);
        const fnName = fnNameMatch?.[1];
        
        if (fnName && !implBody.includes(`fn ${fnName}(`)) {
          implBody += `\n    ${methodDecl.trim()}\n`;
          bodyModified = true;
        }
      }
    }
  }
  
  // Modify existing methods
  if (implMod.methods) {
    for (const [methodName, methodMod] of Object.entries(implMod.methods)) {
      const result = modifyMethod(implBody, methodName, methodMod, RustMethodConfig, context);
      if (result.modified) {
        implBody = result.content;
        bodyModified = true;
      }
    }
  }
  
  if (bodyModified) {
    content = beforeBody + implBody + afterBody;
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Module Declarations
// ============================================================================

function parseModuleEntry(entry: RustModuleEntry): RustModuleDeclaration {
  if (typeof entry === 'string') {
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

function formatModuleDecl(decl: RustModuleDeclaration): string {
  let result = '';
  if (decl.path) {
    result += `#[path = "${decl.path}"]\n`;
  }
  result += decl.pub ? 'pub ' : '';
  result += `mod ${decl.name};`;
  return result;
}

function applyModuleDeclarations(
  content: string,
  declarations: RustModuleEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  
  for (const entry of declarations) {
    const decl = parseModuleEntry(entry);
    const declCode = formatModuleDecl(decl);
    
    // Check if module already declared
    const declRegex = new RegExp(`mod\\s+${decl.name}\\s*;`);
    if (declRegex.test(content)) {
      continue;
    }
    
    const lastModMatch = content.match(/mod\s+\w+\s*;\s*$/m);
    if (lastModMatch) {
      const insertPos = content.lastIndexOf(lastModMatch[0]) + lastModMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + declCode + content.slice(insertPos);
    } else {
      content += '\n' + declCode + '\n';
    }
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Use Statements
// ============================================================================

function applyUseStatements(
  content: string,
  useStatements: string[]
): { content: string; modified: boolean } {
  let modified = false;
  
  const useRegex = /^(use\s+[^;]+;\s*)+/m;
  const useMatch = content.match(useRegex);
  
  for (const useStmt of useStatements) {
    const normalized = useStmt.trim();
    if (!normalized.endsWith(';')) {
      normalized + ';';
    }
    
    if (content.includes(normalized)) {
      continue;
    }
    
    if (useMatch) {
      const lastUse = useMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastUse) + lastUse.length;
      content = content.slice(0, insertPos) + '\n' + normalized + content.slice(insertPos);
    } else {
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

function applyTauriCommands(
  content: string,
  commands: string[]
): { content: string; modified: boolean } {
  const handlerRegex = /tauri::generate_handler!\s*\[([^\]]*)\]/;
  const match = content.match(handlerRegex);
  
  if (!match) {
    return { content, modified: false };
  }
  
  let modified = false;
  let handlerContent = match[1];
  
  for (const cmd of commands) {
    const normalized = cmd.trim().replace(/,$/, '');
    
    if (handlerContent.includes(normalized)) {
      continue;
    }
    
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

function applyPluginInit(
  content: string,
  pluginInit: { fnName: string; stateType: string; setup: string }
): { content: string; modified: boolean } {
  const setupRegex = /\.setup\s*\(\s*\|[^|]+\|[^}]*\{([^}]*)\}\s*\)/;
  const match = content.match(setupRegex);
  
  if (!match) {
    return { content, modified: false };
  }
  
  const setupBody = match[1];
  
  if (setupBody.includes(pluginInit.fnName)) {
    return { content, modified: false };
  }
  
  const insertCode = `    ${pluginInit.setup}\n`;
  const newSetupBody = setupBody + insertCode;
  
  const newContent = content.replace(setupRegex, (full, body) => {
    return full.replace(body, newSetupBody);
  });
  
  return { content: newContent, modified: true };
}

// ============================================================================
// Variable Declarations (build.rs)
// ============================================================================

interface VariableDeclResult {
  content: string;
  modified: boolean;
  errors: string[];
}

function applyVariableDeclarations(
  filePath: string,
  content: string,
  variables: RustVariableDeclaration[]
): VariableDeclResult {
  let modified = false;
  const errors: string[] = [];
  
  for (const variable of variables) {
    const result = applySingleVariable(content, variable);
    
    if (result.error) {
      errors.push(result.error);
    } else if (result.modified) {
      content = result.content;
      modified = true;
    }
  }
  
  return { content, modified, errors };
}

interface SingleVarResult {
  content: string;
  modified: boolean;
  error?: string;
}

function applySingleVariable(
  content: string,
  variable: RustVariableDeclaration
): SingleVarResult {
  const { name, type, value, mutable = false, spireManaged = true, description } = variable;
  
  const mutKeyword = mutable ? 'mut ' : '';
  const newDecl = `let ${mutKeyword}${name}: ${type} = ${value};`;
  
  const spireMarkerStart = `// SPIRE-LOOM:VARIABLE:${name}`;
  const spireMarkerEnd = `// /SPIRE-LOOM:VARIABLE:${name}`;
  const spirePattern = new RegExp(
    `${escapeRegex(spireMarkerStart)}\s*\n?([^\n]*)\n?\s*${escapeRegex(spireMarkerEnd)}`,
    'g'
  );
  
  const spireMatch = content.match(spirePattern);
  
  if (spireMatch) {
    const newBlock = `${spireMarkerStart}\n${newDecl}\n${spireMarkerEnd}`;
    const newContent = content.replace(spirePattern, newBlock);
    return { content: newContent, modified: true };
  }
  
  const varPattern = new RegExp(
    `let\\s+(mut\\s+)?${escapeRegex(name)}\\s*:\\s*${escapeRegex(type)}\\s*=\\s*([^;]+);`,
    'g'
  );
  
  const existingMatch = content.match(varPattern);
  
  if (existingMatch) {
    const desc = description || `${name}: ${type}`;
    return {
      content,
      modified: false,
      error: `Variable '${desc}' exists with non-spire value. ` +
             `Manual code conflicts with spire hookup. ` +
             `Either remove the manual declaration or mark it as spire-managed.`,
    };
  }
  
  if (spireManaged) {
    const block = `\n${spireMarkerStart}\n${newDecl}\n${spireMarkerEnd}\n`;
    
    const mainMatch = content.match(/fn\s+main\s*\(\s*\)/);
    if (mainMatch) {
      const insertPos = content.indexOf(mainMatch[0]);
      const newContent = content.slice(0, insertPos) + block + content.slice(insertPos);
      return { content: newContent, modified: true };
    }
    
    return { content: content + block, modified: true };
  } else {
    const line = `${newDecl}\n`;
    return { content: content + '\n' + line, modified: true };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
