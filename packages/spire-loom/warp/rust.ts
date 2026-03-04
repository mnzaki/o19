/**
 * Rust DSL - Metadata decorators for Rust type generation
 *
 * These decorators attach minimal metadata directly available at decoration time.
 * Heavy processing happens in heddles.
 *
 * Usage:
 *   @rust.Struct
 *   class Foundframe {
 *     @rust.Mutex
 *     @rust.Option
 *     device_manager = DeviceManager;  // attaches wrapper metadata
 *   }
 */

import { ExternalLayer } from './imprint.js';

// ============================================================================
// Metadata Symbols (for property access without collision)
// ============================================================================

export const RUST_WRAPPERS = Symbol('rust:wrappers');
export const RUST_TYPE = Symbol('rust:type');
export const RUST_STRUCT_MARK = Symbol('rust:struct');
export const RUST_STRUCT_CONFIG = Symbol('rust:structConfig');

// Use Symbol.metadata (Stage 3 standard) for decorator metadata
// This is stored on the class and accessible via context.metadata
const RUST_FIELD_META = Symbol('rust:fieldMeta');

/**
 * Configuration options for @rust.Struct decorator
 */
export interface RustStructOptions {
  /** 
   * If true, methods returning non-void will be wrapped in Result<T, E>.
   * This affects code generation for error handling patterns.
   */
  useResult?: boolean;
}

/**
 * Wrapper types for Rust values
 */
export type RustWrapper = 'Mutex' | 'Option' | 'Arc' | 'RwLock';

/**
 * Metadata attached to class fields by @rust.Mutex, @rust.Option, etc.
 */
export interface RustFieldMetadata {
  [RUST_WRAPPERS]?: RustWrapper[];
  [RUST_TYPE]?: string;
}

// ============================================================================
// Base External Layer
// ============================================================================

/**
 * Base class for Rust external types.
 * Can be subclassed by @rust.Struct or used directly.
 * 
 * The generic parameter T carries the struct class type for type-safe field access.
 */
export class RustExternalLayer<T = any> extends ExternalLayer {
  /** Field name if this represents a struct field */
  fieldName?: string;
  /** Wrapper types (Mutex, Option, etc.) */
  wrappers?: RustWrapper[];
  /** Parent struct class (when this is a field) */
  structClass?: T;

  /**
   * Check if a class is marked as a Rust struct.
   */
  static isRustStruct(target: unknown): boolean {
    return typeof target === 'function' && (target as any)[RUST_STRUCT_MARK] === true;
  }

  /**
   * Get field metadata from a Rust struct class.
   */
  static getFieldMetadata(target: unknown): Map<string, RustFieldMetadata> | undefined {
    if (typeof target !== 'function') return undefined;
    return (target as any).__rustFields;
  }
}

// ============================================================================
// Field Decorators - Attach wrapper metadata
// ============================================================================

/**
 * Mark a field as wrapped in a Rust Mutex.
 * Attaches minimal metadata: { wrappers: ['Mutex'] }
 */
export function Mutex<T>(target: T, context: ClassFieldDecoratorContext): void {
  const key = String(context.name);

  // Use Symbol.metadata (Stage 3 standard)
  if (!context.metadata) {
    (context as any).metadata = {};
  }

  const meta = context.metadata as any;
  if (!meta[RUST_FIELD_META]) {
    meta[RUST_FIELD_META] = new Map();
  }

  const existing = meta[RUST_FIELD_META].get(key) || {};
  const wrappers = existing[RUST_WRAPPERS] || [];

  meta[RUST_FIELD_META].set(key, {
    ...existing,
    [RUST_WRAPPERS]: [...wrappers, 'Mutex']
  });
}

/**
 * Mark a field as wrapped in a Rust Option.
 * Attaches minimal metadata: { wrappers: ['Option'] }
 */
