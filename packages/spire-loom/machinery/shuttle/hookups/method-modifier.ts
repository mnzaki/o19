/**
 * Method Modifier - Shared Method-Level Code Injection 🎯
 *
 * Abstract utility for modifying method bodies across languages.
 * Extracted from Kotlin hookup and made reusable for TypeScript, Rust, etc.
 *
 * > *"Methods are the hooks that bind generated code to existing logic."*
 */

import type { GeneratorContext } from '../../heddles/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Method modification specification.
 */
export interface MethodModification {
  /**
   * Code to prepend at the start of the method body.
   * Supports template functions.
   */
  prepend?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
  
  /**
   * Code to append at the end of the method body.
   * Supports template functions.
   */
  append?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
}

/**
 * Class-level modifications.
 */
export interface ClassModifications {
  /**
   * Field/property declarations to add to the class.
   */
  fields?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
  
  /**
   * Method modifications by method name.
   */
  methods?: Record<string, MethodModification>;
  
  /**
   * New methods to add to the class.
   */
  newMethods?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
}

/**
 * Language-specific configuration for method detection.
 */
export interface MethodPatternConfig {
  /** 
   * Create regex to match method declaration.
   * Should capture the declaration up to (but not including) the opening brace.
   */
  createDeclarationPattern: (methodName: string) => RegExp;
  
  /**
   * Find the opening brace position given a method declaration match.
   * Returns the index of the '{' character.
   */
  findOpeningBrace: (content: string, declMatchIndex: number, declMatchText: string) => number;
  
  /**
   * Find matching closing brace for an opening brace position.
   * Default implementation uses brace counting.
   */
  findMatchingBrace?: (content: string, openBracePos: number) => number;
  
