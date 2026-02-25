/**
 * Stringing 🧵
 *
 * "The warp threads are strung through the heddles."
 *
 * Cross-cutting string case conversion and pattern mapping utilities.
 * Used across bobbin, sley, heddles, and treadle-kit for name transformations.
 *
 * These are the low-level pattern mapping tools that translate between
 * naming conventions: WARP names → code names → bind-point names.
 */

import type { RawMethod } from './bobbin/index.js';

// ============================================================================
// Case Conversions
// ============================================================================

/**
 * Convert string to PascalCase.
 * 
 * @example
 * pascalCase('my-service') // 'MyService'
 * pascalCase('my_service') // 'MyService'
 * pascalCase('myService')  // 'MyService'
 */
export function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to camelCase.
 * 
 * @example
 * camelCase('my_service') // 'myService'
 * camelCase('my-service') // 'myService'
 */
export function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert string to snake_case.
 * 
 * @example
 * toSnakeCase('MyService') // 'my_service'
 * toSnakeCase('myService') // 'my_service'
 * toSnakeCase('MyServiceName') // 'my_service_name'
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert camelCase/PascalCase to snake_case with handling for consecutive capitals.
 * More comprehensive than toSnakeCase for complex names.
 * 
 * @example
 * toSnakeCaseFull('HTTPRequest') // 'http_request'
 * toSnakeCaseFull('addBookmark') // 'add_bookmark'
 */
export function toSnakeCaseFull(name: string): string {
  return (
    name
      // Handle consecutive capitals: "HTTPRequest" -> "HTTP_Request"
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      // Handle camelCase: "addBookmark" -> "add_Bookmark"
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
  );
}

// ============================================================================
// Naming Patterns (Service & Package Naming)
// ============================================================================

/**
 * Service naming data for Android service generation.
 */
export interface ServiceNaming {
  /** The original affix (e.g., 'radicle') */
  nameAffix: string;
  /** PascalCase affix (e.g., 'Radicle') */
  pascalAffix: string;
  /** Full service name (e.g., 'FoundframeRadicleService') */
  serviceName: string;
  /** AIDL interface name (e.g., 'IFoundframeRadicle') */
  interfaceName: string;
  /** Log tag for Android logging */
  logTag: string;
  /** Android notification channel ID */
  channelId: string;
  /** Android notification channel name */
  channelName: string;
}

/**
 * Build service naming from core metadata and spiraler affix.
 * 
 * @param packageName - Base package name (e.g., 'foundframe')
 * @param nameAffix - Optional affix (e.g., 'radicle')
 * @returns Complete service naming data
 */
export function buildServiceNaming(packageName: string, nameAffix?: string): ServiceNaming {
  const pascalAffix = nameAffix ? pascalCase(nameAffix) : '';
  const coreNamePascal = pascalCase(packageName);

  const serviceName = pascalAffix
    ? `${coreNamePascal}${pascalAffix}Service`
    : `${coreNamePascal}Service`;

  const interfaceName = pascalAffix ? `I${coreNamePascal}${pascalAffix}` : `I${coreNamePascal}`;

  return {
    nameAffix: nameAffix || '',
    pascalAffix,
    serviceName,
    interfaceName,
    logTag: serviceName.toUpperCase().replace(/\s/g, '_'),
    channelId: serviceName.toLowerCase().replace(/\s/g, '_'),
    channelName: serviceName
  };
}

/**
 * Android package path data.
 */
export interface AndroidPackageData {
  /** Full Java package name (e.g., 'ty.circulari.o19') */
  packageName: string;
  /** Package path with slashes (e.g., 'ty/circulari/o19') */
  packagePath: string;
  /** JNI package path with underscores (e.g., 'ty_circulari_o19') */
  jniPackagePath: string;
}

/**
 * Build Android-specific package paths.
 * 
 * @param _basePackageName - Base package name (unused, kept for compatibility)
 * @param gradleNamespace - Gradle namespace (e.g., 'ty.circulari.o19')
 * @returns Android package path data
 */
export function buildAndroidPackageData(
  _basePackageName: string,
  gradleNamespace: string
): AndroidPackageData {
  return {
    packageName: gradleNamespace,
    packagePath: gradleNamespace.replace(/\./g, '/'),
    jniPackagePath: gradleNamespace.replace(/\./g, '_')
  };
}

// ============================================================================
// Wrapper Naming (Generic pattern for platform wrappers)
// ============================================================================

/**
 * Generic wrapper naming data.
 */
export interface WrapperNaming {
  /** The main wrapper name (e.g., 'MyService', 'MyPlugin') */
  wrapperName: string;
  /** Interface/protocol name (e.g., 'IMyService', 'MyPlatform') */
  interfaceName?: string;
  /** File/module name (e.g., 'my_service') */
  fileName?: string;
  /** Additional platform-specific names */
  [key: string]: string | undefined;
}

