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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderEjs } from '../shuttle/template-renderer.js';
import { getBuiltinTemplateDir } from '../shuttle/template-renderer.js';
import type { GeneratedFile } from '../heddles/index.js';
import { camelCase } from '../stringing.js';

// Import languages to ensure they register themselves
// This MUST happen before transformMethods is called
import '../../warp/rust.js';
import '../../warp/typescript.js';
import '../../warp/kotlin.js';

// Import the language registry
import { languages } from '../reed/language/index.js';

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
export interface RawMethod<
  P extends { name: string; type?: string; optional?: boolean } = {
    name: string;
    type: string;
    optional?: boolean;
  }
> {
  name: string; // Bind-point name with prefix (e.g., "device_generate_pairing_code")
  implName: string; // Original method name (e.g., "generate_pairing_code")
  jsName?: string; // JavaScript: camelCase (original WARP name)
  camelName?: string;
  pascalName?: string;
  returnType: string;
  isCollection: boolean;
  params: Array<P>;
  description?: string;
  /** Link metadata for routing to struct fields */
  link?: MethodLink;
  /**
   * Whether methods return Result<T, E> for error handling.
   * When true, generated code wraps return types in Result and uses ? for error propagation.
   */
  useResult?: boolean;
  /**
   * Tags for filtering (e.g., 'crud:create', 'auth:required').
   * Added during method collection in treadle-kit.
   */
  tags?: string[];
  /**
   * CRUD operation type (create, read, update, delete, list).
   * Added during method collection in treadle-kit.
   */
  crudOperation?: string;
  /**
   * Management name this method belongs to.
   * Added during method collection in treadle-kit.
   */
  managementName?: string;
}

/**
 * Transformed method - language-specific extensions applied.
 * This is a generic type that depends on the target language.
 */
export type TransformedMethod = RawMethod & Record<string, unknown>;

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
 * Uses the language registry for detection.
 *
 * @param templatePath - Path to the EJS template
 */
export function detectLanguage(templatePath: string): Language {
  const basename = path.basename(templatePath).toLowerCase();

  // Use language registry for detection
  const lang = languages.detectByExtension(templatePath);
  if (lang) {
    return lang.name as Language;
  }

  // Fallback for unknown extensions
  return 'unknown';
}

// ============================================================================
// Unified Generation API
// ============================================================================

