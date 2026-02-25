/**
 * Hookup Types
 *
 * Type definitions for declarative hookups.
 * Hookup type is inferred from the file path.
 */

import type { GeneratorContext } from '../../heddles/index.js';

// ============================================================================
// Hookup Type Detection
// ============================================================================

export type HookupType =
  | 'android-manifest'
  | 'cargo-toml'
  | 'gradle'
  | 'rust-module'
  | 'kotlin'
  | 'typescript'
  | 'vite-config'
  | 'npm-package'
  | 'ios-plist'
  | 'file-block';

/**
 * Detect hookup type from file path.
 */
export function detectHookupType(filePath: string): HookupType {
  const lowerPath = filePath.toLowerCase();
  
  if (lowerPath.endsWith('androidmanifest.xml')) {
    return 'android-manifest';
  }
  if (lowerPath.endsWith('cargo.toml')) {
    return 'cargo-toml';
  }
  if (lowerPath.includes('build.gradle') || lowerPath.endsWith('.gradle.kts')) {
    return 'gradle';
  }
  if (lowerPath.endsWith('src/lib.rs') || lowerPath.endsWith('src/main.rs')) {
    return 'rust-module';
  }
  if (lowerPath.endsWith('.kt')) {
    return 'kotlin';
  }
  if (lowerPath.endsWith('index.ts') || lowerPath.endsWith('index.js')) {
    return 'typescript';
  }
  if (lowerPath.includes('vite.config')) {
    return 'vite-config';
  }
  if (lowerPath.endsWith('package.json')) {
    return 'npm-package';
  }
  if (lowerPath.endsWith('info.plist')) {
    return 'ios-plist';
  }
  
  return 'file-block';
}

// ============================================================================
// Base Hookup Interface
// ============================================================================

export interface BaseHookup {
  /** Target file path (relative to packageDir, or absolute) */
  path: string;
  /** Optional condition - skip if returns false */
  condition?: (context: GeneratorContext) => boolean;
}

// ============================================================================
// AndroidManifest.xml Hookup
// ============================================================================

export interface AndroidPermission {
  /** Android permission name (e.g., 'android.permission.FOREGROUND_SERVICE') */
  name: string;
  /** Additional XML attributes */
  [attr: string]: string | number | boolean | undefined;
}

export interface AndroidService {
  /** Service class name (e.g., '.service.MyService') */
  name: string;
  /** Process name (e.g., ':foundframe') */
  process?: string;
  /** Whether service is exported */
  exported?: boolean;
  /** Permission required to bind */
  permission?: string;
  /** Foreground service type */
  foregroundServiceType?: string;
  /** Additional XML attributes */
  [attr: string]: string | number | boolean | undefined;
}

/** Permission definition element type */
export type AndroidPermissionDefinition = {
  name: string;
  label?: string;
  protectionLevel?: string;
  [attr: string]: string | number | boolean | undefined;
};

export interface AndroidManifestHookup extends BaseHookup {
  path: `${string}AndroidManifest.xml`;
  
  /** Permissions to add to <manifest> */
  permissions?: AndroidPermission[];
  
  /** Permission definitions with custom protection levels */
  permissionDefinitions?: AndroidPermissionDefinition[];
  
  /** Services to add to <application> */
  services?: AndroidService[];
  
  /** Raw XML blocks to add to <application> */
  applicationBlocks?: string[];
  
  /** Raw XML blocks to add to <manifest> (outside <application>) */
  manifestBlocks?: string[];
}

// ============================================================================
// Cargo.toml Hookup
// ============================================================================

export interface CargoDependency {
  version?: string;
  path?: string;
  git?: string;
  branch?: string;
  features?: string[];
  optional?: boolean;
  defaultFeatures?: boolean;
}

/** Dependency value type */
export type CargoDependencyValue = string | CargoDependency;

export interface CargoTomlHookup extends BaseHookup {
  path: `${string}Cargo.toml`;
  
  /** Dependencies to add to [dependencies] or [workspace.dependencies] */
  dependencies?: Record<string, CargoDependencyValue>;
  
  /** Dev dependencies */
  devDependencies?: Record<string, CargoDependencyValue>;
  
  /** Build dependencies */
  buildDependencies?: Record<string, CargoDependencyValue>;
  
  /** Features to add to [features] */
  features?: Record<string, string[]>;
  
  /** [lib] configuration */
  lib?: {
    'crate-type'?: string[];
    name?: string;
    path?: string;
    [key: string]: unknown;
  };
  
  /** 
   * If true, modify workspace root Cargo.toml [workspace.dependencies]
   * instead of this package's [dependencies]
   */
  workspace?: boolean;
}

// ============================================================================
// Gradle Hookup
// ============================================================================

export interface GradlePlugin {
  id: string;
  version?: string;
  apply?: boolean;
}

/** Plugin entry type */
export type GradlePluginEntry = string | GradlePlugin;

export interface SpireGradleTask {
  /** Task name (e.g., 'buildRustCore') */
  name: string;
  /** Path to spire directory */
  targetDirectory: string;
  /** Cargo profile ('release', 'debug') */
  profile?: string;
  /** Additional task configuration */
  [key: string]: unknown;
}

