/**
 * Code Generator
 * 
 * High-level code generation API that bridges raw Management metadata
 * to language-specific code via templates.
 * 
 * This is the primary interface treadles use. It:
 * 1. Detects target language from file extension
 * 2. Applies appropriate transformations to Management data
 * 3. Renders templates with transformed data
 * 
 * The treadle says WHAT to generate. This module handles HOW.
 */

import * as path from 'node:path';
import { renderEjs, generateFromEjs } from '../shuttle/template-renderer.js';
import { getBuiltinTemplateDir } from '../shuttle/template-renderer.js';
import type { GeneratedFile } from '../heddles/index.js';
import {
  mapToKotlinType,
  mapToJniType,
  mapToRustType,
  generateJniToRustConversion,
  generateRustToJniConversion,
  getJniErrorValue,
} from './type-mappings.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Link metadata for routing to struct fields.
 */
export interface MethodLink {
  /** Field name to access (e.g., 'device_manager') */
  fieldName: string;
  /** Wrapper types: e.g., ['Option', 'Mutex'] */
  wrappers?: string[];
}

/**
 * Raw Management method as collected from Management classes.
 * 
 * Cross-language naming:
 * - name: Bind-point name with management prefix (e.g., "device_generate_pairing_code")
 * - implName: Original Rust method name (e.g., "generate_pairing_code")
 * - jsName: JavaScript/TypeScript command name (camelCase, from WARP)
 */
export interface RawMethod {
  name: string;        // Bind-point name with prefix (e.g., "device_generate_pairing_code")
  implName: string;    // Original method name (e.g., "generate_pairing_code")
  jsName?: string;     // JavaScript: camelCase (original WARP name)
  returnType: string;
  isCollection: boolean;
  params: Array<{ name: string; type: string; optional?: boolean }>;
  description?: string;
  /** Link metadata for routing to struct fields */
  link?: MethodLink;
}

/**
 * Transformation result for a specific language.
 */
export interface TransformedMethod {
  name: string;
  pascalName: string;
  description?: string;
}

/**
 * Kotlin-specific method transformation.
 */
export interface KotlinMethod extends TransformedMethod {
  ktReturnType: string;
  params: Array<{ name: string; ktType: string }>;
}

/**
 * Rust JNI-specific method transformation.
 */
export interface RustJniMethod extends TransformedMethod {
  jniReturnType: string;
  rustReturnType: string;
  returnConversion: string;
  errorValue: string;
  params: Array<{
    name: string;
    jniType: string;
    rustType: string;
    conversion: string;
  }>;
  /** Service access preamble: code to access the service with proper error handling */
  serviceAccessPreamble: string[];
  /** Original method name for calling the implementation (e.g., 'generate_pairing_code') */
  implName: string;
}

/**
 * AIDL-specific method transformation.
 */
export interface AidlMethod extends TransformedMethod {
  returnType: string;
  params: Array<{ name: string; type: string }>;
}

/**
 * Type discriminator for language-specific transforms.
 */
export type Language = 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript' | 'unknown';

// ============================================================================
// Language Detection
// ============================================================================

/**
 * Detect target language from template filename using double extension pattern.
 * 
 * Pattern: {name}.{transform}.{ext}.ejs
 * - service.kt.ejs → kotlin
 * - jni_bridge.jni.rs.ejs → rust_jni
 * - platform.rs.ejs → rust
 * - interface.aidl.ejs → aidl
 * 
 * @param templatePath - Path to the EJS template
 */
export function detectLanguage(templatePath: string): Language {
  const basename = path.basename(templatePath).toLowerCase();
  
  // Check for double extension pattern: .{transform}.{ext}.ejs
  // e.g., .jni.rs.ejs, .kt.ejs, .aidl.ejs
  
  if (basename.endsWith('.jni.rs.ejs')) {
    return 'rust_jni';
  }
  if (basename.endsWith('.rs.ejs')) {
    return 'rust';
  }
  if (basename.endsWith('.kt.ejs') || basename.endsWith('.kts.ejs')) {
    return 'kotlin';
  }
  if (basename.endsWith('.aidl.ejs')) {
    return 'aidl';
  }
  if (basename.endsWith('.ts.ejs') || basename.endsWith('.tsx.ejs')) {
    return 'typescript';
  }
  
  return 'unknown';
}

// ============================================================================
// Method Transformations
// ============================================================================

function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

/**
 * Transform raw methods for Kotlin output.
 */
export function transformForKotlin(methods: RawMethod[]): KotlinMethod[] {
  return methods.map(method => ({
    name: method.name,
    pascalName: pascalCase(method.name),
    description: method.description,
    ktReturnType: mapToKotlinType(method.returnType, method.isCollection),
    params: method.params.map(p => ({
      name: p.name,
      ktType: mapToKotlinType(p.type, false),
    })),
  }));
}

/**
 * Build Rust service access preamble based on link metadata.
 * 
 * Returns lines of code to access the service, handling Option and Mutex
 * with proper error handling instead of unwrap.
 * 
 * Examples:
 * - No link: `let __service = service;`
 * - device_manager: 
 *   ```
 *   let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
 *   let mut __service = __field.lock().map_err(|_| "mutex poisoned")?;
 *   ```
 */
