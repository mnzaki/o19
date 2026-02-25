/**
 * TypeScript DSL - Metadata decorators for TypeScript type generation
 *
 * These decorators attach minimal metadata directly available at decoration time.
 * Heavy processing happens in heddles.
 */

import { ExternalLayer } from './imprint.js';

// ============================================================================
// Metadata Symbols (for property access without collision)
// ============================================================================

export const TS_CLASS_MARK = Symbol('typescript:class');
export const TS_CLASS_CONFIG = Symbol('typescript:classConfig');

// Use Symbol.metadata (Stage 3 standard) for decorator metadata
const TS_FIELD_META = Symbol('typescript:fieldMeta');

/**
 * Configuration options for @typescript.Class decorator
 */
export interface TsClassOptions {
  /**
   * Package name for the generated TypeScript code.
   * Defaults to the lowercase class name.
   */
  packageName?: string;
  /**
   * Path to the package directory (relative to workspace root).
   * Defaults to `packages/{packageName}`.
   */
  packagePath?: string;
}

/**
 * Metadata attached to class fields by TypeScript decorators.
 */
export interface TsFieldMetadata {
  type?: string;
  optional?: boolean;
}

// ============================================================================
// Base External Layer
// ============================================================================

/**
 * Base class for TypeScript external types.
 * Can be subclassed by @typescript.Class or used directly.
 */
export class TsExternalLayer<T = any> extends ExternalLayer {
  /** Field name if this represents a class field */
  fieldName?: string;
  /** Parent class (when this is a field) */
  parentClass?: T;

  /**
   * Check if a class is marked as a TypeScript class.
   */
  static isTsClass(target: unknown): boolean {
    return typeof target === 'function' && (target as any)[TS_CLASS_MARK] === true;
  }

  /**
   * Get field metadata from a TypeScript class.
   */
  static getFieldMetadata(target: unknown): Map<string, TsFieldMetadata> | undefined {
    if (typeof target !== 'function') return undefined;
    return (target as any).__tsFields;
  }
}

// ============================================================================
// Class Decorator
// ============================================================================

/**
 * Apply the TypeScript class decorator.
 * Marks the class as a TypeScript struct and stores metadata.
 */
function applyClassDecorator<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>,
  options: TsClassOptions
): T {
  // Mark the class as a TypeScript struct
  (target as any)[TS_CLASS_MARK] = true;
  (target as any)[TS_CLASS_CONFIG] = options;

  // Store field metadata on the class
  const fieldMeta = (context.metadata as any)?.[TS_FIELD_META];
  if (fieldMeta) {
    (target as any).__tsFields = fieldMeta;
  }

  return target;
}

/**
 * Mark a class as a TypeScript class for code generation.
 *
 * Usage:
 *   @typescript.Class
 *   class DB { }
 *
 *   @typescript.Class({ packageName: 'prisma' })
 *   class MyDatabase { }
 */
export function Class<T extends new (...args: any[]) => any>(
  options: TsClassOptions
): (target: T, context: ClassDecoratorContext<T>) => T;
export function Class<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
): T;
export function Class<T extends new (...args: any[]) => any>(
  optionsOrTarget: TsClassOptions | T,
  context?: ClassDecoratorContext<T>
): T | ((target: T, context: ClassDecoratorContext<T>) => T) {
  // Overload 1: @typescript.Class() - with options
  if (typeof optionsOrTarget === 'object' && context === undefined) {
    const options = optionsOrTarget as TsClassOptions;
    return function (target: T, ctx: ClassDecoratorContext<T>): T {
      return applyClassDecorator(target, ctx, options);
    };
  }

  // Overload 2: @typescript.Class - without options
  return applyClassDecorator(optionsOrTarget as T, context!, {});
}

// ============================================================================
// Field Decorators
// ============================================================================

/**
 * Mark a field as optional in TypeScript.
 * Attaches minimal metadata: { optional: true }
 */
export function Optional<T>(target: T, context: ClassFieldDecoratorContext): void {
  const key = global.String(context.name);

  // Use Symbol.metadata (Stage 3 standard)
  if (!context.metadata) {
    (context as any).metadata = {};
  }

  const meta = context.metadata as any;
  if (!meta[TS_FIELD_META]) {
    meta[TS_FIELD_META] = new Map();
  }

  const existing = meta[TS_FIELD_META].get(key) || {};

  meta[TS_FIELD_META].set(key, {
    ...existing,
    optional: true
  });
}

/**
 * Helper to create type decorator functions.
 * Attaches the TypeScript type name to the field metadata.
 */
function createTypeDecorator(tsType: string) {
  return function <T>(target: T, context: ClassFieldDecoratorContext): void {
    const key = global.String(context.name);

    if (!context.metadata) {
      (context as any).metadata = {};
    }

    const meta = context.metadata as any;
    if (!meta[TS_FIELD_META]) {
      meta[TS_FIELD_META] = new Map();
    }

    const existing = meta[TS_FIELD_META].get(key) || {};

    meta[TS_FIELD_META].set(key, {
      ...existing,
      type: tsType
    });
  };
}

// Type decorators
export const String = createTypeDecorator('string');
export const Number = createTypeDecorator('number');
export const Boolean = createTypeDecorator('boolean');
export const Date = createTypeDecorator('Date');
