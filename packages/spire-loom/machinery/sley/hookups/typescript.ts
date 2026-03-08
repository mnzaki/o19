/**
 * TypeScript Hookup 📘
 *
 * Hooks into TypeScript/JavaScript files to:
 * - Add import statements
 * - Add export statements (for index files)
 * - Modify class methods (prepend/append code)
 * - Add new methods to classes
 * - Modify standalone functions
 *
 * > *"The bridge between generated and hand-written TypeScript."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { 
  TypeScriptIndexHookup, 
  TypeScriptFileHookup,
  HookupResult, 
  TypeScriptExportEntry, 
  TypeScriptImportEntry, 
  TypeScriptExport, 
  TypeScriptImport, 
  HookupType,
  ClassModifications,
  MethodModifications,
} from './types.js';
import { 
  modifyMethod, 
  findClassBody,
  TypeScriptMethodConfig, 
  TypeScriptClassPattern,
} from './method-modifier.js';

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Apply TypeScript hookup (index or regular file).
 * Dispatches to appropriate handler based on path.
 */
export async function applyTypeScriptHookup(
  filePath: string,
  hookup: TypeScriptIndexHookup | TypeScriptFileHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  // Check if it's an index file (simple exports/imports only)
  const isIndexFile = /index\.(ts|js)$/.test(filePath.toLowerCase());
  
  if (isIndexFile && !('classes' in hookup || 'functions' in hookup)) {
    return applyTypeScriptIndexHookup(filePath, hookup as TypeScriptIndexHookup, context);
  }
  
  return applyTypeScriptFileHookup(filePath, hookup as TypeScriptFileHookup, context);
}

/**
 * Apply TypeScript index file hookup (index.ts / index.js).
 *
 * Handles simple export/import statements only.
 */
async function applyTypeScriptIndexHookup(
  filePath: string,
  hookup: TypeScriptIndexHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'typescript' as HookupType,
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Apply imports
  if (hookup.imports && hookup.imports.length > 0) {
    const importChanges = applyImports(content, hookup.imports);
    if (importChanges.modified) {
      content = importChanges.content;
      changes.push(`Added imports: ${hookup.imports.length} imports`);
    }
  }
  
  // Apply exports
  if (hookup.exports && hookup.exports.length > 0) {
    const exportChanges = applyExports(content, hookup.exports);
    if (exportChanges.modified) {
      content = exportChanges.content;
      changes.push(`Added exports: ${hookup.exports.length} exports`);
    }
  }
  
  const modified = content !== originalContent;
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'typescript' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Updated ${path.basename(filePath)}: ${changes.join('; ')}`
      : `No changes needed for ${path.basename(filePath)}`,
  };
}

/**
 * Apply TypeScript file hookup with full class/method support.
 */
async function applyTypeScriptFileHookup(
  filePath: string,
  hookup: TypeScriptFileHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'typescript-file' as HookupType,
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Apply imports
  if (hookup.imports && hookup.imports.length > 0) {
    const importChanges = applyImports(content, hookup.imports);
    if (importChanges.modified) {
      content = importChanges.content;
      changes.push(`Added ${hookup.imports.length} imports`);
    }
  }
  
  // Apply class modifications
  if (hookup.classes) {
    for (const [className, classMod] of Object.entries(hookup.classes)) {
      const result = applyClassModifications(content, className, classMod, context);
      if (result.modified) {
        content = result.content;
        changes.push(`Modified class: ${className}`);
      }
    }
  }
  
  // Apply standalone function modifications
  if (hookup.functions) {
    for (const [funcName, funcMod] of Object.entries(hookup.functions)) {
      const result = modifyMethod(content, funcName, funcMod, TypeScriptMethodConfig, context);
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
    type: 'typescript-file' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Updated ${path.basename(filePath)}: ${changes.join(', ')}`
      : `No changes needed for ${path.basename(filePath)}`,
  };
}

// ============================================================================
// Class Modifications
// ============================================================================