  /**
   * Indentation string to use when injecting code.
   * Default: '    ' (4 spaces)
   */
  indent?: string;
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Find matching closing brace using brace counting.
 * Handles nested braces correctly.
 */
export function findMatchingBrace(content: string, openBracePos: number): number {
  let depth = 1;
  let pos = openBracePos + 1;
  
  // Handle string/comment contexts (basic)
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;
  
  while (pos < content.length && depth > 0) {
    const char = content[pos];
    const nextChar = content[pos + 1] || '';
    
    // Handle line comments
    if (!inString && !inBlockComment && char === '/' && nextChar === '/') {
      inLineComment = true;
      pos += 2;
      continue;
    }
    
    if (inLineComment && char === '\n') {
      inLineComment = false;
      pos++;
      continue;
    }
    
    // Handle block comments
    if (!inString && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
      pos += 2;
      continue;
    }
    
    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      pos += 2;
      continue;
    }
    
    // Handle strings
    if (!inLineComment && !inBlockComment) {
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[pos - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
    }
    
    // Count braces only when not in string/comment
    if (!inString && !inLineComment && !inBlockComment) {
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    
    pos++;
  }
  
  return depth === 0 ? pos - 1 : -1;
}

// ============================================================================
// Core Method Modification
// ============================================================================

export interface MethodModifyResult {
  content: string;
  modified: boolean;
}

/**
 * Modify a method in the given content.
 * 
 * @param content - The full file content containing the method
 * @param methodName - Name of the method to modify
 * @param modification - The modifications to apply
 * @param config - Language-specific pattern configuration
 * @param context - Generator context for template functions
 * @returns Result with modified content and success flag
 */
export function modifyMethod(
  content: string,
  methodName: string,
  modification: MethodModification,
  config: MethodPatternConfig,
  context: GeneratorContext
): MethodModifyResult {
  if (!modification.prepend && !modification.append) {
    return { content, modified: false };
  }
  
  const pattern = config.createDeclarationPattern(methodName);
  const match = pattern.exec(content);
  
  if (!match) {
    return { content, modified: false };
  }
  
  const declStart = match.index;
  const declText = match[0];
  
  // Find the opening brace
  const bracePos = config.findOpeningBrace(content, declStart, declText);
  if (bracePos === -1) {
    return { content, modified: false };
  }
  
  // Find matching closing brace
  const findCloser = config.findMatchingBrace || findMatchingBrace;
  const closingBrace = findCloser(content, bracePos);
  if (closingBrace === -1) {
    return { content, modified: false };
  }
  
  // Extract method body (between braces)
  const bodyStart = bracePos + 1;
  const bodyEnd = closingBrace;
  let methodBody = content.substring(bodyStart, bodyEnd);
  
  const indent = config.indent || '    ';
  let modified = false;
  
  // Apply prepend
  if (modification.prepend && modification.prepend.length > 0) {
    const prependLines: string[] = [];
    for (const line of modification.prepend) {
      const code = typeof line === 'function'
        ? line(context, (context as any).data || {})
        : line;
      if (code) prependLines.push(code);
    }
    
    if (prependLines.length > 0) {
      const combined = prependLines.join('\n');
      // Check for duplicates (simple string check)
      if (!methodBody.includes(combined.trim())) {
        const indented = prependLines.map(l => `${indent}${l}`).join('\n');
        methodBody = indented + '\n' + methodBody;
        modified = true;
      }
    }
  }
  
  // Apply append
  if (modification.append && modification.append.length > 0) {
    const appendLines: string[] = [];
    for (const line of modification.append) {
      const code = typeof line === 'function'
        ? line(context, (context as any).data || {})
        : line;
      if (code) appendLines.push(code);
    }
    
    if (appendLines.length > 0) {
      const combined = appendLines.join('\n');
      // Check for duplicates
      if (!methodBody.includes(combined.trim())) {
        const indented = appendLines.map(l => `${indent}${l}`).join('\n');
        // Trim end to avoid extra whitespace, then add our code
        methodBody = methodBody.trimEnd() + '\n' + indented + '\n';
        modified = true;
      }
    }
  }
  
  if (modified) {
    const newContent = content.substring(0, bodyStart) + methodBody + content.substring(bodyEnd);
    return { content: newContent, modified: true };
  }
  
  return { content, modified: false };
}

// ============================================================================
// Class Body Extraction
// ============================================================================

export interface ClassBodyResult {
  /** Content before class body (including opening brace) */
  beforeBody: string;
  /** Class body content (between braces) */
  body: string;
  /** Content after class body (including closing brace) */
  afterBody: string;
  /** Position of opening brace */
  bodyStart: number;
  /** Position of closing brace */
  bodyEnd: number;
}

/**
 * Find class body boundaries.
 * 
 * @param content - Full file content
 * @param className - Name of the class
 * @param createClassPattern - Function to create class detection regex
 * @returns Class body info or null if not found
 */
export function findClassBody(
  content: string,
  className: string,
  createClassPattern: (name: string) => RegExp
): ClassBodyResult | null {
  const pattern = createClassPattern(className);
  const match = pattern.exec(content);
  
  if (!match) {
    return null;
  }
  
  const classStart = match.index;
  
  // Find opening brace after class declaration
  const afterDecl = content.substring(classStart);
  const braceMatch = afterDecl.match(/\{/);
  if (!braceMatch) {
    return null;
  }
  
  const bodyStart = classStart + braceMatch.index!;
  const bodyEnd = findMatchingBrace(content, bodyStart);
  
  if (bodyEnd === -1) {
    return null;
  }
  
  return {
    beforeBody: content.substring(0, bodyStart + 1),
    body: content.substring(bodyStart + 1, bodyEnd),
    afterBody: content.substring(bodyEnd),
    bodyStart,
    bodyEnd,
  };
}

// ============================================================================
// Language-Specific Configs
// ============================================================================

/**
 * Kotlin method pattern configuration.
 */
export const KotlinMethodConfig: MethodPatternConfig = {
  createDeclarationPattern: (methodName: string) => 
    new RegExp(`(fun\\s+${methodName}\\s*\\([^)]*\\)[^{]*)`, 'g'),
  
  findOpeningBrace: (_content, declIndex, declText) => {
    // In Kotlin, the brace comes after the declaration
    const afterDecl = _content.substring(declIndex + declText.length);
    const braceMatch = afterDecl.match(/[^{]*{/);
    if (braceMatch) {
      return declIndex + declText.length + braceMatch.index! + braceMatch[0].length - 1;
    }
    return -1;
  },
  
  indent: '        ', // 8 spaces for method body
};

/**
 * TypeScript/JavaScript method pattern configuration.
 */
export const TypeScriptMethodConfig: MethodPatternConfig = {
  createDeclarationPattern: (methodName: string) => {
    // Matches:
    // - methodName(...) { }
    // - methodName = (...) => { }
    // - methodName: function(...) { }
    // - async methodName(...) { }
    // - private/public/protected methodName(...) { }
    // - static methodName(...) { }
    // - get methodName() { }
    // - set methodName(...) { }
    return new RegExp(
      `((?:async\\s+)?(?:private\\s+|public\\s+|protected\\s+|static\\s+)?` +
      `(?:get\\s+|set\\s+)?${methodName}\\s*[=:]?\\s*` +
      `(?:\\([^)]*\\)\\s*=>|\\([^)]*\\))[^;{]*)`,
      'g'
    );
  },
  
  findOpeningBrace: (_content, declIndex, declText) => {
    const afterDecl = _content.substring(declIndex + declText.length);
    const braceMatch = afterDecl.match(/[^{]*{/);
    if (braceMatch) {
      return declIndex + declText.length + braceMatch.index! + braceMatch[0].length - 1;
    }
    return -1;
  },
  
  indent: '    ', // 4 spaces
};

/**
 * Rust method pattern configuration (for impl blocks).
 */
export const RustMethodConfig: MethodPatternConfig = {
  createDeclarationPattern: (methodName: string) => {
    // Matches:
    // - fn methodName(...) { }
    // - pub fn methodName(...) { }
    // - async fn methodName(...) { }
    // - pub async fn methodName(...) { }
    return new RegExp(
      `((?:pub\\s+)?(?:async\\s+)?fn\\s+${methodName}\\b[^({]*(?:\\([^)]*\\))[^-{]*)`,
      'g'
    );
  },
  
  findOpeningBrace: (_content, declIndex, declText) => {
    // Handle where clauses: fn name<T>() where T: Display { }
    const afterDecl = _content.substring(declIndex + declText.length);
    // Look for opening brace, possibly after where clause
    const braceMatch = afterDecl.match(/(?:\s*where[^{]+)?\s*\{/);
    if (braceMatch) {
      return declIndex + declText.length + braceMatch.index! + braceMatch[0].length - 1;
    }
    return -1;
  },
  
  indent: '        ', // 8 spaces (2 levels in Rust)
};

// ============================================================================
// Language-Specific Class/Impl Patterns
// ============================================================================

/**
 * Kotlin class pattern.
 */
export const KotlinClassPattern = (className: string) => 
  new RegExp(`(class|object|interface)\\s+${className}\\b`, 'g');

/**
 * TypeScript class pattern.
 */
export const TypeScriptClassPattern = (className: string) => 
  new RegExp(`(class|interface)\\s+${className}\\b`, 'g');

/**
 * Rust impl block pattern (for struct/trait implementation).
 */
export const RustImplPattern = (typeName: string) => 
  new RegExp(`impl(?:<[^>]+>)?\\s+(?:\\w+\\s+for\\s+)?${typeName}\\b`, 'g');
