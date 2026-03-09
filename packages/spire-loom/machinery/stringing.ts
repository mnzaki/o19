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

export type NamingCase =
  | 'snake_case'
  | 'camelCase'
  | 'PascalCase'
  | 'SCREAMING_SNAKE'
  | 'kebab-case';

export class Name {
  readonly parts: string[];
  constructor(
    name: string | string[],
    public defaultCase: NamingCase = 'SCREAMING_SNAKE'
  ) {
    if (Array.isArray(name)) {
      this.parts = name;
    } else if (name.includes('-')) {
      // kebab-case
      this.parts = name.split('-');
    } else if (name.includes('_')) {
      // snake_case or SCREAMING_SNAKE
      this.parts = name.split('_');
    } else {
      // it's camelCase or PascalCase
      this.parts = name.split(/(?=[A-Z])/);
    }

    for (let i = 0; i < this.parts.length; i++) {
      this.parts[i] = this.parts[i].toLowerCase();
    }
  }

  static of(name: string | Name) {
    if (name instanceof Name) return name;
    else return new Name(name);
  }

  withSuffix(part: string) {
    return new Name([...this.parts, part], this.defaultCase);
  }

  withNewDefault(defaultCase: NamingCase) {
    return new Name(this.parts, defaultCase);
  }

  apply(caseName: NamingCase | null): string {
    switch (caseName ?? this.defaultCase) {
      case 'snake_case':
        return this.snakeCase;
      case 'camelCase':
        return this.camelCase;
      case 'PascalCase':
        return this.pascalCase;
      case 'SCREAMING_SNAKE':
        return this.screamingSname;
      case 'kebab-case':
        return this.kebabCase;
      default:
        throw new Error(`Unknown case: ${caseName}`);
    }
  }

  get snakeCase() {
    return this.parts.join('_');
  }
  get kebabCase() {
    return this.parts.join('-');
  }
  get camelCase() {
    return this.parts.map((p, i) => (i == 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');
  }
  get pascalCase() {
    return this.parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
  get screamingSname() {
    return this.parts.join('_').toUpperCase();
  }

  toString(): string {
    return this.apply(this.defaultCase);
  }
}

// ============================================================================
// Case Conversions
// ============================================================================

/**
 * Formats a name according to naming convention.
 * Uses utilities from machinery/stringing.ts
 */
export function formatName(name: string, convention: NamingCase | null | undefined): string {
  if (!convention) return name;

  switch (convention) {
    case 'snake_case':
      return snakeCase(name);
    case 'camelCase':
      return camelCase(name);
    case 'PascalCase':
      return pascalCase(name);
    case 'SCREAMING_SNAKE':
      return snakeCase(name).toUpperCase();
    case 'kebab-case':
      return snakeCase(name).replace(/_/g, '-');
    default:
      return name;
  }
}

/**
 * Convert string to PascalCase.
 *
 * @example
 * pascalCase('my-service') // 'MyService'
 * pascalCase('my_service') // 'MyService'
 * pascalCase('myService')  // 'MyService'
 */
export const pascalCase = (str: string) => new Name(str, 'PascalCase').toString();

/**
 * Convert string to camelCase.
 *
 * @example
 * camelCase('my_service') // 'myService'
 * camelCase('my-service') // 'myService'
 * camelCase('MyService')  // 'myService'
 */
export const camelCase = (str: string): string => new Name(str, 'camelCase').toString();

/**
 * Convert string to snake_case.
 *
 * @example
 * toSnakeCase('MyService') // 'my_service'
 * toSnakeCase('myService') // 'my_service'
 * toSnakeCase('MyServiceName') // 'my_service_name'
 */
export const snakeCase = (str: string): string => new Name(str, 'snake_case').toString();

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
  const snakeBase = affix ? `${snakeCase(coreName)}_${snakeCase(affix)}` : snakeCase(coreName);

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
    fileName: snakeCase(naming.serviceName)
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
// Crate Naming (Rust/Cargo)
// ============================================================================

/**
 * Rust crate naming data.
 * Handles conversion between Cargo crate names (with hyphens) and
 * Rust identifiers (with underscores).
 */
export interface CrateNaming {
  /** Original Cargo crate name (e.g., 'o19-foundframe') */
  crateName: string;
  /** Rust identifier with underscores (e.g., 'o19_foundframe') */
  rustIdentifier: string;
  /** Just the base name without prefix (e.g., 'foundframe') */
  baseName: string;
  /** PascalCase base name (e.g., 'Foundframe') */
  pascalBase: string;
}

/**
 * Convert a Cargo crate name to a valid Rust identifier.
 * Replaces hyphens with underscores.
 *
 * @example
 * toRustIdentifier('o19-foundframe') // 'o19_foundframe'
 * toRustIdentifier('my-crate-name')  // 'my_crate_name'
 */
export function toRustIdentifier(crateName: string): string {
  return crateName.replace(/-/g, '_');
}

/**
 * Extract the base name from a prefixed crate name.
 * Removes common prefixes like 'o19-'.
 *
 * @example
 * extractBaseName('o19-foundframe') // 'foundframe'
 * extractBaseName('my-crate')       // 'my-crate' (no recognized prefix)
 */
export function extractBaseName(crateName: string): string {
  // Remove common prefixes
  const prefixes = ['o19-', 'spire-'];
  for (const prefix of prefixes) {
    if (crateName.startsWith(prefix)) {
      return crateName.slice(prefix.length);
    }
  }
  return crateName;
}

/**
 * Build complete crate naming data from a Cargo crate name.
 *
 * @param crateName - The Cargo crate name (e.g., 'o19-foundframe')
 * @returns Complete crate naming data
 *
 * @example
 * buildCrateNaming('o19-foundframe')
 * // {
 * //   crateName: 'o19-foundframe',
 * //   rustIdentifier: 'o19_foundframe',
 * //   baseName: 'foundframe',
 * //   pascalBase: 'Foundframe'
 * // }
 */
export function buildCrateNaming(crateName: string): CrateNaming {
  const baseName = extractBaseName(crateName);
  return {
    crateName,
    rustIdentifier: toRustIdentifier(crateName),
    baseName,
    pascalBase: pascalCase(baseName)
  };
}
