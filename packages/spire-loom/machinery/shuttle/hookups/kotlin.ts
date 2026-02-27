/**
 * Kotlin File Hookup Handler
 *
 * Applies Kotlin file (.kt) hookups declaratively.
 * Refactored to use shared method-modifier utilities.
 */

import * as fs from 'node:fs';
import type { GeneratorContext } from '../../heddles/index.js';
import type { KotlinHookup, HookupResult, ClassModifications } from './types.js';
import { 
  modifyMethod, 
  findClassBody,
  KotlinMethodConfig, 
  KotlinClassPattern,
} from './method-modifier.js';

/**
 * Apply Kotlin file hookup.
 */
export function applyKotlinHookup(
  filePath: string,
  spec: KotlinHookup,
  context: GeneratorContext
): HookupResult {
  const changes: string[] = [];
  
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      type: 'kotlin',
      status: 'error',
      message: `File not found: ${filePath}`,
    };
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Handle imports
  if (spec.imports) {
    const { content: newContent, added } = applyImports(content, spec.imports, context);
    content = newContent;
    if (added.length > 0) {
      changes.push(`Added ${added.length} imports`);
    }
  }
  
  // Handle class modifications
  if (spec.classes) {
    for (const [className, classMod] of Object.entries(spec.classes)) {
      const { content: newContent, modified } = applyClassModifications(content, className, classMod, context);
      content = newContent;
      if (modified) {
        changes.push(`Modified class: ${className}`);
      }
    }
  }
  
  // Write back if modified
  if (changes.length > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return {
    path: filePath,
    type: 'kotlin',
    status: changes.length > 0 ? 'applied' : 'skipped',
    message: changes.length > 0 ? changes.join(', ') : 'No changes needed',
  };
}

/**
 * Apply import statements to Kotlin file.
 */
function applyImports(
  content: string,
  imports: KotlinHookup['imports'],
  context: GeneratorContext
): { content: string; added: string[] } {
  const added: string[] = [];
  const lines = content.split('\n');
  
  // Find existing imports
  const existingImports = new Set<string>();
  const importIndices: number[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ')) {
      existingImports.add(line.replace(/^import\s+/, '').replace(/\s+/g, ' '));
      importIndices.push(i);
    }
  }
  
  // Find insertion point (after last import, or after package declaration)
  let insertIndex = 0;
  if (importIndices.length > 0) {
    insertIndex = importIndices[importIndices.length - 1] + 1;
  } else {
    // Find package declaration
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('package ')) {
        insertIndex = i + 1;
      }
    }
  }
  
  // Add new imports
  const newImports: string[] = [];
  for (const imp of imports || []) {
    const importLine = typeof imp === 'function' 
      ? imp(context, (context as any).data || {})
      : imp;
    
    if (!importLine) continue;
    
    const normalized = importLine.trim().replace(/^import\s+/, '').replace(/\s+/g, ' ');
    if (!existingImports.has(normalized)) {
      newImports.push(`import ${normalized}`);
      added.push(normalized);
    }
  }
  
  if (newImports.length > 0) {
    // Add blank line before imports if needed
    if (insertIndex > 0 && lines[insertIndex - 1].trim() !== '') {
      newImports.unshift('');
    }
    lines.splice(insertIndex, 0, ...newImports);
    content = lines.join('\n');
  }
  
  return { content, added };
}

/**
 * Apply class modifications using shared utilities.
 */
function applyClassModifications(
  content: string,
  className: string,
  classMod: ClassModifications,
  context: GeneratorContext
): { content: string; modified: boolean } {
  let modified = false;
  
  const classInfo = findClassBody(content, className, KotlinClassPattern);
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
        const methodNameMatch = methodDecl.match(/fun\s+(\w+)/);
        const methodName = methodNameMatch?.[1];
        
        if (methodName && !classBody.includes(`fun ${methodName}(`)) {
          classBody += `\n    ${methodDecl.trim()}\n`;
          bodyModified = true;
        }
      }
    }
  }
  
  // Modify existing methods using shared utility
  if (classMod.methods) {
    for (const [methodName, methodMod] of Object.entries(classMod.methods)) {
      const result = modifyMethod(classBody, methodName, methodMod, KotlinMethodConfig, context);
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
