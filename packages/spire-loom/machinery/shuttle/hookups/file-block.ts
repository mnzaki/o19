/**
 * File Block Hookup 📄
 *
 * Generic file block insertion hookup - the patch system folded into hookups.
 * Renders a template and inserts it as a marked block in the target file.
 *
 * > *"Every patch is a hookup, every hookup is a declaration."*
 *
 * @example
 * ```typescript
 * hookups: [{
 *   path: '{packageDir}/src/db.rs',
 *   language: 'rust',
 *   markers: { start: '// SPIRE-LOOM:db-setup', end: '// /SPIRE-LOOM:db-setup' },
 *   template: 'rust/db_setup.rs.mejs',
 *   context: { entities },  // Optional per-hookup data
 *   position: { after: 'use sqlx::', before: 'fn main' }
 * }]
 * ```
 * 
 * @example TOML Array manipulation
 * ```typescript
 * hookups: [{
 *   path: 'permissions/default.toml',
 *   tomlArray: {
 *     path: 'default.permissions',
 *     items: ['allow-add-post', 'allow-list-posts']
 *   }
 * }]
 * ```
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { FileBlockHookup, HookupResult, HookupType } from './types.js';
import { createMarkers, ensureFileBlock, detectLanguageFromPath } from '../markers.js';

/**
 * Apply file block hookup.
 *
 * Renders a template and inserts/maintains it as a marked block in the target file.
 * This is idempotent - running multiple times produces the same result.
 * 
 * Also supports TOML array manipulation via tomlArray property.
 */
export async function applyFileBlockHookup(
  filePath: string,
  hookup: FileBlockHookup,
  context: GeneratorContext
): Promise<HookupResult> {
  // Handle TOML array manipulation
  if (hookup.tomlArray) {
    return applyTomlArrayHookup(filePath, hookup);
  }
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Generate block content from template
  const { generateCode } = await import('../../bobbin/index.js');
  
  // Build data: merge context data with any hookup-specific context
  const data = {
    ...((context as any).data || {}),
    ...(hookup.context || {}),
  };
  
  const generated = await generateCode({
    template: hookup.template,
    outputPath: filePath,
    data,
    // Pass methods from context if available
    methods: (context as any).methods || [],
    workspaceRoot: context.workspaceRoot,
  });
  
  // Create or use custom markers (auto-detect language if not specified)
  const markers = hookup.markers 
    ? hookup.markers
    : createMarkers(
        hookup.language || detectLanguageFromPath(filePath),
        'hookup',
        deriveMarkerName(hookup.template)
      );
  
  // Apply the block
  ensureFileBlock(filePath, markers, generated.content, {
    insertAfter: hookup.position?.after,
    insertBefore: hookup.position?.before,
  });
  
  return {
    path: filePath,
    type: 'file-block' as HookupType,
    status: 'applied',
    message: `Applied block ${markers.start}`,
  };
}

/**
 * Apply TOML array manipulation hookup.
 * Adds items to a TOML array without duplicating existing items.
 */
