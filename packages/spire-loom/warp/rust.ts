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

import { EXTERNAL_LAYER_CORE, ExternalLayer } from './layers.js';

// ============================================================================
// Metadata Symbols (for property access without collision)
// ============================================================================

export const RUST_TYPE = Symbol('rust:type');
export const RUST_STRUCT_MARK = Symbol('rust:struct');
export const RUST_STRUCT_FIELDS = Symbol('rust:structFields');

/**
 * Wrapper types for Rust values
 */
export type RustWrapper = 'Mutex' | 'Option' | 'Arc' | 'RwLock' | 'Result';

/**
 * Metadata attached to class fields by @rust.Mutex, @rust.Option, etc.
 */
export interface RustFieldMetadata {
  type?: string;
  parentStruct?: Struct;
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
export class RustExternalLayer extends ExternalLayer<RustCore> {
  static [EXTERNAL_LAYER_CORE] = RustCore;

  /** Field name if this represents a struct field */
  fieldName?: string;
  /** Wrapper types (Mutex, Option, etc.) */
  fieldWrappers?: RustWrapper[];
  returnWrappers?: RustWrapper[];
  /** Parent struct class (when this is a field) */
  parentStruct?: Struct;
  /** Target LanguageType (which can be a Struct itself) */
  target?: LanguageType | Struct;

  /**
   * Check if a class is marked as a Rust struct.
   */
  static isRustStruct(something: unknown): something is Struct {
    return typeof something === 'function' && (something as any)[RUST_STRUCT_MARK] === true;
  }