/**
 * Build generic wrapper naming from core name and affix.
 * 
 * @param coreName - Base core name (e.g., 'foundframe')
 * @param affix - Optional affix (e.g., 'radicle')
 * @param options - Naming pattern options
 * @returns Wrapper naming data
 * 
 * @example
 * // For Tauri plugin:
 * buildWrapperNaming('foundframe', 'radicle', {
 *   wrapperSuffix: 'Plugin',
 *   interfaceSuffix: 'Platform'
 * })
 * // { wrapperName: 'FoundframeRadiclePlugin', interfaceName: 'FoundframeRadiclePlatform', fileName: 'foundframe_radicle' }
 */
export function buildWrapperNaming(
  coreName: string,
  affix: string | undefined,
  options: {
    wrapperSuffix: string;
    interfaceSuffix?: string;
  }
): WrapperNaming {
  const pascalCore = pascalCase(coreName);
  const pascalAffix = affix ? pascalCase(affix) : '';
  
  const baseName = pascalAffix ? `${pascalCore}${pascalAffix}` : pascalCore;
  const snakeBase = affix ? `${toSnakeCase(coreName)}_${toSnakeCase(affix)}` : toSnakeCase(coreName);

  return {
    wrapperName: `${baseName}${options.wrapperSuffix}`,
    interfaceName: options.interfaceSuffix ? `${baseName}${options.interfaceSuffix}` : undefined,
    fileName: snakeBase
  };
}

/**
 * Create naming for an Android-style foreground service.
 *
 * @param coreName - The core package name (e.g., 'foundframe')
 * @param affix - Optional name affix (e.g., 'radicle')
 * @returns Wrapper naming
 */
export function buildAndroidServiceNaming(coreName: string, affix?: string): WrapperNaming {
  const naming = buildServiceNaming(coreName, affix);
  return {
    ...naming,
    wrapperName: naming.serviceName,
    interfaceName: naming.interfaceName,
    fileName: toSnakeCase(naming.serviceName)
  };
}

/**
 * Create naming for a Tauri-style plugin.
 *
 * @param coreName - The core package name (e.g., 'foundframe')
 * @param affix - Optional name affix
 * @returns Wrapper naming
 */
export function buildTauriPluginNaming(coreName: string, affix?: string): WrapperNaming {
  return buildWrapperNaming(coreName, affix, {
    wrapperSuffix: 'Plugin',
    interfaceSuffix: 'Platform'
  });
}

// ============================================================================
// Type Mapping (AIDL)
// ============================================================================

/**
 * Map internal type representation to AIDL type.
 * AIDL supports: primitives, String, Parcelable, arrays, interfaces
 * 
 * @param type - The internal type (e.g., 'String', 'i32', 'Vec<u8>')
 * @returns The AIDL type (e.g., 'String', 'int', 'byte[]')
 */
export function mapToAidlType(type: string): string {
  // Handle nullable marker
  const isNullable = type.startsWith('?');
  const baseType = isNullable ? type.slice(1) : type;
  
  // Map to AIDL type
  switch (baseType.toLowerCase()) {
    // Primitives
    case 'string':
      return 'String';
    case 'i32':
    case 'int':
      return 'int';
    case 'i64':
    case 'long':
      return 'long';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'f32':
    case 'float':
      return 'float';
    case 'f64':
    case 'double':
      return 'double';
    case 'u8':
    case 'byte':
      return 'byte';
    // Arrays
    case 'vec<u8>':
    case 'bytes':
      return 'byte[]';
    case 'vec<string>':
      return 'String[]';
    // Complex types - assume Parcelable for now
    default:
      return baseType;
  }
}

/**
 * Extended parameter with AIDL type information.
 */
export interface AidlParam {
  name: string;
  type: string;
  optional?: boolean;
  /** AIDL type for the parameter */
  aidlType?: string;
  /** Direction qualifier ('in', 'out', 'inout') */
  direction?: 'in' | 'out' | 'inout';
}

/**
 * Extended RawMethod with AIDL-specific type information.
 */
export interface AidlMethod extends RawMethod {
  /** AIDL return type */
  aidlReturnType?: string;
  /** Parameters with AIDL types */
  params: AidlParam[];
}

/**
 * Map method parameters for AIDL generation.
 * Adds AIDL-specific type info and direction qualifiers.
 * 
 * @param params - Raw parameters to transform
 * @returns Parameters with AIDL type information added
 */
export function addAidlTypesToParams(params: Array<{ name: string; type: string; optional?: boolean }>): AidlParam[] {
  return params.map(param => ({
    ...param,
    aidlType: mapToAidlType(param.type),
    direction: 'in' // Default: client sends data to service
  }));
}

/**
 * Add AIDL type information to all methods.
 * Adds aidlReturnType and aidlType to each method's params.
 * 
 * @param methods - Raw methods to transform
 * @returns Methods with AIDL type information added
 */
export function addAidlTypesToMethods(methods: RawMethod[]): AidlMethod[] {
  return methods.map(method => ({
    ...method,
    aidlReturnType: mapToAidlType(method.returnType),
    params: addAidlTypesToParams(method.params)
  }));
}