export interface GenerateOptions {
  /** Template path (absolute or relative to builtin/workspace/templates) */
  template: string;
  /** Output file path (determines transformation language) */
  outputPath: string;
  /** Template data - 'methods' will be auto-transformed based on output extension */
  data: Record<string, unknown>;
  /** Raw Management methods to transform */
  methods?: RawMethod[];
  /** EJS rendering options */
  ejsOptions?: import('ejs').Options;
  /**
   * Workspace root for resolving workspace templates.
   * If provided, templates are searched in {workspaceRoot}/loom/bobbin/ first,
   * then package templates, then fall back to builtin templates.
   */
  workspaceRoot?: string;
  /**
   * Package path relative to workspace (e.g., 'packages/foundframe-front').
   * Used to resolve package-specific templates from {workspaceRoot}/{packagePath}/loom/bobbin/
   */
  packagePath?: string;
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
/**
 * Resolve template path, checking workspace, package, then builtin.
 *
 * Lookup order:
 * 1. Absolute paths (use as-is)
 * 2. Workspace templates: {workspaceRoot}/loom/bobbin/{template}
 * 3. Package templates: {workspaceRoot}/{packagePath}/loom/bobbin/{template}
 * 4. Builtin templates
 *
 * @param template - Template path (absolute or relative)
 * @param workspaceRoot - Optional workspace root for workspace templates
 * @param packagePath - Optional package path for package-specific templates
 * @returns Resolved absolute path to template
 */
function resolveTemplatePath(
  template: string,
  workspaceRoot?: string,
  packagePath?: string
): string {
  // If absolute, use as-is
  if (path.isAbsolute(template)) {
    return template;
  }

  // Check workspace first if provided
  if (workspaceRoot) {
    const workspaceTemplatePath = path.join(workspaceRoot, 'loom', 'bobbin', template);
    if (fs.existsSync(workspaceTemplatePath)) {
      return workspaceTemplatePath;
    }
  }

  // Check package templates if provided
  if (workspaceRoot && packagePath) {
    const packageTemplatePath = path.join(workspaceRoot, packagePath, 'loom', 'bobbin', template);
    if (fs.existsSync(packageTemplatePath)) {
      return packageTemplatePath;
    }
  }

  // Fall back to builtin templates
  return path.join(getBuiltinTemplateDir(), template);
}

export async function generateCode(options: GenerateOptions): Promise<GeneratedFile> {
  // Determine template path (workspace first, package second, then builtin)
  const templatePath = resolveTemplatePath(
    options.template,
    options.workspaceRoot,
    options.packagePath
  );

  // Detect language from template filename (double extension pattern)
  const language = detectLanguage(templatePath);

  // Transform methods if provided and language is known
  let transformedMethods: unknown[] | undefined;
  if (options.methods && language !== 'unknown') {
    transformedMethods = transformMethods(options.methods, language);
  }

  // Build final data with transformed methods
  const data = {
    ...options.data,
    methods: transformedMethods ?? options.data.methods
  };

  // Render template
  let content = await renderEjs({
    template: templatePath,
    data,
    ejsOptions: options.ejsOptions
  });

  // Add header comment based on output file extension
  const headerComment = generateHeaderComment(options.outputPath, templatePath, options.template);
  if (headerComment) {
    content = headerComment + '\n' + content;
  }

  return {
    path: options.outputPath,
    content
  };
}

/**
 * Generate a header comment warning not to edit the file.
 * Returns empty string if file type is not recognized.
 *
 * @param outputPath - Path where the file will be written
 * @param resolvedTemplatePath - Full resolved path to the template
 * @param originalTemplatePath - Original template path as specified (may be relative)
 */
function generateHeaderComment(
  outputPath: string,
  resolvedTemplatePath: string,
  originalTemplatePath: string
): string {
  const ext = path.extname(outputPath).toLowerCase();
  const filename = path.basename(outputPath);

  // Map extensions to comment styles
  const commentStyles: Record<string, { start: string; end?: string; line?: string }> = {
    '.rs': { start: '//', end: '' },
    '.ts': { start: '//', end: '' },
    '.js': { start: '//', end: '' },
    '.kt': { start: '//', end: '' },
    '.java': { start: '//', end: '' },
    '.aidl': { start: '//', end: '' },
    '.md': { start: '<!--', end: '-->' },
    '.toml': { start: '#', end: '' },
    '.json': { start: '', end: '' } // JSON doesn't support comments
  };

  const style = commentStyles[ext];
  if (!style) {
    return ''; // Unknown file type, no header
  }

  // Skip JSON files (they can't have comments)
  if (ext === '.json') {
    return '';
  }

  // Determine if this is a builtin template or custom
  const builtinDir = getBuiltinTemplateDir();
  const isBuiltin = resolvedTemplatePath.startsWith(builtinDir);

  // Use absolute path for display
  const templateDisplayPath = resolvedTemplatePath;

  let overrideInstructions: string;
  if (isBuiltin) {
    const relativeToBuiltin = path.relative(builtinDir, resolvedTemplatePath);
    overrideInstructions = `// To override: Copy this template to loom/bobbin/${relativeToBuiltin}`;
  } else {
    overrideInstructions = `// This is a workspace custom template (from loom/bobbin/)`;
  }

  const templateFile = path.basename(resolvedTemplatePath);

  const message = `GENERATED BY SPIRE-LOOM - DO NOT EDIT (even if LLM)
//
// This file is automatically generated from a template.
// Changes will be overwritten on next generation.
//
// Template: ${templateDisplayPath}
// Template file: ${templateFile}
${overrideInstructions}
//
// To modify the generated output, edit the template file above.`;

  if (style.end) {
    return `${style.start}\n${message}\n${style.end}`;
  } else {
    return message
      .split('\n')
      .map((line) => `${style.start} ${line.replace(/^[\/]{2} ?/, '')}`)
      .join('\n');
  }
}

/**
 * Transform methods for the target language.
 * 
 * Uses the language registry to find the appropriate transform function.
 * Languages must be imported before this is called to register themselves.
 * 
 * @throws Error if language is not registered or has no transform
 */
function transformMethods(methods: RawMethod[], language: Language): RawMethod[] {
  for (const method of methods) {
    if (typeof method.name !== 'string' || method.name.length === 0) {
      throw new Error(
        `Method missing valid name during transform for ${language}: ${JSON.stringify(method)}. ` +
        `All methods must have a non-empty string name.`
      );
    }
    // Only add camelName if not already present (idempotent transform)
    if (!('camelName' in method)) {
      (method as any).camelName = camelCase(method.name);
    }
  }

  // Use language registry for transforms
  const lang = languages.get(language);
  
  if (!lang?.codeGen?.transform) {
    throw new Error(
      `Language '${language}' not registered or has no transform. ` +
      `Make sure to import the language definition (e.g., 'import "@o19/spire-loom/warp/rust"').` +
      `Registered languages: ${languages.getAll().map(l => l.name).join(', ') || '(none)'}`
    );
  }
  
  const transformedMethods = lang.codeGen.transform(methods);

  // Attach filter/map helpers that preserve transformation
  transformedMethods.filter = function (
    filter: (method: RawMethod, index: number, array: RawMethod[]) => boolean
  ): RawMethod[] {
    return transformMethods(Array.prototype.filter.call(this, filter), language);
  };

  // @ts-ignore
  transformedMethods.map = function <U = RawMethod>(
    callback: (method: RawMethod, index: number, array: RawMethod[]) => U
  ): U[] {
    const mapped = Array.prototype.map.call(this, callback);
    // Only re-transform if results are still method-like objects
    // This allows mapping to other types (strings, etc.) without errors
    if (mapped.length > 0 && typeof mapped[0] === 'object' && mapped[0] !== null && 'name' in mapped[0]) {
      return transformMethods(mapped as RawMethod[], language) as U[];
    }
    return mapped;
  };

  return transformedMethods;
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
  const promises = tasks.map((task) =>
    generateCode({
      template: task.template,
      outputPath: task.outputPath,
      data: task.data,
      methods
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
export async function renderTemplate(options: RenderTemplateOptions): Promise<string> {
  const templatePath =
    options.builtin && !path.isAbsolute(options.template)
      ? path.join(getBuiltinTemplateDir(), options.template)
      : options.template;

  return renderEjs({
    template: templatePath,
    data: options.data
  });
}


