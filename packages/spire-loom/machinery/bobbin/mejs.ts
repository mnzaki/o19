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
import { toSnakeCase, camelCase, pascalCase } from '../stringing.js';

// ============================================================================
// EJS Integration (Hidden)
// ============================================================================

// EJS will be dynamically imported
let ejsLib: typeof import('ejs') | null = null;

async function getEjs(): Promise<typeof import('ejs')> {
  if (!ejsLib) {
    ejsLib = await import('ejs');
  }
  return ejsLib;
}

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
  /** Custom delimiters to use (default: ['{{', '}}', '{%', '%}']) */
  delimiters?: [string, string, string, string];
}

const defaultPreprocessorOptions: Required<PreprocessorOptions> = {
  escapeByDefault: false,
  simplifyControlFlow: true,
  delimiters: ['{{', '}}', '{%', '%}']
};

function hasJavaScriptBraces(code: string): boolean {
  return /[{}]/.test(code);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Preprocess mejs syntax to EJS format.
 *
 * COMMENTS:
 * - {# comment #}   → <%# comment %>   (EJS comment, not output)
 *
 * CONTROL FLOW SIMPLIFICATION:
 * - {% if condition %}      → <%_ if (condition) { _%>
 * - {% elif condition %}    → <%_ } else if (condition) { _%>
 * - {% else if condition %} → <%_ } else if (condition) { _%>
 * - {% else %}              → <%_ } else { _%>
 * - {% endif %}             → <%_ } _%>
 * - {% for item in items %} → <%_ for (const item of items) { _%>
 * - {% endfor %}            → <%_ } _%>
 * - {% while condition %}   → <%_ while (condition) { _%>
 * - {% endwhile %}          → <%_ } _%>
 *
 * OUTPUT VARIANTS:
 * - {{ expr }}      → <%- expr %>     (unescaped output)
 * - {h expr }       → <%= expr %>     (html escaped)
 * - {_ expr }       → <%- expr _%>    (trim trailing)
 * - {{_ expr _}}    → <%-_ expr _%>   (trim both)
 */
export function preprocessTemplate(template: string, options: PreprocessorOptions = {}): string {
  const opts = { ...defaultPreprocessorOptions, ...options };
  const [outOpen, outClose, codeOpen, codeClose] = opts.delimiters;

  let result = template;

  // === COMMENTS ===
  // {# comment #} → <%# comment %>
  result = result.replace(/\{#\s*([\s\S]*?)\s*#\}/g, '<%# $1 %>');

  // === CONTROL FLOW SIMPLIFICATION ===
  if (opts.simplifyControlFlow) {
    result = simplifyControlFlow(result, codeOpen, codeClose);
  }

  // === WHITESPACE-TRIMMED OUTPUT VARIANTS ===
  result = result.replace(
    new RegExp(escapeRegex(outOpen) + '_\\s*([\\s\\S]*?)\\s*_' + escapeRegex(outClose), 'g'),
    '<%-_ $1 _%>'
  );

  result = result.replace(/\{_\s*([\s\S]*?)\s*_h\}/g, '<%=_ $1 _%>');

  result = result.replace(/\{_\s*([\s\S]*?)\s*\}/g, '<%-_ $1 %>');

  result = result.replace(/\{h_\s*([\s\S]*?)\s*\}/g, '<%=_ $1 %>');

  // === STANDARD OUTPUT FORMS ===
  result = result.replace(/\{h\s*([\s\S]*?)\s*\}/g, '<%= $1 %>');

  const outputRegex = new RegExp(
    escapeRegex(outOpen) + '\\s*([\\s\\S]*?)\\s*' + escapeRegex(outClose),
    'g'
  );
  result = result.replace(outputRegex, opts.escapeByDefault ? '<%= $1 %>' : '<%- $1 %>');

  // === CODE BLOCKS ===
  const codePreserveRegex = new RegExp(
    escapeRegex(codeOpen) + '\\+\\s*([\\s\\S]*?)\\s*' + escapeRegex(codeClose),
    'g'
  );
  result = result.replace(codePreserveRegex, '<% $1 %>');

  const codeRegex = new RegExp(
    escapeRegex(codeOpen) + '\\s*([\\s\\S]*?)\\s*' + escapeRegex(codeClose),
    'g'
  );
  result = result.replace(codeRegex, '<% $1 _%>');

  return result;
}

function simplifyControlFlow(template: string, codeOpen: string, codeClose: string): string {
  let result = template;
  const open = escapeRegex(codeOpen);
  const close = escapeRegex(codeClose);
  const ws = '\\s*';

  // Helper to replace only if content doesn't have JavaScript braces
  const simplify = (pattern: RegExp, replacement: string) => {
    result = result.replace(pattern, (match, ...args) => {
      // Check if any captured argument has braces (content groups)
      const hasBracesInContent = args
        .slice(0, -2)
        .some((arg) => typeof arg === 'string' && hasJavaScriptBraces(arg));
      // Also check the full inner content
      const innerContent = match.slice(codeOpen.length, match.length - codeClose.length);
      if (hasBracesInContent || hasJavaScriptBraces(innerContent)) {
        return match; // Leave unchanged - will be processed as raw EJS
      }
      // Apply replacement with captured groups
      return replacement.replace(/\$(\d+)/g, (_, n) => args[parseInt(n) - 1] ?? '');
    });
  };

  // End blocks (no content to check)
  result = result.replace(new RegExp(open + ws + 'endif' + ws + close, 'g'), '<%_ } _%>');
  result = result.replace(new RegExp(open + ws + 'endfor' + ws + close, 'g'), '<%_ } _%>');
  result = result.replace(new RegExp(open + ws + 'endwhile' + ws + close, 'g'), '<%_ } _%>');

  // Else (no condition to check)
  result = result.replace(new RegExp(open + ws + 'else' + ws + close, 'g'), '<%_ } else { _%>');

  // Else-if/elif with condition
  simplify(
    new RegExp(open + ws + 'else' + ws + 'if' + ws + '(.+?)' + ws + close, 'g'),
    '<%_ } else if ($1) { _%>'
  );
  simplify(
    new RegExp(open + ws + 'elif' + ws + '(.+?)' + ws + close, 'g'),
    '<%_ } else if ($1) { _%>'
  );

  // While with condition
  simplify(
    new RegExp(open + ws + 'while' + ws + '(.+?)' + ws + close, 'g'),
    '<%_ while ($1) { _%>'
  );

  // For loops
  simplify(
    new RegExp(open + ws + 'for' + ws + '(\\w+)' + ws + 'in' + ws + '(.+?)' + ws + close, 'g'),
    '<%_ for (const $1 of $2) { _%>'
  );
  simplify(new RegExp(open + ws + 'for' + ws + '(.+?)' + ws + close, 'g'), '<%_ for ($1) { _%>');

  // If with condition
  simplify(new RegExp(open + ws + 'if' + ws + '(.+?)' + ws + close, 'g'), '<%_ if ($1) { _%>');

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
  snakeCase: toSnakeCase,
  camelCase,
  pascalCase,

  kebabCase(str: string): string {
    return toSnakeCase(str).replace(/_/g, '-');
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
async function render(options: RenderOptions): Promise<string> {
  const ejs = await getEjs();

  // Preprocess: mejs syntax → EJS
  const ejsTemplate = preprocessTemplate(options.template);

  // Render with EJS
  return ejs.render(
    ejsTemplate,
    { h: templateHelpers, ...options.data },
    {
      beautify: true,
      escape: (str: string) => str // No escaping for code generation
    }
  );
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
  return render({ template, data: options.data });
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
export async function renderTemplate(
  template: string,
  data: Record<string, unknown>
): Promise<string> {
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