export function Option<T>(target: T, context: ClassFieldDecoratorContext): void {
  const key = String(context.name);

  // Use Symbol.metadata (Stage 3 standard)
  if (!context.metadata) {
    (context as any).metadata = {};
  }

  const meta = context.metadata as any;
  if (!meta[RUST_FIELD_META]) {
    meta[RUST_FIELD_META] = new Map();
  }

  const existing = meta[RUST_FIELD_META].get(key) || {};
  const wrappers = existing[RUST_WRAPPERS] || [];

  meta[RUST_FIELD_META].set(key, {
    ...existing,
    [RUST_WRAPPERS]: [...wrappers, 'Option']
  });
}

/**
 * Helper to create type decorator functions.
 * Attaches the Rust type name to the field metadata.
 */
function createTypeDecorator(rustType: string) {
  return function <T>(target: T, context: ClassFieldDecoratorContext): void {
    const key = String(context.name);

    if (!context.metadata) {
      (context as any).metadata = {};
    }

    const meta = context.metadata as any;
    if (!meta[RUST_FIELD_META]) {
      meta[RUST_FIELD_META] = new Map();
    }

    const existing = meta[RUST_FIELD_META].get(key) || {};
    meta[RUST_FIELD_META].set(key, {
      ...existing,
      [RUST_TYPE]: rustType
    });
  };
}

/**
 * Mark a field as Rust i64.
 * Usage: @rust.i64 nodeId: number
 */
export const i64 = createTypeDecorator('i64');

/**
 * Mark a field as Rust u64.
 * Usage: @rust.u64 timestamp: number
 */
export const u64 = createTypeDecorator('u64');

/**
 * Mark a field as Rust String.
 * Usage: @rust.string alias: string
 */
export const string = createTypeDecorator('String');

/**
 * Mark a field as Rust bool.
 * Usage: @rust.bool isOnline: boolean
 */
export const bool = createTypeDecorator('bool');

/**
 * Mark a field as Rust f64.
 * Usage: @rust.f64 score: number
 */
export const f64 = createTypeDecorator('f64');

/**
 * Mark a field as a Vec<T>.
 * The inner type should be specified via the field assignment:
 *   @rust.Vec followers: string[] = User
 */
export const Vec = createTypeDecorator('Vec');

// ============================================================================
// Type Helpers for Struct Field Definitions
// ============================================================================

/**
 * Type helper for defining Rust struct fields.
 * 
 * This is a compile-time only construct - it has zero runtime overhead.
 * Use with `declare` to add static field types to your struct class.
 * 
 * Usage:
 *   @rust.Struct
 *   export class Foundframe {
 *     @rust.Mutex @rust.Option thestream = TheStream;
 *     @rust.Mutex @rust.Option device_manager = DeviceManager;
 *   }
 *   // Add static field types:
 *   export declare module './WARP.ts' {
 *     interface Foundframe extends rust.StructFields<{
 *       thestream: rust.RustExternalLayer;
 *       device_manager: rust.RustExternalLayer;
 *     }> {}
 *   }
 */
export interface StructFields<Fields extends Record<string, RustExternalLayer>> {
  // Static field types are added here
}

// ============================================================================
// Class Decorators - Mark as Rust struct
// ============================================================================

/**
 * Mark a class as a Rust struct.
 * Attaches minimal metadata; field processing happens in heddles.
 * 
 * For proper TypeScript types on static fields, extend DefineStruct<Fields>:
 *   @rust.Struct
 *   export class MyStruct extends rust.DefineStruct<{ field: RustExternalLayer }> {
 *     @rust.Mutex field = SomeType;
 *   }
 * 
 * With configuration options:
 *   @rust.Struct({ useResult: true })
 *   export class MyStruct { ... }
 */
