/**
 * Kotlin File Hookup Handler
 *
 * Applies Kotlin file (.kt) hookups declaratively.
 * Used for modifying Tauri Android plugin files and other Kotlin sources.
 */

import * as fs from 'node:fs';
import type { GeneratorContext } from '../../heddles/index.js';
import type { KotlinHookup, HookupResult, KotlinClassModifications } from './types.js';

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
 * Apply class modifications.
 */
function applyClassModifications(
  content: string,
  className: string,
  classMod: KotlinClassModifications,
  context: GeneratorContext
): { content: string; modified: boolean } {
  let modified = false;
  
  // Find class declaration
  const classRegex = new RegExp(`(class|object|interface)\\s+${className}\\b`, 'g');
  const classMatch = classRegex.exec(content);
  
  if (!classMatch) {
    // Class not found - maybe add new class?
    return { content, modified: false };
  }
  
  // Find class body boundaries
  const classStart = classMatch.index;
  const bodyStart = findClassBodyStart(content, classStart);
  
  if (bodyStart === -1) {
    return { content, modified: false };
  }
  
  // Find matching closing brace for class body
  const bodyEnd = findMatchingBrace(content, bodyStart);
  
  if (bodyEnd === -1) {
    return { content, modified: false };
  }
  
  let classBody = content.substring(bodyStart + 1, bodyEnd);
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
  
  // Modify existing methods
  if (classMod.methods) {
    for (const [methodName, methodMod] of Object.entries(classMod.methods)) {
      const result = modifyMethod(classBody, methodName, methodMod, context);
      if (result.modified) {
        classBody = result.content;
        bodyModified = true;
      }
    }
  }
  
  if (bodyModified) {
    content = content.substring(0, bodyStart + 1) + classBody + content.substring(bodyEnd);
    modified = true;
  }
  
  return { content, modified };
}

/**
 * Find the start of class body (position of opening brace).
 */
function findClassBodyStart(content: string, classDeclStart: number): number {
  // Look for opening brace after class declaration
  const afterDecl = content.substring(classDeclStart);
  const braceMatch = afterDecl.match(/[^{]*{/);
  if (braceMatch) {
    return classDeclStart + braceMatch.index! + braceMatch[0].length - 1;
  }
  return -1;
}

/**
 * Find matching closing brace.
 */
function findMatchingBrace(content: string, openBracePos: number): number {
  let depth = 1;
  let pos = openBracePos + 1;
  
  while (pos < content.length && depth > 0) {
    if (content[pos] === '{') depth++;
    if (content[pos] === '}') depth--;
    pos++;
  }
  
  return depth === 0 ? pos - 1 : -1;
}

/**
 * Modify an existing method.
 */
function modifyMethod(
  classBody: string,
  methodName: string,
  methodMod: KotlinClassModifications['methods'][string],
  context: GeneratorContext
): { content: string; modified: boolean } {
  let modified = false;
  let content = classBody;
  
  // Find method declaration
  const methodRegex = new RegExp(`(fun\\s+${methodName}\\s*\\([^)]*\\)[^{]*)`, 'g');
  const match = methodRegex.exec(content);
  
  if (!match) {
    return { content, modified: false };
  }
  
  const methodStart = match.index;
  const methodBodyStart = findClassBodyStart(content.substring(methodStart), 0);
  
  if (methodBodyStart === -1) {
    return { content, modified: false };
  }
  
  const absoluteBodyStart = methodStart + methodBodyStart + 1;
  const methodBodyEnd = findMatchingBrace(content, absoluteBodyStart - 1);
  
  if (methodBodyEnd === -1) {
    return { content, modified: false };
  }
  
  let methodBody = content.substring(absoluteBodyStart, methodBodyEnd);
  
  // Prepend code
  if (methodMod?.prepend) {
    const prependLines: string[] = [];
    for (const line of methodMod.prepend) {
      const code = typeof line === 'function'
        ? line(context, (context as any).data || {})
        : line;
      if (code) prependLines.push(code);
    }
    
    if (prependLines.length > 0) {
      // Check if already present
      const combined = prependLines.join('\n');
      if (!methodBody.includes(combined.trim())) {
        methodBody = prependLines.map(l => `        ${l}`).join('\n') + '\n' + methodBody;
        modified = true;
      }
    }
  }
  
  // Append code
  if (methodMod?.append) {
    const appendLines: string[] = [];
    for (const line of methodMod.append) {
      const code = typeof line === 'function'
        ? line(context, (context as any).data || {})
        : line;
      if (code) appendLines.push(code);
    }
    
    if (appendLines.length > 0) {
      // Check if already present
      const combined = appendLines.join('\n');
      if (!methodBody.includes(combined.trim())) {
        // Find last non-empty line before closing brace
        methodBody = methodBody.trimEnd() + '\n' + appendLines.map(l => `        ${l}`).join('\n') + '\n';
        modified = true;
      }
    }
  }
  
  if (modified) {
    content = content.substring(0, absoluteBodyStart) + methodBody + content.substring(methodBodyEnd);
  }
  
  return { content, modified };
}
