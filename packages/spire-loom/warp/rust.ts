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
export const RUST_STRUCT_FIELDS = Symbol('rust:structFields');

// Use Symbol.metadata (Stage 3 standard) for decorator metadata
// This is stored on the class and accessible via context.metadata
const RUST_FIELD_META = Symbol('rust:fieldMeta');

class RustStruct extends LanguageType {
  [RUST_STRUCT_MARK] = true;
  [RUST_STRUCT_CONFIG]: RustStructOptions = {};
  [RUST_STRUCT_FIELDS] = new Map<string, RustFieldMetadata>();

  constructor(name: string, fields: Record<string, LanguageType>) {
    const stubFields = Object.values(fields).map((f) => `${f.name}: ${f.stub}`);
    const stubValue = `${name} {\n  ${stubFields.join(',\n  ')}\n}`;
    super(name, stubValue, false, [], false);
  }
}

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
  /** Target LanguageType (which can be a RustStruct itself) */
  target?: LanguageType;

  /**
   * Check if a class is marked as a Rust struct.
   */
  static isRustStruct(target: unknown): target is RustStruct {
    return typeof target === 'function' && (target as any)[RUST_STRUCT_MARK] === true;
  }

  /**
   * Check if a class is marked as a Rust struct.
   */
  isRustStruct(): this is RustStruct {
    return RustExternalLayer.isRustStruct(this);
  }

  /**
   * Get field metadata from a Rust struct class.
   */
  static getFieldMetadata(target: unknown): Map<string, RustFieldMetadata> | undefined {
    if (typeof target !== 'function') return undefined;
    return (target as any)[RUST_STRUCT_FIELDS];
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

export interface StructField {
  fieldName: string;
  type: LanguageType;
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
):
  | RustStructWithFields<T>
  | ((target: T, context: ClassDecoratorContext<T>) => RustStructWithFields<T>) {
  // Overload 1: @rust.Struct({ useResult: true }) - with options
  if (typeof optionsOrTarget === 'object' && context === undefined) {
    const options = optionsOrTarget as RustStructOptions;
    return function (target: T, ctx: ClassDecoratorContext<T>): RustStructWithFields<T> {
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
): RustStructWithFields<T> {
  // Get field metadata from Symbol.metadata
  const metadata = (context.metadata as any) || {};
  const fieldMeta = metadata[RUST_FIELD_META] || new Map();

  // Store metadata on the class for later access
  (target as any)[RUST_STRUCT_FIELDS] = fieldMeta;
  (target as any)[RUST_STRUCT_MARK] = true;
  (target as any)[RUST_STRUCT_CONFIG] = options;

  return createRustStructClass(target);
}

/**
 * Create a Rust struct class that returns RustExternalLayer instances
 * when its properties are accessed.
 */
function createRustStructClass<T extends new (...args: any[]) => any>(OriginalClass: T) {
  const fieldMeta = (OriginalClass as any)[RUST_STRUCT_FIELDS] || new Map();
  const structConfig = (OriginalClass as any)[RUST_STRUCT_CONFIG];

  class RustStructClass extends RustStruct {
    static __originalClass = OriginalClass;
    static [RUST_STRUCT_MARK] = true;
    static [RUST_STRUCT_FIELDS] = fieldMeta;
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
    const target = (OriginalClass as any)[fieldName];
    if (!(target instanceof LanguageType)) {
      throw new Error(`[rust] Field '${fieldName}' must be a LanguageType`);
    }
    const layer = new RustExternalLayer();
    layer.fieldName = fieldName;
    layer.wrappers = meta[RUST_WRAPPERS] || [];
    layer.structClass = RustStructClass; // Reference to parent struct
    layer.target = target;
    Object.defineProperty(RustStructClass.prototype, fieldName, {
      value: layer,
      enumerable: true,
      configurable: true
    });
  }

  // Return type merges the struct class (T) with RustExternalLayer
  // This makes static fields available while preserving the base class behavior
  return RustStructClass as unknown as RustStructWithFields<T>;
}

type RustStructWithFields<T extends new (...args: any[]) => any> = {
  new (): RustStruct & { [P in keyof T]: RustExternalLayer };
};

// ============================================================================
// Helper exports for heddles
// ============================================================================

/**
 * Get rust struct metadata from a class if it exists.
 * Used by heddles for further processing.
 */
//export function getRustStructMetadata(
//  target: unknown
//): { name: string; fields: Map<string, RustFieldMetadata> } | undefined {
//  if (!RustExternalLayer.isRustStruct(target)) {
//    return undefined;
//  }
//
//  const ctor = target as any;
//  return {
//    name: ctor.name,
//    fields: ctor[RUST_STRUCT_FIELDS] || new Map()
//  };
//}

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
  type TypeFactory
} from '../machinery/reed/language/index.js';
import { RustCore, rustCore } from './spiral/rust.js';
import { RustAndroidSpiraler } from './spiral/spiralers/rust/index.js';
import { DesktopSpiraler } from './spiral/spiralers/desktop.js';
import type { LanguageMethod } from '../machinery/reed/language/method.js';

// ============================================================================
// Rust Type Factory
// ============================================================================

/**
 * Type factory for Rust code generation.
 *
 * Defines how TypeScript types map to Rust types,
 * and provides stub return values for each type.
 */
class RustTypeFactory implements Partial<TypeFactory<LanguageType>> {
  // Entity type factory
  class(name: string, fields: Record<string, LanguageType>): LanguageType {
    return new RustStruct(name, fields);
  }

  // Generic type factories
  array(itemType: LanguageType): LanguageType {
    return new LanguageType(`Vec<${itemType}>`, 'Vec::new()');
  }

  optional(innerType: LanguageType): LanguageType {
    return new LanguageType(`Option<${innerType}>`, 'None');
  }

  promise(innerType: LanguageType): LanguageType {
    // Rust async uses impl Future, but for signatures we often just use the inner
    return new LanguageType(`impl Future<Output = ${innerType.name}>`, 'async { todo!() }');
  }

  result(okType: LanguageType, errType: string | LanguageType = 'crate::Error'): LanguageType {
    const errName = typeof errType === 'string' ? errType : errType.name;
    return new LanguageType(`Result<${okType}, ${errName}>`, 'Ok(Default::default())');
  }
}

// ============================================================================
// Language Definition
// ============================================================================

export const types = new RustTypeFactory();
/**
 * Rust language definition.
 *
 * Self-registers on module load. Uses the new classes-as-config architecture:
 * - TypeFactory provides rich type metadata
 * - Rendering config defines code formatting
 * - Transform is auto-generated from these primitives
 * - Custom enhancer adds Rust-specific metadata
 */
export const rustLanguage = declareLanguage<LanguageType>({
  name: 'rust',
  extensions: ['.rs', '.jni.rs'],
  types,
  conventions: {
    naming: {
      function: 'snake_case',
      type: 'PascalCase',
      variable: 'snake_case',
      const: 'SCREAMING_SNAKE',
      module: 'snake_case',
      field: 'snake_case',
      method: 'snake_case',
      parameter: 'snake_case',
      generic: 'PascalCase'
    }
  },
  functionVariants: {
    async: { prependKeyword: 'async' },
    unsafe: { prependKeyword: 'unsafe' },
    pub: { prependKeyword: 'pub' },
    result: {
      wrapReturnType: (returnType: LanguageType) => {
        // Don't double-wrap if already a Result
        if (!returnType.name.toString().startsWith('Result<')) {
          return types.result(returnType);
        }
        return returnType;
      }
    }
  },

  // Declare function variants that can be accessed via method.{variant}
  syntax: {
    keywords: {
      function: 'fn',
      public: 'pub'
    },
    functionReturnTypeSeparator: ' -> ',
    types: {
      boolean: {
        template: 'bool',
        stub: 'false'
      },
      string: {
        template: 'String',
        stub: 'String::new()'
      },
      signed: {
        template: 'i64',
        stub: '0'
      },
      unsigned: {
        template: 'u64',
        stub: '0'
      },
      number: {
        template: 'i64',
        stub: '0'
      },
      void: {
        template: '()',
        stub: '()'
      }
    }
  },

  // Language-specific enhancements applied when language is bound to methods
  enhancements: {
    methods: (method: LanguageMethod) => {
      // Result wrapping for methods tagged with 'rust:result'
      if (method.hasTag('rust:result')) {
        method.addVariance('result');
      }
    }
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
      createCore: (layer: RustExternalLayer) => rustCore(layer || new RustExternalLayer())
    },
    spiralers: {
      android: RustAndroidSpiraler,
      desktop: DesktopSpiraler
    },
    exposeBaseFactory: true
  }
});
