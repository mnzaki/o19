/**
 * Type Mappings
 * 
 * Central registry for type conversions between TypeScript (source of truth)
 * and various target languages/platforms.
 * 
 * The warp (WARP.ts) uses TypeScript types. The weft (generated code) uses
 * platform-specific types. This module bridges that gap.
 * 
 * Used by treadles (generators) to transform Management metadata before
 * passing to bobbin templates.
 */

export interface TypeMapping {
  /** TypeScript type name (lowercase for matching) */
  tsType: string;
  /** Kotlin type name */
  kotlin: string;
  /** JNI type for Rust function signatures */
  jni: string;
  /** Rust type name */
  rust: string;
  /** Tauri/TypeScript binding type */
  tauri: string;
}

/**
 * Core type mappings from TypeScript to target platforms.
 * 
 * These are the primitive types. Complex types (interfaces, classes)
 * typically serialize to String/JSON for cross-language boundaries.
 */
const CORE_MAPPINGS: TypeMapping[] = [
  { tsType: 'string',  kotlin: 'String',  jni: 'JString',   rust: 'String', tauri: 'string' },
  { tsType: 'number',  kotlin: 'Int',     jni: 'jint',      rust: 'i32',    tauri: 'number' },
  { tsType: 'boolean', kotlin: 'Boolean', jni: 'jboolean',  rust: 'bool',   tauri: 'boolean' },
  { tsType: 'bool',    kotlin: 'Boolean', jni: 'jboolean',  rust: 'bool',   tauri: 'boolean' },
  { tsType: 'void',    kotlin: 'Unit',    jni: '()',        rust: '()',     tauri: 'void' },
];

/**
 * Lookup table for fast type resolution.
 */
const TYPE_MAP = new Map<string, TypeMapping>();
for (const mapping of CORE_MAPPINGS) {
  TYPE_MAP.set(mapping.tsType.toLowerCase(), mapping);
}

/**
 * Get the complete type mapping for a TypeScript type.
 * 
 * @param tsType - TypeScript type name (case insensitive)
 * @returns Full type mapping or undefined if not found
 */
export function getTypeMapping(tsType: string): TypeMapping | undefined {
  return TYPE_MAP.get(tsType.toLowerCase());
}

/**
 * Map TypeScript type to Kotlin type.
 * 
 * @param tsType - TypeScript type name
 * @param isCollection - Whether this is a collection type (Array, List, etc.)
 * @returns Kotlin type name
 * 
 * @example
 * mapToKotlinType('string') // 'String'
 * mapToKotlinType('string', true) // 'List<String>'
 * mapToKotlinType('unknown') // 'String' (fallback)
 */
export function mapToKotlinType(tsType: string, isCollection: boolean = false): string {
  const mapping = getTypeMapping(tsType);
  const baseType = mapping?.kotlin ?? 'String';
  return isCollection ? `List<${baseType}>` : baseType;
}

/**
 * Map TypeScript type to JNI type for Rust.
 * 
 * @param tsType - TypeScript type name
 * @returns JNI type name (JString, jint, etc.)
 * 
 * @example
 * mapToJniType('string') // 'JString'
 * mapToJniType('number') // 'jint'
 */
export function mapToJniType(tsType: string): string {
  return getTypeMapping(tsType)?.jni ?? 'JString';
}

/**
 * Map TypeScript type to Rust type.
 * 
 * @param tsType - TypeScript type name
 * @returns Rust type name
 * 
 * @example
 * mapToRustType('string') // 'String'
 * mapToRustType('number') // 'i32'
 */
export function mapToRustType(tsType: string): string {
  return getTypeMapping(tsType)?.rust ?? 'String';
}

/**
 * Map TypeScript type to Tauri binding type.
 * 
 * @param tsType - TypeScript type name
 * @returns Tauri type name
 */
export function mapToTauriType(tsType: string): string {
  return getTypeMapping(tsType)?.tauri ?? 'string';
}

// ============================================================================
// JNI Conversion Code Generation
// ============================================================================