  /**
   * Check if a class is marked as a Rust struct.
   */
  isRustStruct(): this is Struct {
    return RustExternalLayer.isRustStruct(this);
  }
}

// ============================================================================
// Field Decorators - Attach wrapper metadata
// ============================================================================

export function createWrapperDecorator(
  wrapperType: 'returnWrappers' | 'fieldWrappers',
  wrapperName: RustWrapper
) {
  return function WrapperDecorator<T>(_target: T, context: ClassFieldDecoratorContext): void {
    if (context.kind !== 'field') {
      throw new Error(
        `@rust.${wrapperName} decorator can only be used on class fields, not on ${context.kind}`
      );
    }
    const fieldName = String(context.name);
    context.addInitializer(function () {
      if (!(this instanceof Struct)) {
        throw new Error(`@rust.${wrapperName} can only be used in RustExternalLayer`);
      }
      const meta = (this as any)[fieldName] as any;
      if (meta instanceof RustExternalLayer) {
        const wrappers = meta[wrapperType] ?? [];
        wrappers.push(wrapperName);
        meta[wrapperType] = wrappers;
        meta.parentStruct = this;
      }
    });
  };
}

/**
 * Mark a field as wrapped in a Rust Mutex.
 * Attaches minimal metadata: { [RUST_FIELD_WRAPPERS]: ['Mutex'] }
 */
export const Mutex = createWrapperDecorator('fieldWrappers', 'Mutex');

/**
 * Mark a field as wrapped in a Rust Option.
 * Attaches minimal metadata: { [RUST_FIELD_WRAPPERS]: ['Option'] }
 */
export const Option = createWrapperDecorator('fieldWrappers', 'Option');

/**
 * Mark a Struct as using Result<> return types.
 * Attaches minimal metadata: { [RUST_RETURN_WRAPPERS]: ['Result'] }
 */
export const Result = createWrapperDecorator('returnWrappers', 'Result');

/**
 * Helper to create type decorator functions.
 * Attaches the Rust type name to the field metadata.
 */
function createTypeDecorator(rustType: string) {
  return function <T>(_target: T, context: ClassFieldDecoratorContext): void {
    if (context.kind !== 'field') {
      throw new Error(
        `@rust.Mutex decorator can only be used on class fields, not on ${context.kind}`
      );
    }
    const fieldName = String(context.name);
    context.addInitializer(function () {
      if (!(this instanceof Struct)) {
        throw new Error(`@rust.${rustType} can only be used in RustExternalLayer`);
      }
      const meta = this as any;
      let fieldMap: Map<string, RustFieldMetadata> = meta[RUST_STRUCT_FIELDS];
      if (!fieldMap) {
        fieldMap = new Map();
        meta[RUST_STRUCT_FIELDS] = fieldMap;
      }

      const existing = fieldMap.get(fieldName) || {};
      fieldMap.set(fieldName, {
        ...existing,
        type: rustType,
        parentStruct: this
      });
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
export class Struct extends RustExternalLayer {
  //static [EXTERNAL_LAYER_CORE] = RustCore;
  [RUST_STRUCT_MARK] = true;
}

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
import type { LanguageMethod } from '../machinery/reed/method.js';
import type { LinkMetadata } from '../warp/metadata.js';

// ============================================================================
// Rust Invocation Generator
// ============================================================================

/**
 * Generate Rust code for invoking a method through an ExternalLayer link.
 *
 * This generates the unwrapping chain for Mutex/Option wrappers and calls
 * the actual method on the inner type.
 *
 * @param method - The LanguageMethod with link metadata
 * @param variablePath - The path to the struct instance (e.g., 'self.foundframe')
 * @returns The generated Rust invocation code
 *
 * @example
 * // For a method linked to foundframe.inner.core.thestream with wrappers [Mutex, Option]:
 * generateRustInvocation(method, 'self.foundframe')
 * // Returns: 'self.foundframe.thestream.lock().unwrap().as_ref().map(|s| s.add_bookmark(url)).transpose()?'
 */
export function generateRustInvocation(method: LanguageMethod, variablePath: string): string {
  const link = method.raw.link as LinkMetadata | undefined;
  if (!link) {
    throw new Error(
      `Method ${method.name} has no link metadata. Use @loom.link() on the Management.`
    );
  }

  // Extract field info from the link target
  const target = link.target as
    | {
        fieldName?: string;
        wrappers?: string[];
      }
    | undefined;

  if (!target?.fieldName) {
    throw new Error(`Link target for ${method.name} has no fieldName`);
  }

  const fieldName = target.fieldName;
  const wrappers = target.wrappers ?? [];
  const useResult = link.useResult ?? false;

  // Convert method name to snake_case for Rust
  // Build parameter list
  const params = method.raw.params.map((p) => p.name).join(', ');

  // Build the unwrapping chain
  let invocation = `${variablePath}.${fieldName}`;

  // Apply wrappers in order (outer to inner)
  for (const wrapper of wrappers) {
    switch (wrapper) {
      case 'Mutex':
        invocation += '.lock().unwrap()';
        break;
      case 'Option':
        invocation += '.as_ref()';
        break;
      case 'Arc':
      case 'RwLock':
        // These would need special handling, skip for now
        break;
    }
  }

  // Build the method call closure
  const methodCall = `s.${method.name}(${params})`;

  // Wrap in map to handle the Option<InnerType>
  if (wrappers.includes('Option')) {
    invocation += `.map(|s| ${methodCall})`;
  } else {
    invocation += `.${method.name}(${params})`;
  }

  // Handle Result wrapping
  if (useResult && wrappers.includes('Option')) {
    invocation += '.transpose()?'; // Convert Option<Result<T,E>> to Result<Option<T>,E>
  }

  return invocation;
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
class RustTypeFactory implements Partial<TypeFactory<LanguageType>> {
  // Entity type factory
  class(name: string, fields: Record<string, LanguageType>): LanguageType {
    const innerTypes = Object.entries(fields).map(
      ([fieldName, fieldType]) => new LanguageType(fieldName, fieldName, false, [fieldType])
    );
    return new LanguageType(name, name, false, innerTypes);
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
      },
      array: {
        template: (T: LanguageType) => `Vec<${T.name}>`,
        stub: 'Vec::new()'
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

      // Add invoke helper for generating ExternalLayer method calls
      // Usage in templates: {{ method.invoke('self.foundframe') }}
      Object.defineProperty(method, 'invoke', {
        get: () => generateRustInvocation.bind(null, method),
        enumerable: true,
        configurable: true
      });
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
    //classDecorator: Struct,
    core: {
      coreClass: RustCore,
      createCore: (layer?: RustExternalLayer) => rustCore(layer || new Struct())
    },
    spiralers: {
      android: RustAndroidSpiraler,
      desktop: DesktopSpiraler
    },
    exposeBaseFactory: true
  },

  codeGen: {
    types
  }
});