export interface GradleHookup extends BaseHookup {
  path: `${string}build.gradle${string}`;
  
  /** Plugins to apply */
  plugins?: GradlePluginEntry[];
  
  /** Dependencies by configuration (implementation, api, etc.) */
  dependencies?: Record<string, string[]>;
  
  /** Android block configuration */
  android?: {
    /** Source sets configuration */
    sourceSets?: Record<string, {
      java?: { srcDirs?: string[] };
      aidl?: { srcDirs?: string[] };
    }>;
    [key: string]: unknown;
  };
  
  /** Spire Rust build task configuration */
  spireTask?: SpireGradleTask;
  
  /** Raw Gradle blocks to add */
  blocks?: Array<{
    name: string;
    content: string;
  }>;
}

// ============================================================================
// Rust Module Hookup (lib.rs / main.rs)
// ============================================================================

export interface RustModuleDeclaration {
  /** Module name */
  name: string;
  /** Path to module file (for #[path] attribute) */
  path?: string;
  /** Whether to declare as pub mod */
  pub?: boolean;
}

/** Module declaration entry type */
export type RustModuleEntry = string | RustModuleDeclaration;

export interface RustPluginInit {
  /** Function name for plugin init */
  fnName: string;
  /** State type to manage */
  stateType: string;
  /** Setup code to inject into .setup() closure */
  setup: string;
}

export interface RustModuleHookup extends BaseHookup {
  path: `${string}src/lib.rs` | `${string}src/main.rs`;
  
  /** Module declarations to add (e.g., 'pub mod spire;') */
  moduleDeclarations?: RustModuleEntry[];
  
  /** use statements to add */
  useStatements?: string[];
  
  /** 
   * Tauri plugin initialization.
   * If provided, injects plugin setup code.
   */
  pluginInit?: RustPluginInit;
  
  /** Commands to inject into tauri::generate_handler![] */
  tauriCommands?: string[];
}

// ============================================================================
// TypeScript Index Hookup (index.ts / index.js)
// ============================================================================

export interface TypeScriptExport {
  /** Source module path (e.g., '../spire/src/index.js') */
  source: string;
  /** Export all with star (export * from '...') */
  star?: boolean;
  /** Named exports (export { X, Y } from '...') */
  names?: string[];
}

/** Export entry type - can be raw line or structured */
export type TypeScriptExportEntry = string | TypeScriptExport;

export interface TypeScriptIndexHookup extends BaseHookup {
  path: `${string}index.ts` | `${string}index.js`;
  
  /** Export statements to add */
  exports?: TypeScriptExportEntry[];
  
  /** Import statements to add (for side effects or types) */
  imports?: TypeScriptImportEntry[];
}

export interface TypeScriptImport {
  /** Source module path */
  source: string;
  /** Import all as namespace (import * as X from '...') */
  namespace?: string;
  /** Default import name (import X from '...') */
  default?: string;
  /** Named imports (import { X, Y } from '...') */
  names?: string[];
  /** Type-only import (import type { ... } from '...') */
  typeOnly?: boolean;
}

/** Import entry type - can be raw line or structured */
export type TypeScriptImportEntry = string | TypeScriptImport;

// ============================================================================
// Vite Config Hookup (vite.config.ts / vite.config.js)
// ============================================================================

export interface ViteConfigHookup extends BaseHookup {
  path: `${string}vite.config.ts` | `${string}vite.config.js` | `${string}vite.config.mts`;
  
  /** 
   * Build configuration to add/modify.
   * Supports rollupOptions.input for multi-entry builds.
   */
  build?: {
    rollupOptions?: {
      /** Entry points - can be single string or multiple */
      input?: string | Record<string, string>;
    };
  };
  
  /** 
   * Environment variable defines to add.
   * Maps to define: { 'import.meta.env.X': JSON.stringify(value) }
   */
  define?: Record<string, string>;
  
  /**
   * Plugins to add to the plugins array.
   * Each plugin is a string that will be injected as code.
   */
  plugins?: string[];
  
  /**
   * Server configuration.
   */
  server?: {
    port?: number;
    host?: string | boolean;
  };
  
  /**
   * CSS configuration.
   */
  css?: {
    devSourcemap?: boolean;
  };
  
  /**
   * Raw config lines to append (escape hatch).
   */
  configLines?: string[];
}

// ============================================================================
// NPM Package Hookup (package.json)
// ============================================================================

export interface NpmPackageHookup extends BaseHookup {
  path: `${string}package.json`;
  
  /** Dependencies to add */
  dependencies?: Record<string, string>;
  
  /** Dev dependencies to add */
  devDependencies?: Record<string, string>;
  
  /** Peer dependencies to add */
  peerDependencies?: Record<string, string>;
  
  /** Scripts to add */
  scripts?: Record<string, string>;
  
  /** 
   * Any other top-level fields to set.
   * These are merged with existing package.json
   */
  fields?: Record<string, unknown>;
  