export function Struct<T extends new (...args: any[]) => any>(
  options: RustStructOptions
): (target: T, context: ClassDecoratorContext<T>) => T;
export function Struct<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
): T;
export function Struct<T extends new (...args: any[]) => any>(
  optionsOrTarget: RustStructOptions | T,
  context?: ClassDecoratorContext<T>
): T | ((target: T, context: ClassDecoratorContext<T>) => T) {
  // Overload 1: @rust.Struct({ useResult: true }) - with options
  if (typeof optionsOrTarget === 'object' && context === undefined) {
    const options = optionsOrTarget as RustStructOptions;
    return function(target: T, ctx: ClassDecoratorContext<T>): T {
      return applyStructDecorator(target, ctx, options);
    };
  }
  
  // Overload 2: @rust.Struct - without options
  return applyStructDecorator(optionsOrTarget as T, context!, {});
}

function applyStructDecorator<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>,
  options: RustStructOptions
): T {
  // Get field metadata from Symbol.metadata
  const metadata = (context.metadata as any) || {};
  const fieldMeta = metadata[RUST_FIELD_META] || new Map();

  // Store metadata on the class for later access
  (target as any).__rustFields = fieldMeta;
  (target as any)[RUST_STRUCT_MARK] = true;
  (target as any)[RUST_STRUCT_CONFIG] = options;

  return createRustStructClass(target);
}

/**
 * Create a Rust struct class that returns RustExternalLayer instances
 * when its properties are accessed.
 */
function createRustStructClass<T extends new (...args: any[]) => any>(OriginalClass: T) {
  const fieldMeta = (OriginalClass as any).__rustFields || new Map();
  const structConfig = (OriginalClass as any)[RUST_STRUCT_CONFIG];

  class RustStructClass extends RustExternalLayer {
    static [RUST_STRUCT_MARK] = true;
    static __originalClass = OriginalClass;
    static __rustFields = fieldMeta;
    static [RUST_STRUCT_CONFIG] = structConfig;

    static get [Symbol.for('rust:structName')](): string {
      return OriginalClass.name;
    }
  }

  Object.defineProperty(RustStructClass, 'name', {
    value: OriginalClass.name,
    writable: false
  });

  // Create accessors for each field - return RustExternalLayer instances
  for (const [fieldName, meta] of fieldMeta.entries()) {
    Object.defineProperty(RustStructClass, fieldName, {
      get: () => {
        const layer = new RustExternalLayer();
        layer.fieldName = fieldName;
        layer.wrappers = meta[RUST_WRAPPERS] || [];
        layer.structClass = RustStructClass; // Reference to parent struct
        return layer;
      },
      enumerable: true,
      configurable: true
    });
  }

  // Return type merges the struct class (T) with RustExternalLayer
  // This makes static fields available while preserving the base class behavior
  return RustStructClass as unknown as (new () => RustExternalLayer<T>) & T;
}

// ============================================================================
// Rust Data Types (for method signatures)
// ============================================================================

/**
 * A Rust method signature (for use in method metadata).
 * Pure metadata - no implementation.
 */
export class RustMethod {
  constructor(
    public params: RustDataType[],
    public returnType: RustDataType | RustExternalLayer
  ) {}
}

/**
 * A Rust data type (for params/returns).
 */
export class RustDataType {
  constructor(public rustType: string) {}
}

// ============================================================================
// Helper exports for heddles
// ============================================================================

/**
 * Get rust struct metadata from a class if it exists.
 * Used by heddles for further processing.
 */
export function getRustStructMetadata(
  target: unknown
): { name: string; fields: Map<string, RustFieldMetadata> } | undefined {
  if (!RustExternalLayer.isRustStruct(target)) {
    return undefined;
  }

  const ctor = target as any;
  return {
    name: ctor.name,
    fields: ctor.__rustFields || new Map()
  };
}

// ============================================================================
// Language Definition 🌾
//
// Self-registers Rust as a language with the reed system.
// This enables dynamic language discovery and code generation.
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
  type LanguageParam,
  type TransformEnhancer,
  type LanguageMethod,
} from '../machinery/reed/language/index.js';
import { toSnakeCase } from '../machinery/stringing.js';
import { RustCore, rustCore } from './spiral/rust.js';
import { RustAndroidSpiraler } from './spiral/spiralers/rust/index.js';
import { DesktopSpiraler } from './spiral/spiralers/desktop.js';

