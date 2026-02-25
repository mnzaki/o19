/**
 * TypeScript Index Hookup 📘
 *
 * Hooks into TypeScript/JavaScript index files to:
 * - Add export statements (star exports, named exports)
 * - Add import statements
 * - Maintain clean re-export patterns for spire integration
 *
 * > *"The index file gathers and exposes what the spire generates."*
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { TypeScriptIndexHookup, HookupResult, TypeScriptExportEntry, TypeScriptImportEntry, TypeScriptExport, TypeScriptImport, HookupType } from './types.js';

// ============================================================================
// Types
// ============================================================================

interface ParsedExport {
  source: string;
  star: boolean;
  names: string[];
}

interface ParsedImport {
  source: string;
  namespace?: string;
  default?: string;
  names: string[];
  typeOnly: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Apply TypeScript index hookup to index.ts or index.js.
 *
 * Handles:
 * 1. Export statements (star exports, named exports)
 * 2. Import statements
 */
export async function applyTypeScriptHookup(
  filePath: string,
  hookup: TypeScriptIndexHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  const changes: string[] = [];
  
  // Ensure file exists
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
  
  // 1. Apply imports
  if (hookup.imports && hookup.imports.length > 0) {
    const importChanges = applyImports(content, hookup.imports);
    if (importChanges.modified) {
      content = importChanges.content;
      changes.push(`Added imports: ${hookup.imports.length} imports`);
    }
  }
  
  // 2. Apply exports
  if (hookup.exports && hookup.exports.length > 0) {
    const exportChanges = applyExports(content, hookup.exports);
    if (exportChanges.modified) {
      content = exportChanges.content;
      changes.push(`Added exports: ${hookup.exports.length} exports`);
    }
  }
  
  // Write if modified
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

// ============================================================================
// Import Handling
// ============================================================================

/**
 * Parse an import entry to structured form.
 */
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

/**
 * Parse an import line to structured form.
 */
function parseImportLine(line: string): ParsedImport {
  const trimmed = line.trim();
  
  // Check for type-only import
  const typeOnly = trimmed.startsWith('import type ');
  const importBody = typeOnly ? trimmed.slice(12) : trimmed.slice(7);
  
  // import * as X from '...'
  const namespaceMatch = importBody.match(/^\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?$/);
  if (namespaceMatch) {
    return { source: namespaceMatch[2], namespace: namespaceMatch[1], names: [], typeOnly };
  }
  
  // import X from '...' (default)
  const defaultMatch = importBody.match(/^(\w+)\s+from\s+['"]([^'"]+)['"];?$/);
  if (defaultMatch) {
    return { source: defaultMatch[2], default: defaultMatch[1], names: [], typeOnly };
  }
  
  // import { X, Y } from '...' (named)
  const namedMatch = importBody.match(/^\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/);
  if (namedMatch) {
    const names = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
    return { source: namedMatch[2], names, typeOnly };
  }
  
  // import '...' (side effect) or fallback
  const sideEffectMatch = importBody.match(/^['"]([^'"]+)['"];?$/);
  if (sideEffectMatch) {
    return { source: sideEffectMatch[1], names: [], typeOnly };
  }
  
  return { source: '', names: [], typeOnly };
}

/**
 * Format a parsed import to code.
 */
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
  
  // Side effect import
  return `import '${parsed.source}';`;
}

/**
 * Apply imports to content.
 */
function applyImports(
  content: string,
  imports: TypeScriptImportEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  const existingImports = parseExistingImports(content);
  
  for (const entry of imports) {
    const parsed = parseImportEntry(entry);
    
    // Check if already exists
    if (hasImport(existingImports, parsed)) {
      continue;
    }
    
    const importLine = formatImport(parsed);
    
    // Find insertion point: after last import, or at start
    const importRegex = /^(import\s+[^;]+;\s*)+/m;
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      // Insert after last import
      const lastImport = importMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, insertPos) + '\n' + importLine + content.slice(insertPos);
    } else {
      // No imports, add at start
      content = importLine + '\n' + content;
    }
    
    existingImports.push(parsed);
    modified = true;
  }
  
  return { content, modified };
}

/**
 * Parse existing imports from content.
 */
function parseExistingImports(content: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const importRegex = /^import\s+[^;]+;/gm;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(parseImportLine(match[0]));
  }
  
  return imports;
}

/**
 * Check if an import already exists.
 */
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
// Export Handling
// ============================================================================

/**
 * Parse an export entry to structured form.
 */
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

/**
 * Parse an export line to structured form.
 */
function parseExportLine(line: string): ParsedExport {
  const trimmed = line.trim();
  
  // export * from '...'
  const starMatch = trimmed.match(/^export\s+\*\s+from\s+['"]([^'"]+)['"];?$/);
  if (starMatch) {
    return { source: starMatch[1], star: true, names: [] };
  }
  
  // export { X, Y } from '...' (re-export)
  const namedMatch = trimmed.match(/^export\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/);
  if (namedMatch) {
    const names = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
    return { source: namedMatch[2], star: false, names };
  }
  
  // export { X, Y } (local export - not a re-export, ignore source)
  const localMatch = trimmed.match(/^export\s+\{/);
  if (localMatch) {
    return { source: '', star: false, names: [] };
  }
  
  return { source: '', star: false, names: [] };
}

/**
 * Format a parsed export to code.
 */
function formatExport(parsed: ParsedExport): string {
  if (parsed.star) {
    return `export * from '${parsed.source}';`;
  }
  
  if (parsed.names.length > 0) {
    return `export { ${parsed.names.join(', ')} } from '${parsed.source}';`;
  }
  
  return `export * from '${parsed.source}';`;
}

/**
 * Apply exports to content.
 */
function applyExports(
  content: string,
  exports: TypeScriptExportEntry[]
): { content: string; modified: boolean } {
  let modified = false;
  const existingExports = parseExistingExports(content);
  
  for (const entry of exports) {
    const parsed = parseExportEntry(entry);
    
    // Skip empty/invalid exports
    if (!parsed.source && !parsed.star && parsed.names.length === 0) {
      continue;
    }
    
    // Check if already exists
    if (hasExport(existingExports, parsed)) {
      continue;
    }
    
    const exportLine = formatExport(parsed);
    
    // Find insertion point: after last export statement, or at end
    const exportRegex = /^(export\s+[^;]+;\s*)+/m;
    const exportMatch = content.match(exportRegex);
    
    if (exportMatch) {
      // Insert after last export
      const lastExport = exportMatch[0].trim().split('\n').pop() || '';
      const insertPos = content.indexOf(lastExport) + lastExport.length;
      content = content.slice(0, insertPos) + '\n' + exportLine + content.slice(insertPos);
    } else {
      // No exports, add at end (or after imports if any)
      const importRegex = /^(import\s+[^;]+;\s*)+/m;
      const importMatch = content.match(importRegex);
      
      if (importMatch) {
        // Add after imports
        const lastImport = importMatch[0].trim().split('\n').pop() || '';
        const insertPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, insertPos) + '\n\n' + exportLine + content.slice(insertPos);
      } else {
        // Add at end
        content = content.trimEnd() + '\n' + exportLine + '\n';
      }
    }
    
    existingExports.push(parsed);
    modified = true;
  }
  
  return { content, modified };
}

/**
 * Parse existing exports from content.
 */
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

/**
 * Check if an export already exists.
 */
function hasExport(existing: ParsedExport[], parsed: ParsedExport): boolean {
  return existing.some(exp => 
    exp.source === parsed.source &&
    exp.star === parsed.star &&
    JSON.stringify(exp.names.sort()) === JSON.stringify(parsed.names.sort())
  );
}