function applyTomlArrayHookup(
  filePath: string,
  hookup: FileBlockHookup
): HookupResult {
  const { tomlArray } = hookup;
  
  if (!tomlArray) {
    return {
      path: filePath,
      type: 'file-block' as HookupType,
      status: 'error',
      message: 'tomlArray not specified',
    };
  }
  
  // Create file if it doesn't exist
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, '', 'utf-8');
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Parse the TOML path (e.g., "default.permissions" -> table="default", array="permissions")
  const pathParts = tomlArray.path.split('.');
  if (pathParts.length !== 2) {
    return {
      path: filePath,
      type: 'file-block' as HookupType,
      status: 'error',
      message: `Invalid tomlArray path: ${tomlArray.path}. Expected format: "table.array"`,
    };
  }
  
  const [tableName, arrayName] = pathParts;
  const itemsToAdd = tomlArray.items;
  
  // Build regex patterns for the array
  // Match: [table]
  const tablePattern = new RegExp(`\\[${tableName}\\]`, 'g');
  
  // Check if table exists
  if (!tablePattern.test(content)) {
    // Table doesn't exist, create it with the array
    const newSection = `[${tableName}]\n${arrayName} = [\n${itemsToAdd.map(item => `  "${item}"`).join(',\n')}\n]\n`;
    content = content + '\n' + newSection;
  } else {
    // Table exists, look for the array
    const arrayPattern = new RegExp(`(${arrayName}\\s*=\\s*\\[)([^\\]]*)(\\])`, 's');
    const arrayMatch = content.match(arrayPattern);
    
    if (arrayMatch) {
      // Array exists, add missing items
      const existingContent = arrayMatch[2];
      const existingItems = parseTomlArrayItems(existingContent);
      const newItems = itemsToAdd.filter(item => !existingItems.includes(item));
      
      if (newItems.length === 0) {
        return {
          path: filePath,
          type: 'file-block' as HookupType,
          status: 'skipped',
          message: `All items already present in ${tableName}.${arrayName}`,
        };
      }
      
      // Insert new items before the closing bracket
      const insertPos = content.indexOf(arrayMatch[0]) + arrayMatch[1].length + arrayMatch[2].length;
      const separator = existingContent.trim().length > 0 ? ',\n' : '\n';
      const itemsStr = newItems.map(item => `  "${item}"`).join(',\n');
      content = content.slice(0, insertPos) + separator + itemsStr + content.slice(insertPos);
    } else {
      // Array doesn't exist in table, add it after the table header
      const tableMatch = content.match(new RegExp(`(\\[${tableName}\\]\\n)([^\\[]*)`, 's'));
      if (tableMatch) {
        const insertPos = content.indexOf(tableMatch[0]) + tableMatch[1].length + tableMatch[2].length;
        const newArray = `${arrayName} = [\n${itemsToAdd.map(item => `  "${item}"`).join(',\n')}\n]\n`;
        content = content.slice(0, insertPos) + newArray + content.slice(insertPos);
      } else {
        // Fallback: append to table section
        const tableIndex = content.indexOf(`[${tableName}]`);
        const nextTableIndex = content.indexOf('[', tableIndex + 1);
        const insertPos = nextTableIndex > 0 ? nextTableIndex : content.length;
        const newArray = `${arrayName} = [\n${itemsToAdd.map(item => `  "${item}"`).join(',\n')}\n]\n`;
        content = content.slice(0, insertPos) + newArray + content.slice(insertPos);
      }
    }
  }
  
  // Write if modified
  const modified = content !== originalContent;
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'file-block' as HookupType,
    status: modified ? 'applied' : 'skipped',
    message: modified 
      ? `Added ${itemsToAdd.length} item(s) to ${tableName}.${arrayName}`
      : `No changes needed for ${tableName}.${arrayName}`,
  };
}

/**
 * Parse items from a TOML array string.
 * Handles quoted strings and basic TOML array syntax.
 */
function parseTomlArrayItems(arrayContent: string): string[] {
  const items: string[] = [];
  const trimmed = arrayContent.trim();
  
  if (!trimmed) {
    return items;
  }
  
  // Match quoted strings: "item" or 'item'
  const stringPattern = /["']([^"']+)["']/g;
  let match;
  while ((match = stringPattern.exec(trimmed)) !== null) {
    items.push(match[1]);
  }
  
  return items;
}

/**
 * Derive a marker name from template path.
 * E.g., "rust/db_setup.rs.mejs" -> "db-setup"
 */
function deriveMarkerName(template: string): string {
  const basename = path.basename(template, '.mejs');
  // Remove file extension
  const withoutExt = basename.replace(/\.(rs|ts|js|kt)$/i, '');
  // Convert to kebab-case
  return withoutExt
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}