function buildServiceAccessPreamble(link: MethodLink | undefined): string[] {
  if (!link) {
    return ['let __service = service;'];
  }

  const fieldName = link.fieldName;
  const wrappers = link.wrappers || [];
  const lines: string[] = [];

  // Handle Option<Mutex<T>> pattern
  if (wrappers.includes('Option') && wrappers.includes('Mutex')) {
    lines.push(`let __field = service.${fieldName}.as_ref().ok_or("${fieldName} not initialized")?;`);
    lines.push(`let mut __service = __field.lock().map_err(|_| "${fieldName} mutex poisoned")?;`);
  } else if (wrappers.includes('Option')) {
    // Just Option<T>
    lines.push(`let __service = service.${fieldName}.as_ref().ok_or("${fieldName} not initialized")?;`);
  } else if (wrappers.includes('Mutex')) {
    // Just Mutex<T>
    lines.push(`let mut __service = service.${fieldName}.lock().map_err(|_| "${fieldName} mutex poisoned")?;`);
  } else {
    // No wrappers
    lines.push(`let __service = service.${fieldName};`);
  }

  return lines;
}

/**
 * Transform raw methods for Rust JNI output.
 */
export function transformForRustJni(methods: RawMethod[]): RustJniMethod[] {
  return methods.map(method => {
    const serviceAccessPreamble = buildServiceAccessPreamble(method.link);
    
    return {
      name: method.name,
      implName: method.implName,
      pascalName: pascalCase(method.name),
      description: method.description,
      jniReturnType: mapToJniType(method.returnType),
      rustReturnType: mapToRustType(method.returnType),
      returnConversion: generateRustToJniConversion('result', method.returnType),
      errorValue: getJniErrorValue(method.returnType),
      params: method.params.map(p => ({
        name: p.name,
        jniType: mapToJniType(p.type),
        rustType: mapToRustType(p.type),
        conversion: generateJniToRustConversion(p.name, p.type),
      })),
      serviceAccessPreamble,
    };
  });
}

/**
 * Transform raw methods for AIDL output.
 */
export function transformForAidl(methods: RawMethod[]): AidlMethod[] {
  return methods.map(method => ({
    name: method.name,
    pascalName: pascalCase(method.name),
    description: method.description,
    returnType: mapToAidlType(method.returnType, method.isCollection),
    params: method.params.map(p => ({
      name: p.name,
      type: mapToAidlType(p.type, false),
    })),
  }));
}

/**
 * Rust method for Tauri platform trait.
 */
export interface RustMethod extends TransformedMethod {
  rsReturnType: string;
  params: Array<{ name: string; rsType: string; optional?: boolean }>;
}

/**
 * TypeScript method for adaptor generation.
 */
export interface TypeScriptMethod extends TransformedMethod {
  jsName: string;
  tsReturnType: string;
  commandName: string;
  responseType?: string;
  returnMapping?: string;
  hasCustomMapping: boolean;
  params: Array<{ name: string; tsType: string; optional?: boolean }>;
}

/**
 * Transform raw methods for TypeScript adaptor output.
 */
export function transformForTypeScript(methods: RawMethod[]): TypeScriptMethod[] {
  return methods.map(method => {
    const tsReturnType = mapToTypeScriptType(method.returnType, method.isCollection);
    const hasComplexReturn = !['string', 'number', 'boolean', 'void'].includes(method.returnType.toLowerCase());
    
    return {
      name: method.name,
      jsName: method.jsName || camelCase(method.name),
      pascalName: pascalCase(method.name),
      description: method.description,
      tsReturnType,
      commandName: method.name, // snake_case for Tauri command
      responseType: hasComplexReturn ? `${pascalCase(method.name)}Response` : undefined,
      returnMapping: hasComplexReturn ? generateResponseMapping(method.returnType) : undefined,
      hasCustomMapping: hasComplexReturn,
      params: method.params.map(p => ({
        name: p.name,
        tsType: mapToTypeScriptType(p.type, false),
        optional: p.optional,
      })),
    };
  });
}

function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapToTypeScriptType(tsType: string, isCollection: boolean): string {
  const baseType = (() => {
    switch (tsType.toLowerCase()) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean':
      case 'bool': return 'boolean';
      case 'void': return 'void';
      default: return tsType; // Keep complex types as-is
    }
  })();
  return isCollection ? `${baseType}[]` : baseType;
}

function generateResponseMapping(_returnType: string): string {
  // Default mapping - assumes response has snake_case fields
  return `{ ...result }`;
}

/**
 * Transform raw methods for pure Rust output (Tauri platform trait).
 * 
 * Optional parameters are mapped to Option<T> in Rust.
 */