/**
 * Generate Rust code to convert a JNI parameter to Rust type.
 * 
 * This generates the conversion logic that goes inside JNI functions.
 * 
 * @param paramName - Name of the parameter variable
 * @param tsType - TypeScript type of the parameter
 * @returns Rust code snippet for conversion
 * 
 * @example
 * generateJniToRustConversion('homeDir', 'string')
 * // 'let homeDir: String = env.get_string(&homeDir).expect("Failed to get homeDir").into();'
 * 
 * @example
 * generateJniToRustConversion('count', 'number')
 * // '// count is already i32'
 */
export function generateJniToRustConversion(paramName: string, tsType: string): string {
  const rustType = mapToRustType(tsType);
  
  switch (tsType.toLowerCase()) {
    case 'string':
      return `let ${paramName}: ${rustType} = env.get_string(&${paramName}).expect("Failed to get ${paramName}").into();`;
    case 'number':
    case 'boolean':
    case 'bool':
      return `// ${paramName} is already ${rustType}`;
    default:
      return `let ${paramName}: ${rustType} = env.get_string(&${paramName}).expect("Failed to get ${paramName}").into();`;
  }
}

/**
 * Generate Rust code to convert a Rust return value to JNI type.
 * 
 * @param varName - Name of the variable holding the result
 * @param tsType - TypeScript return type
 * @returns Rust code snippet for conversion
 * 
 * @example
 * generateRustToJniConversion('result', 'string')
 * // 'env.new_string(&result).expect("Failed to create Java string").into_raw()'
 */
export function generateRustToJniConversion(varName: string, tsType: string): string {
  switch (tsType.toLowerCase()) {
    case 'string':
      return `env.new_string(&${varName}).expect("Failed to create Java string").into_raw()`;
    case 'number':
      return `${varName} as jint`;
    case 'boolean':
    case 'bool':
      return `${varName} as jboolean`;
    case 'void':
      return '';
    default:
      return `env.new_string(&${varName}).expect("Failed to create Java string").into_raw()`;
  }
}

/**
 * Get the JNI error value for a given return type.
 * 
 * This is what to return when a JNI call fails.
 * 
 * @param tsType - TypeScript return type
 * @returns Rust expression for error value
 * 
 * @example
 * getJniErrorValue('string') // 'std::ptr::null_mut()'
 * getJniErrorValue('number') // '-1'
 */
export function getJniErrorValue(tsType: string): string {
  switch (tsType.toLowerCase()) {
    case 'string':
      return 'std::ptr::null_mut()';
    case 'number':
      return '-1';
    case 'boolean':
    case 'bool':
      return '0';
    case 'void':
      return '';
    default:
      return 'std::ptr::null_mut()';
  }
}

// ============================================================================
// Complex Type Handling
// ============================================================================

/**
 * Check if a type is a primitive (has a direct mapping).
 * 
 * @param tsType - TypeScript type name
 * @returns true if primitive, false if complex
 */
export function isPrimitiveType(tsType: string): boolean {
  return TYPE_MAP.has(tsType.toLowerCase());
}

/**
 * Get the serialization strategy for a type.
 * 
 * Complex types need to be serialized for cross-language boundaries.
 * Currently defaults to JSON for all complex types.
 * 
 * @param tsType - TypeScript type name
 * @returns Serialization strategy
 */
export function getSerializationStrategy(tsType: string): 'json' | 'direct' {
  return isPrimitiveType(tsType) ? 'direct' : 'json';
}

/**
 * Register a custom type mapping.
 * 
 * Use this to extend the type system with domain-specific types.
 * 
 * @param mapping - The type mapping to register
 * 
 * @example
 * registerTypeMapping({
 *   tsType: 'NodeId',
 *   kotlin: 'String',
 *   jni: 'JString',
 *   rust: 'NodeId',
 *   tauri: 'string'
 * });
 */
export function registerTypeMapping(mapping: TypeMapping): void {
  TYPE_MAP.set(mapping.tsType.toLowerCase(), mapping);
}
