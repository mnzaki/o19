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
import { fileURLToPath } from 'node:url';
import { mejs } from '../bobbin/mejs.js';
import type { GeneratedFile } from '../bobbin/index.js';

// Import the language registry and RawMethod
import { languages } from '../reed/language/index.js';
import type { Shed } from '../loom.js';
import type { LanguageDefinitionImperative } from '../reed/language/imperative.js';

// Import languages to ensure they register themselves
// This MUST happen before transformMethods is called
import '../../warp/rust.js';
import '../../warp/typescript.js';
import '../../warp/kotlin.js';
import '../../warp/aidl.js';

// ============================================================================
// Types
// ============================================================================

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
 * Pattern: {name}.{transform}.{ext}.mejs
 * - service.kt.mejs → kotlin
 * - jni_bridge.jni.rs.mejs → rust_jni
 * - platform.rs.mejs → rust
 * - interface.aidl.mejs → aidl
 *
 * Uses the language registry for detection.
 *
 * @param templatePath - Path to the EJS template
 */
export function detectLanguage(templatePath: string): LanguageDefinitionImperative | undefined {
  // Use language registry for detection
  return languages.detectByExtension(templatePath);
}

// ============================================================================
// Unified Generation API
// ============================================================================

/** The GeneratorOptions extend The Shed: all context we enhanced in the reed and heddles */
export interface GenerateOptions extends Shed {
  /** Template path (absolute or relative to builtin/workspace/templates) */
  template: string;
  /** Output file path (determines transformation language) */
  outputPath: string;
  /** Template data - 'methods' will be auto-transformed based on output extension */
  data: Record<string, unknown>;
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
 * Get path to built-in templates directory.
 */
function getBuiltinTemplateDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Templates are in machinery/bobbin/, not machinery/shuttle/
  return path.resolve(currentDir, '..', 'bobbin');
}

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
  // If absolute, use as-is (but normalize extension)
  if (path.isAbsolute(template)) {
    return ensureMejsExtension(template);
  }

  // Try .mejs first, then fall back to .ejs for backward compatibility
  const tryExtensions = [ensureMejsExtension(template), ensureEjsExtension(template)];

  // Check workspace first if provided
  if (workspaceRoot) {
    for (const templateWithExt of tryExtensions) {
      const workspaceTemplatePath = path.join(workspaceRoot, 'loom', 'bobbin', templateWithExt);
      if (fs.existsSync(workspaceTemplatePath)) {
        return workspaceTemplatePath;
      }
    }
  }

  // Check package templates if provided
  if (workspaceRoot && packagePath) {
    for (const templateWithExt of tryExtensions) {
      const packageTemplatePath = path.join(
        workspaceRoot,
        packagePath,
        'loom',
        'bobbin',
        templateWithExt
      );
      if (fs.existsSync(packageTemplatePath)) {
        return packageTemplatePath;
      }
    }
  }

  // Fall back to builtin templates (.mejs preferred)
  for (const templateWithExt of tryExtensions) {
    const builtinPath = path.join(getBuiltinTemplateDir(), templateWithExt);
    if (fs.existsSync(builtinPath)) {
      return builtinPath;
    }
  }

  // Return .mejs path even if not found (will fail gracefully later)
  return path.join(getBuiltinTemplateDir(), tryExtensions[0]);
}

/**
 * Ensure template path has .mejs extension
 * Handles paths that already have .ejs or .mejs
 */
function ensureMejsExtension(templatePath: string): string {
  if (templatePath.endsWith('.mejs')) {
    return templatePath;
  }
  if (templatePath.endsWith('.ejs')) {
    return templatePath.slice(0, -4) + '.mejs';
  }
  return `${templatePath}.mejs`;
}

/**
 * Ensure template path has .ejs extension (for backward compatibility)
 */
function ensureEjsExtension(templatePath: string): string {
  if (templatePath.endsWith('.ejs')) {
    return templatePath;
  }
  if (templatePath.endsWith('.mejs')) {
    return templatePath.slice(0, -5) + '.ejs';
  }
  return `${templatePath}.ejs`;
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
 *   template: 'android/service.kt.mejs',
 *   outputPath: '.../FoundframeService.kt',
 *   data: { serviceName: 'FoundframeService' },
 *   methods: rawMethods,  // Auto-transformed for Kotlin
 * });
 */
export async function generateCode(options: GenerateOptions): Promise<GeneratedFile> {
  // Determine template path (workspace first, package second, then builtin)
  const templatePath = resolveTemplatePath(
    options.template,
    options.workspaceRoot,
    options.packagePath
  );

  // Detect language from template filename (double extension pattern)
  // If no language is detected, proceed without language transformation
  const lang = detectLanguage(templatePath);
  if (lang) {
    if (process.env.DEBUG_LANG) {
      console.log(`[DEBUG_LANG] Setting language to ${lang.name} for ${options.template}`);
      console.log(`[DEBUG_LANG] Methods type: ${typeof options.methods}, has setLang: ${typeof options.methods?.setLang}`);
    }
    options.methods.setLang(lang);
    options.entities.setLang(lang);
  } else if (process.env.DEBUG_LANG) {
    console.log(`[DEBUG_LANG] No language detected for ${options.template}`);
  }

  // Build final data with prepared methods
  const data = {
    ...options,
    ...options.data,
    lang
  };

  // Render template with error handling
  let content: string;
  try {
    content = await mejs.renderFile({
      templatePath,
      data
    });
  } catch (error) {
    // Add context about what we were trying to generate
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to generate "${options.outputPath}"\n` +
      `  Output: ${options.outputPath}\n` +
      `  Template: ${options.template}\n` +
      `  Package: ${options.packagePath || 'unknown'}\n` +
      `  Reason: ${errorMessage}`
    );
  }

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
export async function generateBatch(tasks: GenerationTask[], shed: Shed): Promise<GeneratedFile[]> {
  const promises = tasks.map((task) =>
    generateCode({
      template: task.template,
      outputPath: task.outputPath,
      data: task.data,
      ...shed
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

  return mejs.renderFile({
    templatePath,
    data: options.data
  });
}