export function transformForRust(methods: RawMethod[]): RustMethod[] {
  return methods.map(method => ({
    name: method.name,
    pascalName: pascalCase(method.name),
    description: method.description,
    rsReturnType: mapToTauriRustType(method.returnType, method.isCollection),
    params: method.params.map(p => {
      const baseType = mapToTauriRustType(p.type, false);
      // Wrap optional parameters in Option<T>
      const rsType = p.optional ? `Option<${baseType}>` : baseType;
      return {
        name: p.name,
        rsType,
        optional: p.optional,
      };
    }),
  }));
}

function mapToAidlType(tsType: string, isCollection: boolean): string {
  const baseType = (() => {
    switch (tsType.toLowerCase()) {
      case 'string': return 'String';
      case 'number': return 'int';
      case 'boolean':
      case 'bool': return 'boolean';
      case 'void': return 'void';
      default: return 'String';
    }
  })();
  return isCollection ? `${baseType}[]` : baseType;
}

/**
 * Map TypeScript type to Rust type for Tauri platform code.
 * (Local variant that supports collection types)
 */
function mapToTauriRustType(tsType: string, isCollection: boolean = false): string {
  const baseType = (() => {
    switch (tsType.toLowerCase()) {
      case 'string': return 'String';
      case 'number': return 'i64';
      case 'boolean':
      case 'bool': return 'bool';
      case 'void': return '()';
      default: return 'String'; // Complex types as JSON strings
    }
  })();
  return isCollection ? `Vec<${baseType}>` : baseType;
}

// ============================================================================
// Unified Generation API
// ============================================================================

export interface GenerateOptions {
  /** Template path (absolute or relative to builtin templates) */
  template: string;
  /** Output file path (determines transformation language) */
  outputPath: string;
  /** Template data - 'methods' will be auto-transformed based on output extension */
  data: Record<string, unknown>;
  /** Raw Management methods to transform */
  methods?: RawMethod[];
  /** EJS rendering options */
  ejsOptions?: import('ejs').Options;
}

/**
 * Generate code from template with automatic language detection and transformation.
 * 
 * The language is detected from the output file extension:
 * - .kt → Kotlin transforms
 * - .rs → Rust JNI transforms  
 * - .aidl → AIDL transforms
 * 
 * @example
 * await generateCode({
 *   template: 'android/service.kt.ejs',
 *   outputPath: '.../FoundframeService.kt',
 *   data: { serviceName: 'FoundframeService' },
 *   methods: rawMethods,  // Auto-transformed for Kotlin
 * });
 */
export async function generateCode(options: GenerateOptions): Promise<GeneratedFile> {
  // Determine template path first (needed for language detection)
  const templatePath = path.isAbsolute(options.template)
    ? options.template
    : path.join(getBuiltinTemplateDir(), options.template);
  
  // Detect language from template filename (double extension pattern)
  const language = detectLanguage(templatePath);
  
  // Transform methods if provided
  let transformedMethods: unknown[] | undefined;
  if (options.methods) {
    transformedMethods = transformMethods(options.methods, language);
  }
  
  // Build final data with transformed methods
  const data = {
    ...options.data,
    methods: transformedMethods ?? options.data.methods,
  };
  
  // Render template
  const content = await renderEjs({
    template: templatePath,
    data,
    ejsOptions: options.ejsOptions,
  });
  
  return {
    path: options.outputPath,
    content,
  };
}

/**
 * Transform methods for the target language.
 */
function transformMethods(methods: RawMethod[], language: Language): unknown[] {
  switch (language) {
    case 'kotlin':
      return transformForKotlin(methods);
    case 'rust':
      return transformForRust(methods);
    case 'rust_jni':
      return transformForRustJni(methods);
    case 'aidl':
      return transformForAidl(methods);
    case 'typescript':
      return transformForTypeScript(methods);
    default:
      // No transformation for unknown languages
      return methods;
  }
}

// ============================================================================
// Batch Generation
// ============================================================================

export interface GenerationTask {
  template: string;
  outputPath: string;
  data: Record<string, unknown>;
}

/**
 * Generate multiple files in parallel.
 * 
 * All methods arrays in data will be auto-transformed based on output extension.
 */
export async function generateBatch(
  tasks: GenerationTask[],
  methods?: RawMethod[]
): Promise<GeneratedFile[]> {
  const promises = tasks.map(task =>
    generateCode({
      template: task.template,
      outputPath: task.outputPath,
      data: task.data,
      methods,
    })
  );
  
  return Promise.all(promises);
}

// ============================================================================
// Direct Rendering (for when you have pre-transformed data)
// ============================================================================

export interface RenderTemplateOptions {
  /** Template path or name */
  template: string;
  /** Data to pass to template (already transformed) */
  data: Record<string, unknown>;
  /** Whether template path is relative to builtin templates */
  builtin?: boolean;
}

/**
 * Render a template directly without transformation.
 * 
 * Use this when you need full control over the data.
 * Prefer `generateCode()` for standard flows.
 */
export async function renderTemplate(
  options: RenderTemplateOptions
): Promise<string> {
  const templatePath = options.builtin && !path.isAbsolute(options.template)
    ? path.join(getBuiltinTemplateDir(), options.template)
    : options.template;
  
  return renderEjs({
    template: templatePath,
    data: options.data,
  });
}
