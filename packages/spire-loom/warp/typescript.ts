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

// ============================================================================
// Language Definition 🌾
//
// Self-registers TypeScript as a language with the reed system.
//
// Uses the new classes-as-config architecture:
// - TypeFactory for rich type definitions
// - Rendering config for code formatting
// - Auto-generated transform from primitives
// ============================================================================

import {
  declareLanguage,
  LanguageType,
  type TypeFactory,
  type LanguageParam
} from '../machinery/reed/language/index.js';
import { camelCase } from '../machinery/stringing.js';
import { TsCore, tsCore } from './spiral/typescript.js';
import { TypescriptSpiraler } from './spiral/spiralers/typescript/index.js';

// ============================================================================
// TypeScript-Specific Types
// ============================================================================

/**
 * TypeScript parameter with language-specific metadata.
 */
interface TypeScriptParam extends LanguageParam {
  /** TypeScript type name (e.g., 'string', 'number', 'T[]') */
  tsType: string;
}

// ============================================================================
// TypeScript Type Factory
// ============================================================================

/**
 * Type factory for TypeScript code generation.
 *
 * TypeScript types map 1:1 with TypeScript types (no transformation needed),
 * but we still define them explicitly for consistency with the architecture.
 */
class TypeScriptTypeFactory implements TypeFactory<TypeScriptParam, LanguageType> {
  // Primitive types
  boolean = new LanguageType('boolean', 'false', true);
  string = new LanguageType('string', "''", true);
  number = new LanguageType('number', '0', true);
  void = new LanguageType('void', 'undefined', true);

  // Generic type factories
  array(itemType: LanguageType): LanguageType {
    return new LanguageType(`${itemType.name}[]`, '[]');
  }

  optional(innerType: LanguageType): LanguageType {
    return new LanguageType(`${innerType.name} | undefined`, 'undefined');
  }

  promise(innerType: LanguageType): LanguageType {
    return new LanguageType(`Promise<${innerType.name}>`, 'Promise.resolve()');
  }

  result(okType: LanguageType, _errType?: string | LanguageType): LanguageType {
    // TypeScript typically doesn't use Result<T, E> pattern
    // but we provide it for compatibility with Rust patterns
    return new LanguageType(okType.name, okType.stubReturn);
  }

  // Entity type factory
  entity(name: string): LanguageType {
    return new LanguageType(name, `{} as ${name}`, false, true);
  }

  // Map TypeScript type to TypeScript type (identity mapping)
  fromTsType(tsType: string, isCollection: boolean): LanguageType {
    // Handle TypeScript array syntax: T[]
    let normalizedType = tsType.trim();
    let isArraySyntax = false;

    if (normalizedType.endsWith('[]')) {
      normalizedType = normalizedType.slice(0, -2).trim();
      isArraySyntax = true;
    }

    // Final collection flag is true if either passed in or detected from syntax
    const finalIsCollection = isCollection || isArraySyntax;

    const baseType = (() => {
      switch (normalizedType.toLowerCase()) {
        case 'string':
          return this.string;
        case 'number':
          return this.number;
        case 'boolean':
        case 'bool':
          return this.boolean;
        case 'void':
          return this.void;
        default:
          // Complex type / entity
          return this.entity(normalizedType);
      }
    })();

    return finalIsCollection ? this.array(baseType) : baseType;
  }
}

// ============================================================================
// Language Definition
// ============================================================================

/**
 * TypeScript language definition.
 *
 * Self-registers on module load. Uses the new classes-as-config architecture:
 * - TypeFactory provides rich type metadata
 * - Rendering config defines code formatting
 * - Transform is auto-generated from these primitives
 */
export const typescriptLanguage = declareLanguage<TypeScriptParam, LanguageType>({
  name: 'typescript',
  extensions: ['.ts', '.tsx'],

  conventions: {
    naming: {
      function: 'camelCase',
      type: 'PascalCase',
      variable: 'camelCase',
      const: 'SCREAMING_SNAKE',
      module: 'camelCase'
    }
  },

  codeGen: {
    // Type factory defines how types map (identity for TypeScript)
    types: new TypeScriptTypeFactory(),

    // Rendering config defines code formatting
    rendering: {
      formatParamName: camelCase,
      functionSignature: (method) => {
        const params = method.params
          .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.langType}`)
          .join(', ');
        return `${method.camelName}(${params}): ${method.returnTypeDef.name}`;
      },
      asyncFunctionSignature: (method) => {
        const params = method.params
          .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.langType}`)
          .join(', ');
        return `async ${method.camelName}(${params}): Promise<${method.returnTypeDef.name}>`;
      },
      renderDefinition: (method, opts) => {
        const export_ = opts.public ? 'export ' : '';
        const params = method.params
          .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.langType}`)
          .join(', ');
        return `${export_}function ${method.camelName}(${params}): ${method.returnTypeDef.name}`;
      }
    }

    // No custom enhancers needed for TypeScript - defaults are sufficient
  },

  warp: {
    externalLayerClass: TsExternalLayer,
    fieldDecorators: {
      Optional,
      String,
      Number,
      Boolean,
      Date
    },
    classDecorator: Class,
    core: {
      coreClass: TsCore,
      createCore: (layer) => tsCore(layer || new TsExternalLayer())
    },
    spiralers: {
      typescript: TypescriptSpiraler
    },
    exposeBaseFactory: true
  }
});