// ============================================================================
// Rust-Specific Types
// ============================================================================

/**
 * Rust parameter with language-specific metadata.
 */
interface RustParam extends LanguageParam {
  /** Rust type name (e.g., 'i64', 'String', 'Vec<T>') */
  rsType: string;
  /** snake_case parameter name */
  rsName: string;
}

/**
 * Rust method with language-specific metadata.
 */
interface RustMethod extends LanguageMethod<RustParam> {
  /** Rust return type (possibly wrapped in Result) */
  rsReturnType: string;
  /** Inner return type (without Result wrapper) for use in Result<innerReturnType, Error> */
  innerReturnType: string;
  /** snake_case implementation name for calling */
  implName: string;
  /** Service access preamble for error handling */
  serviceAccessPreamble: string[];
}

// ============================================================================
// Rust Type Factory
// ============================================================================

/**
 * Type factory for Rust code generation.
 * 
 * Defines how TypeScript types map to Rust types,
 * and provides stub return values for each type.
 */
class RustTypeFactory implements TypeFactory<RustParam, LanguageType> {
  // Primitive types
  boolean = new LanguageType('bool', 'false', true);
  string = new LanguageType('String', 'String::new()', true);
  number = new LanguageType('i64', '0', true);
  void = new LanguageType('()', '()', true);

  // Generic type factories
  array(itemType: LanguageType): LanguageType {
    return new LanguageType(`Vec<${itemType.name}>`, 'Vec::new()');
  }

  optional(innerType: LanguageType): LanguageType {
    return new LanguageType(`Option<${innerType.name}>`, 'None');
  }

  promise(innerType: LanguageType): LanguageType {
    // Rust async uses impl Future, but for signatures we often just use the inner
    return new LanguageType(`impl Future<Output = ${innerType.name}>`, 'async { todo!() }');
  }

  result(okType: LanguageType, errType: string | LanguageType = 'crate::Error'): LanguageType {
    const errName = typeof errType === 'string' ? errType : errType.name;
    return new LanguageType(`Result<${okType.name}, ${errName}>`, 'Ok(Default::default())');
  }

  // Entity type factory
  entity(name: string): LanguageType {
    return new LanguageType(name, `// Entity: ${name}\n    Default::default()`, false, true);
  }

  // Map TypeScript type to Rust type
  fromTsType(tsType: string, isCollection: boolean): LanguageType {
    // Handle TypeScript array syntax: T[] -> Vec<T>
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
        case 'date':
          // Date is typically represented as i64 (timestamp) or String in Rust
          return new LanguageType('String', 'String::new()', true);
        default:
          // Complex type / entity
          return this.entity(normalizedType);
      }
    })();

    return finalIsCollection ? this.array(baseType) : baseType;
  }
}

// ============================================================================
// Rust-Specific Transform Enhancer
// ============================================================================

/**
 * Custom enhancer adding Rust-specific metadata.
 * 
 * - Adds implName (snake_case)
 * - Generates service access preamble for Mutex/Option wrappers
 * 
 * Note: rsReturnType removed - use method.returnType (delegates to returnTypeDef.name)
 */
const rustEnhancer: TransformEnhancer<RustMethod, RustParam, RustMethod> = (methods) => {
  return methods.map((method) => {
    // Get link metadata for service access
    const link = (method as any).link;
    const preamble = buildServiceAccessPreamble(link);

    return {
      ...method,
      implName: toSnakeCase(method.implName || method.name),
      serviceAccessPreamble: preamble,
    } as RustMethod;
  });
};

/**
 * Build Rust service access preamble based on link metadata.
 * 
 * Handles wrapper patterns for struct fields:
 * - Mutex<Option<T>>: lock mutex, then access Option
 * - Option<Mutex<T>>: access Option, then lock Mutex
 * - Option<T>: optional services
 * - Mutex<T>: mutex-wrapped services
 */
