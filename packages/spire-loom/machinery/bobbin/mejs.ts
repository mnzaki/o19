/**
 * MEJS - Moustacheod-EJS Template System 🧵
 *
 * A unified template engine that provides moustacheod-style syntax
 * ({{ }}, {% %}) while using EJS under the hood.
 *
 * This module hides EJS completely from the rest of the library.
 * Always import mejs and use its API directly.
 *
 * @example
 * ```typescript
 * import { mejs } from './mejs.js';
 *
 * // Render a template string
 * const output = await mejs.render({
 *   template: 'Hello {{ name }}!',
 *   data: { name: 'World' }
 * });
 *
 * // Render from file
 * const output = await mejs.renderFile({
 *   templatePath: 'template.rs.mejs',
 *   data: { name: 'World' }
 * });
 *
 * // Preprocess only (convert mejs syntax to EJS)
 * const ejsTemplate = mejs.preprocess('{% if x %}{{ y }}{% endif %}');
 * ```
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { snakeCase, camelCase, pascalCase } from '../stringing.js';

// ============================================================================
// EJS Integration (Hidden)
// ============================================================================

// EJS will be dynamically imported
import ejs from 'ejs';

// ============================================================================
// Template Loading (Internal)
// ============================================================================

const templateCache = new Map<string, string>();

function loadTemplate(templatePath: string): string {
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath)!;
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'utf-8');
  templateCache.set(templatePath, content);
  return content;
}

// ============================================================================
// Preprocessor (mejs syntax → EJS)
// ============================================================================

interface PreprocessorOptions {
  /** Whether to enable HTML escaping by default (default: false for code gen) */
  escapeByDefault?: boolean;
  /** Whether to enable control flow simplification (default: true) */
  simplifyControlFlow?: boolean;
}

const defaultPreprocessorOptions: Required<PreprocessorOptions> = {
  escapeByDefault: false,
  simplifyControlFlow: true,
};

function hasJavaScriptBraces(code: string): boolean {
  return /[{}]/.test(code);
}

/**
 * Preprocess mejs syntax to EJS format with custom { } delimiters.
 *
 * EJS will be configured to use { } as open/close delimiters, so:
 * - {% code %} stays as {% code %} (EJS scriptlet with custom delimiters)
 * - {%- expr %} stays as {%- expr %} (unescaped output)
 * - {%= expr %} stays as {%= expr %} (escaped output)
 * - {%# comment %} stays as {%# comment %} (comment)
 *
 * We only need to convert:
 * - {{ expr }} → {%- expr %} (mejs output → EJS unescaped output)
 * - {h expr } → {%= expr %} (mejs html-escaped → EJS escaped output)
 * - {_ expr } → {%-_ expr %} (trim trailing)
 * - {{_ expr _}} → {%-_ expr _%} (trim both)
 * - {# comment #} → {%# comment %} (comments)
 * - Control flow simplification: {% if x %} → {%_ if (x) { _%}
 */