function applyClassModifications(
  content: string,
  className: string,
  classMod: ClassModifications,
  context: GeneratorContext
): { content: string; modified: boolean } {
  let modified = false;
  
  const classInfo = findClassBody(content, className, TypeScriptClassPattern);
  if (!classInfo) {
    return { content, modified: false };
  }
  
  let classBody = classInfo.body;
  let bodyModified = false;
  
  // Add fields
  if (classMod.fields) {
    for (const field of classMod.fields) {
      const fieldDecl = typeof field === 'function'
        ? field(context, (context as any).data || {})
        : field;
      
      if (fieldDecl && !classBody.includes(fieldDecl.trim())) {
        // Add field at start of class body
        classBody = `    ${fieldDecl}\n${classBody}`;
        bodyModified = true;
      }
    }
  }
  
  // Add new methods
  if (classMod.newMethods) {
    for (const method of classMod.newMethods) {
      const methodDecl = typeof method === 'function'
        ? method(context, (context as any).data || {})
        : method;
      
      if (methodDecl) {
        // Extract method name for duplicate checking
        const methodNameMatch = methodDecl.match(/(\w+)\s*[\(\=]/);
        const methodName = methodNameMatch?.[1];
        
        if (methodName && !classBody.includes(`${methodName}(`)) {
          classBody += `\n    ${methodDecl.trim()}\n`;
          bodyModified = true;
        }
      }
    }
  }
  
  // Modify existing methods
  if (classMod.methods) {
    for (const [methodName, methodMod] of Object.entries(classMod.methods)) {
      const result = modifyMethod(classBody, methodName, methodMod, TypeScriptMethodConfig, context);
      if (result.modified) {
        classBody = result.content;
        bodyModified = true;
      }
    }
  }
  
  if (bodyModified) {
    content = classInfo.beforeBody + classBody + classInfo.afterBody;
    modified = true;
  }
  
  return { content, modified };
}

// ============================================================================
// Import Handling (shared)
// ============================================================================

interface ParsedImport {
  source: string;
  namespace?: string;
  default?: string;
  names: string[];
  typeOnly: boolean;
}

function parseImportEntry(entry: TypeScriptImportEntry): ParsedImport {
  if (typeof entry === 'string') {
    return parseImportLine(entry);
  }
  return {
    source: entry.source,
    namespace: entry.namespace,
    default: entry.default,
    names: entry.names || [],
    typeOnly: entry.typeOnly || false,
  };
}

function parseImportLine(line: string): ParsedImport {
  const trimmed = line.trim();
  
  const typeOnly = trimmed.startsWith('import type ');
  const importBody = typeOnly ? trimmed.slice(12) : trimmed.slice(7);
  
  const namespaceMatch = importBody.match(/^\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?$/);
  if (namespaceMatch) {
    return { source: namespaceMatch[2], namespace: namespaceMatch[1], names: [], typeOnly };
  }
  
  const defaultMatch = importBody.match(/^(\w+)\s+from\s+['"]([^'"]+)['"];?$/);
  if (defaultMatch) {
    return { source: defaultMatch[2], default: defaultMatch[1], names: [], typeOnly };
  }
  
  const namedMatch = importBody.match(/^\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/);
  if (namedMatch) {
    const names = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
    return { source: namedMatch[2], names, typeOnly };
  }
  
  const sideEffectMatch = importBody.match(/^['"]([^'"]+)['"];?$/);
  if (sideEffectMatch) {
    return { source: sideEffectMatch[1], names: [], typeOnly };
  }
  
  return { source: '', names: [], typeOnly };
}

function formatImport(parsed: ParsedImport): string {
  if (parsed.namespace) {
    const typeKeyword = parsed.typeOnly ? 'type ' : '';
    return `import ${typeKeyword}* as ${parsed.namespace} from '${parsed.source}';`;
  }
  
  if (parsed.default && parsed.names.length > 0) {
    const typeKeyword = parsed.typeOnly ? 'type ' : '';
    return `import ${typeKeyword}${parsed.default}, { ${parsed.names.join(', ')} } from '${parsed.source}';`;
  }
  
  if (parsed.default) {
    const typeKeyword = parsed.typeOnly ? 'type ' : '';
    return `import ${typeKeyword}${parsed.default} from '${parsed.source}';`;
  }
  
  if (parsed.names.length > 0) {
    const typeKeyword = parsed.typeOnly ? 'type ' : '';
    return `import ${typeKeyword}{ ${parsed.names.join(', ')} } from '${parsed.source}';`;
  }
  
  return `import '${parsed.source}';`;
}

function applyImports(
  content: string,
  imports: TypeScriptImportEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  const existingImports = parseExistingImports(content);
  
  for (const entry of imports) {
    const parsed = parseImportEntry(entry);
    
    if (hasImport(existingImports, parsed)) {
      continue;
    }
    
    const importLine = formatImport(parsed);
    
    const importRegex = /^(import\s+[^;]+;\s*)+/m;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      const lastImport = importMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
    } else {
      content = importLine + '\n' + content;
    }
    
    existingImports.push(parsed);
    modified = true;
  }
  
  return { content, modified };
}

function parseExistingImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const importRegex = /^import\s+[^;]+;/gm;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(parseImportLine(match[0]));
  }
  
  return imports;
}

function hasImport(existing: ParsedImport[], parsed: ParsedImport): boolean {
  return existing.some(imp => 
    imp.source === parsed.source &&
    imp.namespace === parsed.namespace &&
    imp.default === parsed.default &&
    JSON.stringify(imp.names.sort()) === JSON.stringify(parsed.names.sort()) &&
    imp.typeOnly === parsed.typeOnly
  );
}

// ============================================================================
// Export Handling (index files only)
// ============================================================================

interface ParsedExport {
  source: string;
  star: boolean;
  names: string[];
}

function parseExportEntry(entry: TypeScriptExportEntry): ParsedExport {
  if (typeof entry === 'string') {
    return parseExportLine(entry);
  }
  return {
    source: entry.source,
    star: entry.star || false,
    names: entry.names || [],
  };
}

function parseExportLine(line: string): ParsedExport {
  const trimmed = line.trim();
  
  const starMatch = trimmed.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"];?$/);
  if (starMatch) {
    return { source: starMatch[1], star: true, names: [] };
  }
  
  const namedMatch = trimmed.match(/^export\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/);
  if (namedMatch) {
    const names = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
    return { source: namedMatch[2], star: false, names };
  }
  
  return { source: '', star: false, names: [] };
}

function formatExport(parsed: ParsedExport): string {
  if (parsed.star) {
    return `export * from '${parsed.source}';`;
  }
  
  if (parsed.names.length > 0) {
    return `export { ${parsed.names.join(', ')} } from '${parsed.source}';`;
  }
  
  return `export * from '${parsed.source}';`;
}

function applyExports(
  content: string,
  exports: TypeScriptExportEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  const existingExports = parseExistingExports(content);
  
  for (const entry of exports) {
    const parsed = parseExportEntry(entry);
    
    if (!parsed.source && !parsed.star && parsed.names.length === 0) {
      continue;
    }
    
    if (hasExport(existingExports, parsed)) {
      continue;
    }
    
    const exportLine = formatExport(parsed);
    
    const exportRegex = /^(export\s+[^;]+;\s*)+/m;
    const exportMatch = content.match(exportRegex);
    
    if (exportMatch) {
      const lastExport = exportMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastExport) + lastExport.length;
      content = content.slice(0, insertPos) + '\n' + exportLine + content.slice(insertPos);
    } else {
      const importRegex = /^(import\s+[^;]+;\s*)+/m;
      const importMatch = content.match(importRegex);
      
      if (importMatch) {
        const lastImport = importMatch[0].trim().split('\n').pop() || '';
        const insertPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPos) + '\n\n' + exportLine + content.slice(insertPos);
      } else {
        content = content.trimEnd() + '\n' + exportLine + '\n';
      }
    }
    
    existingExports.push(parsed);
    modified = true;
  }
  
  return { content, modified };
}

function parseExistingExports(content: string): ParsedExport[] {
  const exports: ParsedExport[] = [];
  const exportRegex = /^export\s+[^;]+;/gm;
  let match;
  
  while ((match = exportRegex.exec(content)) !== null) {
    const parsed = parseExportLine(match[0]);
    if (parsed.source) {
      exports.push(parsed);
    }
  }
  
  return exports;
}

function hasExport(existing: ParsedExport[], parsed: ParsedExport): boolean {
  return existing.some(exp => 
    exp.source === parsed.source &&
    exp.star === parsed.star &&
    JSON.stringify(exp.names.sort()) === JSON.stringify(parsed.names.sort())
  );
}