function buildServiceAccessPreamble(link: { fieldName: string; wrappers?: string[] } | undefined): string[] {
  if (!link) {
    return ['let __service = foundframe;'];
  }

  const fieldName = link.fieldName;
  const wrappers = link.wrappers || [];

  // Determine wrapper order: decorators apply bottom-to-top
  const mutexIndex = wrappers.indexOf('Mutex');
  const optionIndex = wrappers.indexOf('Option');
  const mutexIsOuter = mutexIndex > optionIndex;

  if (wrappers.includes('Mutex') && wrappers.includes('Option')) {
    if (mutexIsOuter) {
      // Mutex<Option<T>> - lock first, then access Option
      return [
        `let __field = service.${fieldName}.as_ref().ok_or("${fieldName} not initialized")?;`,
        `let mut __service = __field.lock().map_err(|_| "${fieldName} mutex poisoned")?;`,
      ];
    } else {
      // Option<Mutex<T>> - access Option, then lock
      return [
        `let __field = service.${fieldName}.as_ref().ok_or("${fieldName} not initialized")?;`,
        `let mut __service = __field.lock().map_err(|_| "${fieldName} mutex poisoned")?;`,
      ];
    }
  }

  if (wrappers.includes('Option')) {
    return [`let __service = service.${fieldName}.as_ref().ok_or("${fieldName} not initialized")?;`];
  }

  if (wrappers.includes('Mutex')) {
    return [`let mut __service = service.${fieldName}.lock().map_err(|_| "${fieldName} mutex poisoned")?;`];
  }

  return [`let __service = service.${fieldName};`];
}

// ============================================================================
// Language Definition
// ============================================================================

/**
 * Rust language definition.
 *
 * Self-registers on module load. Uses the new classes-as-config architecture:
 * - TypeFactory provides rich type metadata
 * - Rendering config defines code formatting
 * - Transform is auto-generated from these primitives
 * - Custom enhancer adds Rust-specific metadata
 */
export const rustLanguage = declareLanguage<RustParam, LanguageType>({
  name: 'rust',

  codeGen: {
    fileExtensions: ['.rs.ejs', '.jni.rs.ejs'],
    
    // Type factory defines how TS types map to Rust
    types: new RustTypeFactory(),
    
    // Rendering config defines code formatting
    rendering: {
      formatParamName: toSnakeCase,
      functionSignature: (method) => {
        const params = method.params.map(p => `${p.formattedName}: ${p.langType}`).join(', ');
        return `fn ${method.snakeName}(${params}) -> ${method.returnTypeDef.name}`;
      },
      asyncFunctionSignature: (method) => {
        const params = method.params.map(p => `${p.formattedName}: ${p.langType}`).join(', ');
        return `async fn ${method.snakeName}(${params}) -> ${method.returnTypeDef.name}`;
      },
      renderDefinition: (method, opts) => {
        const pub = opts.public ? 'pub ' : '';
        const params = method.params.map(p => `${p.formattedName}: ${p.langType}`).join(', ');
        return `${pub}fn ${method.snakeName}(${params}) -> ${method.returnTypeDef.name}`;
      },
      naming: {
        function: 'snake',
        type: 'pascal',
        variable: 'snake',
        const: 'screaming_snake',
        module: 'snake'
      }
    },
    
    // Custom enhancer adds Rust-specific metadata
    enhancers: [rustEnhancer],
  },

  warp: {
    externalLayerClass: RustExternalLayer,
    fieldDecorators: {
      Mutex,
      Option,
      i64,
      u64,
      string,
      bool,
      f64,
      Vec
    },
    classDecorator: Struct,
    core: {
      coreClass: RustCore,
      createCore: (layer) => rustCore(layer || new RustExternalLayer())
    },
    spiralers: {
      android: RustAndroidSpiraler,
      desktop: DesktopSpiraler
    },
    exposeBaseFactory: true
  }
});