  /** 
   * Fields to remove if they exist.
   * Useful for cleaning up old configuration.
   */
  removeFields?: string[];
}

// ============================================================================
// iOS Info.plist Hookup
// ============================================================================

export interface IosPlistEntry {
  /** Plist key */
  key: string;
  /** Value type */
  type: 'string' | 'boolean' | 'number' | 'array' | 'dict';
  /** The value */
  value: unknown;
}

export interface IosPlistHookup extends BaseHookup {
  path: `${string}Info.plist`;
  
  /** Entries to add/update */
  entries?: IosPlistEntry[];
  
  /** URL scheme handlers to add */
  urlSchemes?: Array<{
    name: string;
    schemes: string[];
  }>;
  
  /** Background modes to enable */
  backgroundModes?: string[];
}

// ============================================================================
// Kotlin File Hookup (.kt files)
// ============================================================================

export interface KotlinClassModifications {
  /**
   * Field declarations to add to the class.
   * Each string should be a valid Kotlin field: "private var name: Type? = null"
   * Supports template functions.
   */
  fields?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
  
  /**
   * Method modifications by method name.
   * Key is the method name (e.g., 'load', 'onDestroy').
   */
  methods?: Record<string, KotlinMethodModifications>;
  
  /**
   * New methods to add to the class.
   * Each string should be a complete valid Kotlin method.
   * Supports template functions.
   */
  newMethods?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
}

export interface KotlinMethodModifications {
  /**
   * Code to prepend at the start of the method body.
   * Array of valid Kotlin statements.
   * Supports template functions.
   */
  prepend?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
  
  /**
   * Code to append at the end of the method body.
   * Array of valid Kotlin statements.
   * Supports template functions.
   */
  append?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
}

/** Method modification entry type */
export type KotlinMethodModificationEntry = KotlinMethodModifications;

export interface KotlinHookup extends BaseHookup {
  path: `${string}.kt`;
  
  /**
   * Import statements to add.
   * Each string should be a valid Kotlin import: "import package.ClassName"
   * Supports template functions: (ctx, data) => string
   */
  imports?: Array<string | ((context: GeneratorContext, data: Record<string, unknown>) => string)>;
  
  /**
   * Class modifications by class name.
   * Key is the simple class name (e.g., 'ApiPlugin').
   */
  classes?: Record<string, KotlinClassModifications>;
}

// Generic File Block Hookup (fallback)
// ============================================================================

export interface FileBlockHookup extends BaseHookup {
  path: string;
  
  /** Language for marker formatting */
  language: 'rust' | 'typescript' | 'javascript' | 'kotlin' | 'xml' | 'toml' | 'json' | 'gradle';
  
  /** 
   * Custom markers (if not using file-type defaults).
   * Most hookups auto-detect markers from file type.
   */
  markers?: {
    start: string;
    end: string;
  };
  
  /** Block content to insert */
  content: string;
  
  /** Insertion position hints */
  position?: {
    /** Insert after this pattern */
    after?: string;
    /** Insert before this pattern */
    before?: string;
  };
}

// ============================================================================
// Union Type
// ============================================================================

export type HookupSpec =
  | AndroidManifestHookup
  | CargoTomlHookup
  | GradleHookup
  | RustModuleHookup
  | KotlinHookup
  | ViteConfigHookup
  | NpmPackageHookup
  | IosPlistHookup
  | FileBlockHookup;

// ============================================================================
// Validation
// ============================================================================

// ============================================================================
// Result Types
// ============================================================================

export interface HookupResult {
  /** Path that was modified */
  path: string;
  /** Type of hookup applied */
  type: HookupType;
  /** Status of the operation */
  status: 'applied' | 'skipped' | 'error';
  /** Human-readable message */
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a hookup spec.
 */
export function validateHookup(spec: HookupSpec): ValidationResult {
  const errors: string[] = [];
  
  if (!spec.path) {
    errors.push('Hookup must have a path');
  }
  
  const hookupType = detectHookupType(spec.path);
  
  // Type-specific validation
  switch (hookupType) {
    case 'android-manifest': {
      const android = spec as AndroidManifestHookup;
      if (!android.permissions && !android.services && !android.applicationBlocks && !android.manifestBlocks) {
        errors.push('AndroidManifest hookup should have permissions, services, or blocks');
      }
      break;
    }
    case 'cargo-toml': {
      const cargo = spec as CargoTomlHookup;
      if (!cargo.dependencies && !cargo.devDependencies && !cargo.features && !cargo.lib) {
        errors.push('Cargo.toml hookup should have dependencies, features, or lib config');
      }
      break;
    }
    case 'rust-module': {
      const rust = spec as RustModuleHookup;
      if (!rust.moduleDeclarations && !rust.useStatements && !rust.pluginInit && !rust.tauriCommands) {
        errors.push('Rust module hookup should have moduleDeclarations, useStatements, pluginInit, or tauriCommands');
      }
      break;
    }
    case 'file-block': {
      const block = spec as FileBlockHookup;
      if (!block.content) {
        errors.push('File block hookup must have content');
      }
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
