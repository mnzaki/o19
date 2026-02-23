/**
 * Template Generation Tools
 *
 * Tools for generating code from EJS templates.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// EJS will be dynamically imported
let ejs: typeof import('ejs') | null = null;

async function getEjs(): Promise<typeof import('ejs')> {
  if (!ejs) {
    ejs = await import('ejs');
  }
  return ejs;
}

// ============================================================================
// Template Loading
// ============================================================================

const templateCache = new Map<string, string>();

/**
 * Load a template from file or cache.
 */
export function loadTemplate(templatePath: string): string {
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

/**
 * Get path to built-in templates directory.
 * Always runs from source via tsx.
 */
export function getBuiltinTemplateDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Running from source via tsx
  // Current: machinery/shuttle/template-renderer.ts
  // Templates: machinery/bobbin/
  return path.resolve(currentDir, '..', 'bobbin');
}

/**
 * Load a built-in template by name.
 */
export function loadBuiltinTemplate(name: string): string {
  const templateDir = getBuiltinTemplateDir();
  return loadTemplate(path.join(templateDir, name));
}

// ============================================================================
// EJS Rendering
// ============================================================================

export interface RenderOptions {
  /** Template file path (absolute or relative) */
  template?: string;
  /** Template string (alternative to template path) */
  templateString?: string;
  /** Data to pass to template */
  data: Record<string, unknown>;
  /** Output file path (if generating to file) */
  outputPath?: string;
  /** EJS options */
  ejsOptions?: import('ejs').Options;
}

/**
 * Render an EJS template to string.
 */
export async function renderEjs(options: Omit<RenderOptions, 'outputPath'>): Promise<string> {
  const ejsLib = await getEjs();
  
  let template: string;
  if (options.templateString) {
    template = options.templateString;
  } else if (options.template) {
    template = loadTemplate(options.template);
  } else {
    throw new Error('Either template or templateString must be provided');
  }
  
  return ejsLib.render(template, options.data, {
    beautify: true,
    ...options.ejsOptions,
  });
}

/**
 * Generate a file from an EJS template.
 * Returns true if file was created/changed, false if already existed with same content.
 */
export async function generateFromEjs(options: RenderOptions): Promise<boolean> {
  if (!options.outputPath) {
    throw new Error('outputPath is required for generateFromEjs');
  }
  
  const rendered = await renderEjs(options);
  
  // Check if content is the same
  if (fs.existsSync(options.outputPath)) {
    const existing = fs.readFileSync(options.outputPath, 'utf-8');
    if (existing === rendered) {
      return false; // No change needed
    }
  }
  
  // Write file
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, rendered, 'utf-8');
  return true;
}

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Built-in template helpers available in all templates.
 */
export const templateHelpers = {
  /**
   * Convert camelCase to snake_case
   */
  snakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },
  
  /**
   * Convert snake_case to camelCase
   */
  camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  },
  
  /**
   * Convert to PascalCase
   */
  pascalCase(str: string): string {
    const camel = templateHelpers.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },
  
  /**
   * Convert to kebab-case
   */
  kebabCase(str: string): string {
    return templateHelpers.snakeCase(str).replace(/_/g, '-');
  },
  
  /**
   * Indent each line by given number of spaces
   */
  indent(str: string, spaces = 2): string {
    const prefix = ' '.repeat(spaces);
    return str.split('\n').map(line => prefix + line).join('\n');
  },
  
  /**
   * Escape string for use in Rust doc comment
   */
  rustDoc(str: string): string {
    return str.split('\n').map(line => `/// ${line}`).join('\n');
  },
  
  /**
   * Escape string for use in JSDoc comment
   */
  jsDoc(str: string): string {
    return str.split('\n').map(line => ` * ${line}`).join('\n');
  },
  
  /**
   * Format a type from TypeScript to Rust
   */
  tsToRustType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'i64',
      'boolean': 'bool',
      'void': '()',
      'any': 'serde_json::Value',
    };
    
    // Handle arrays
    if (tsType.endsWith('[]')) {
      const inner = tsType.slice(0, -2);
      return `Vec<${templateHelpers.tsToRustType(inner)}>`;
    }
    
    // Handle optionals
    if (tsType.endsWith('?')) {
      const inner = tsType.slice(0, -1);
      return `Option<${templateHelpers.tsToRustType(inner)}>`;
    }
    
    return typeMap[tsType] ?? tsType;
  },
  
  /**
   * Format a type from TypeScript to Java
   */
  tsToJavaType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'long',
      'boolean': 'boolean',
      'void': 'void',
    };
    
    if (tsType.endsWith('[]')) {
      const inner = tsType.slice(0, -2);
      return `${templateHelpers.tsToJavaType(inner)}[]`;
    }
    
    if (tsType.endsWith('?')) {
      const inner = tsType.slice(0, -1);
      return `@Nullable ${templateHelpers.tsToJavaType(inner)}`;
    }
    
    return typeMap[tsType] ?? tsType;
  },
};

/**
 * Render template with standard helpers included in data.
 */
export async function renderWithHelpers(
  template: string,
  data: Record<string, unknown>
): Promise<string> {
  const ejsLib = await getEjs();
  const templateStr = loadTemplate(template);
  
  return ejsLib.render(templateStr, {
    ...templateHelpers,
    ...data,
    h: templateHelpers, // Short alias
  });
}

// ============================================================================
// Inline Templates
// ============================================================================

/**
 * Create an inline template function.
 * Usage:
 *   const tpl = inlineTemplate`Hello <%= name %>!`;
 *   const result = await tpl({ name: 'World' });
 */
export function inlineTemplate(
  strings: TemplateStringsArray,
  ...values: unknown[]
): (data: Record<string, unknown>) => Promise<string> {
  const template = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
  
  return async (data: Record<string, unknown>) => {
    const ejsLib = await getEjs();
    return ejsLib.render(template, { ...templateHelpers, ...data });
  };
}
