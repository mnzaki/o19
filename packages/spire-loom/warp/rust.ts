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

// Use Symbol.metadata (Stage 3 standard) for decorator metadata
// This is stored on the class and accessible via context.metadata
const RUST_FIELD_META = Symbol('rust:fieldMeta');

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
 */
export function Struct<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
): T {
  // Get field metadata from Symbol.metadata
  const metadata = (context.metadata as any) || {};
  const fieldMeta = metadata[RUST_FIELD_META] || new Map();

  // Store metadata on the class for later access
  (target as any).__rustFields = fieldMeta;
  (target as any)[RUST_STRUCT_MARK] = true;

  return createRustStructClass(target);
}

/**
 * Create a Rust struct class that returns RustExternalLayer instances
 * when its properties are accessed.
 */
function createRustStructClass<T extends new (...args: any[]) => any>(OriginalClass: T) {
  const fieldMeta = (OriginalClass as any).__rustFields || new Map();

  class RustStructClass extends RustExternalLayer {
    static [RUST_STRUCT_MARK] = true;
    static __originalClass = OriginalClass;
    static __rustFields = fieldMeta;

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