export function preprocessTemplate(template: string, options: PreprocessorOptions = {}): string {
  const opts = { ...defaultPreprocessorOptions, ...options };
  
  let result = template;

  // === STEP 1: COMMENTS ===
  // {# comment #} → {%# comment %}
  result = result.replace(/\{#\s*([\s\S]*?)\s*#\}/g, '{%# $1 %}');

  // === STEP 2: WHITESPACE-TRIMMED VARIANTS (process before standard forms) ===
  
  // {{_ expr _}} → {%-_ expr _%} (unescaped, trim both sides)
  result = result.replace(/\{\{_\s*([\s\S]*?)\s*_\}\}/g, '{%-_ $1 _%}');
  
  // {_ expr _h} → {%=_ expr _%} (escaped, trim both sides)
  result = result.replace(/\{_\s*([\s\S]*?)\s*_h\}/g, '{%=_ $1 _%}');
  
  // {_ expr } → {%-_ expr %} (unescaped, trim trailing)
  result = result.replace(/\{_\s*([\s\S]*?)\s*\}/g, '{%-_ $1 %}');
  
  // {h_ expr } → {%=_ expr %} (escaped, trim leading)
  result = result.replace(/\{h_\s*([\s\S]*?)\s*\}/g, '{%=_ $1 %}');

  // === STEP 3: STANDARD OUTPUT FORMS ===
  
  // {h expr } → {%= expr %} (escaped output)
  result = result.replace(/\{h\s*([\s\S]*?)\s*\}/g, '{%= $1 %}');
  
  // {{ expr }} → {%- expr %} (unescaped output, default for code gen)
  // Use negative lookbehind/lookahead to handle triple braces correctly:
  // {{{ expr }}} should be parsed as { + {{ expr }} + }, not {{ + { expr } + }}
  // (?<!\{) ensures not preceded by {, (?!\}) ensures not followed by }
  result = result.replace(/\{\{(?!\{)\s*([\s\S]*?)(?<!\})\s*\}\}/g, opts.escapeByDefault ? '{%= $1 %}' : '{%- $1 %}');

  // === STEP 4: CONTROL FLOW SIMPLIFICATION ===
  if (opts.simplifyControlFlow) {
    result = simplifyControlFlow(result);
  }

  // === STEP 5: CODE BLOCK WHITESPACE TRIMMING ===
  // For remaining {% ... %} blocks that don't have special prefixes, add trailing trim
  // Match {% ... %} but not {%- ..., {%= ..., {%_ ..., {%# ..., {%+
  // Preserve the original whitespace behavior: keep content as-is, just add _%} at end
  result = result.replace(/\{%(?!\s*[\-=_%#+])\s*([^%\n][^%]*?)\s*%\}/g, '{% $1 _%}');

  return result;
}

function simplifyControlFlow(template: string): string {
  let result = template;
  
  // Match {% tag ... %} patterns and convert to proper JavaScript control flow
  // The underscore prefix/suffix means "trim whitespace"
  
  // End blocks (no content to check)
  result = result.replace(/\{\%\s*endif\s*\%\}/g, '{%_ } _%}');
  result = result.replace(/\{\%\s*endfor\s*\%\}/g, '{%_ } _%}');
  result = result.replace(/\{\%\s*endwhile\s*\%\}/g, '{%_ } _%}');

  // Else (no condition to check)
  result = result.replace(/\{\%\s*else\s*\%\}/g, '{%_ } else { _%}');

  // Helper to replace only if content doesn't have JavaScript braces
  const simplify = (pattern: RegExp, replacement: string) => {
    result = result.replace(pattern, (match, ...args) => {
      // Check if any captured group has braces
      const hasBraces = args.slice(0, -2).some((arg) => 
        typeof arg === 'string' && hasJavaScriptBraces(arg)
      );
      if (hasBraces) {
        return match; // Leave unchanged - raw JavaScript
      }
      // Apply replacement with captured groups
      return replacement.replace(/\$(\d+)/g, (_, n) => args[parseInt(n) - 1] ?? '');
    });
  };

  // Else-if/elif/elseif with condition
  simplify(/\{\%\s*else\s+if\s+(.+?)\s*\%\}/g, '{%_ } else if ($1) { _%}');
  simplify(/\{\%\s*elif\s+(.+?)\s*\%\}/g, '{%_ } else if ($1) { _%}');
  simplify(/\{\%\s*elseif\s+(.+?)\s*\%\}/g, '{%_ } else if ($1) { _%}');

  // While with condition
  simplify(/\{\%\s*while\s+(.+?)\s*\%\}/g, '{%_ while ($1) { _%}');

  // For loops - "for item in items" syntax
  simplify(/\{\%\s*for\s+(\w+)\s+in\s+(.+?)\s*\%\}/g, '{%_ for (const $1 of $2) { _%}');
  
  // For loops - classic JS syntax (e.g., "for i=0; i<10; i++")
  simplify(/\{\%\s*for\s+(.+?)\s*\%\}/g, '{%_ for ($1) { _%}');

  // If with condition
  simplify(/\{\%\s*if\s+(.+?)\s*\%\}/g, '{%_ if ($1) { _%}');

  return result;
}

// ============================================================================
// Post-processing
// ============================================================================

/**
 * Post-process rendered output to clean up artifacts.
 */
function postprocessOutput(output: string): string {
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

// ============================================================================
// Template Helpers
// ============================================================================

const templateHelpers = {
  snakeCase: snakeCase,
  camelCase,
  pascalCase,

  kebabCase(str: string): string {
    return snakeCase(str).replace(/_/g, '-');
  },

  indent(str: string, spaces = 2): string {
    const prefix = ' '.repeat(spaces);
    return str
      .split('\n')
      .map((line) => prefix + line)
      .join('\n');
  },

  rustDoc(str: string): string {
    return str
      .split('\n')
      .map((line) => `/// ${line}`)
      .join('\n');
  },

  jsDoc(str: string): string {
    return str
      .split('\n')
      .map((line) => ` * ${line}`)
      .join('\n');
  }
};

// ============================================================================
// Rendering
// ============================================================================

interface RenderOptions {
  /** Template string to render */
  template: string;
  /** Data to pass to template */
  data: Record<string, unknown>;
}

interface RenderFileOptions extends Omit<RenderOptions, 'template'> {
  /** Template file path */
  templatePath: string;
}

interface GenerateOptions extends RenderFileOptions {
  /** Output file path */
  outputPath: string;
}

/**
 * Render a mejs template string to output.
 *
 * Automatically preprocesses mejs syntax before rendering.
 */
function render(options: RenderOptions & { templatePath?: string }): string {
  // Preprocess: mejs syntax → EJS with { } delimiters
  const ejsTemplate = preprocessTemplate(options.template);

  try {
    // Render with EJS using custom { } delimiters
    return ejs.render(ejsTemplate, { h: templateHelpers, ...options.data }, {
      openDelimiter: '{',
      closeDelimiter: '}',
    });
  } catch (error) {
    // Enhance error with template information
    const templateInfo = options.templatePath ? `\n  Template: ${options.templatePath}` : '';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Show context around the error if possible
    let contextInfo = '';
    if (errorMessage.includes('while compiling ejs') && error instanceof SyntaxError) {
      contextInfo = '\n  Hint: Check for syntax errors in MEJS tags ({{ }}, {% %})';
    }
    
    throw new Error(
      `Template rendering failed:${templateInfo}\n  Error: ${errorMessage}${contextInfo}`
    );
  }
}

/**
 * Process a template through full pipeline.
 * Preprocess → Render → Postprocess
 */
export async function processTemplate(
  template: string,
  data: Record<string, unknown>
): Promise<string> {
  const rendered = await render({ template, data });
  return postprocessOutput(rendered);
}

/**
 * Render a mejs template file to output.
 */
export async function renderFile(options: RenderFileOptions): Promise<string> {
  const template = loadTemplate(options.templatePath);
  return render({ template, data: options.data, templatePath: options.templatePath });
}

/**
 * Generate a file from a mejs template.
 * Returns true if file was created/changed, false if already existed with same content.
 */
export async function generate(options: GenerateOptions): Promise<boolean> {
  const rendered = await renderFile({
    templatePath: options.templatePath,
    data: options.data
  });

  // Check if content is the same
  if (fs.existsSync(options.outputPath)) {
    const existing = fs.readFileSync(options.outputPath, 'utf-8');
    if (existing === rendered) {
      return false;
    }
  }

  // Write file
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, rendered, 'utf-8');
  return true;
}

/**
 * Create an inline template function.
 *
 * @example
 * ```typescript
 * const tpl = mejs.inline`Hello {{ name }}!`;
 * const result = await tpl({ name: 'World' });
 * ```
 */
export function inline(
  strings: TemplateStringsArray,
  ...values: unknown[]
): (data: Record<string, unknown>) => Promise<string> {
  const template = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');

  return async (data: Record<string, unknown>) => {
    return render({ template, data });
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Render a mejs template string.
 * Main entry point for template rendering.
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return render({ template, data });
}

/**
 * MEJS template system - unified API for template processing.
 *
 * This is the primary export. All template operations go through mejs.
 */
export const mejs = {
  /** Render a template string with data */
  renderTemplate,

  /** Render a template file */
  renderFile,

  /** Full pipeline: render + postprocess */
  processTemplate,

  /** Generate a file from a template */
  generate,

  /** Create an inline template function */
  inline,

  /** Template helpers available in all templates */
  templateHelpers
};

// ============================================================================
// Internal Test API
// ============================================================================

/**
 * Internal functions exposed for testing.
 * Not part of the public API - may change without notice.
 */
export const _test = {
  preprocess: preprocessTemplate,
  postprocess: postprocessOutput,
  process: processTemplate,
  defaultOptions: defaultPreprocessorOptions
};

export default mejs;
