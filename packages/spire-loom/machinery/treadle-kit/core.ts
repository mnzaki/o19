/**
 * Treadle Kit - Core 🧰
 *
 * Low-level utilities for building treadles.
 * This is the foundation that both declarative and imperative treadles build upon.
 *
 * > *"The weaver's kit holds all the tools of the craft."*
 *
 * ## Usage
 *
 * ### Imperative Style (using the kit directly)
 * ```typescript
 * import { createTreadleKit } from '@o19/spire-loom/machinery/treadle-kit';
 *
 * export async function generateMyService(current, previous, context) {
 *   const kit = createTreadleKit(context);
 *
 *   // 1. Validate
 *   if (!kit.validateNodes(current, previous, { current: 'MySpiraler', previous: 'RustCore' })) {
 *     return [];
 *   }
 *
 *   // 2. Collect methods
 *   const methods = kit.collectMethods({
 *     filter: 'platform',
 *     pipeline: [addManagementPrefix]
 *   });
 *
 *   // 3. Build data
 *   const data = kit.buildData((context, current, previous) => ({
 *     serviceName: 'MyService'
 *   }));
 *
 *   // 4. Generate files
 *   const files = await kit.generateFiles([
 *     { template: 'my/service.ts.ejs', path: '...', language: 'typescript' }
 *   ], data, methods);
 *
 *   // 5. Hookup
 *   await kit.hookup.rustCrate(packageDir, 'spire');
 *
 *   return files;
 * }
 * ```
 */

import * as path from 'node:path';
import type {
  SpiralNode,
  GeneratedFile,
  GeneratorContext,
  WeavingPlan,
} from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import { filterByReach } from '../reed/index.js';
import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod, GenerateOptions } from '../bobbin/index.js';
import { generateCode } from '../bobbin/index.js';
import {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData,
} from '../shuttle/hookup-manager.js';
import { writeEventCallbackAidl } from '../bobbin/android.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Method filtering and transformation configuration.
 * Mirrors the type in declarative.ts for kit usage.
 */
export interface MethodConfig {
  /**
   * Filter by reach level.
   * - 'core': Core only (includes Private reach)
   * - 'platform': Core + Platform (Local reach)
   * - 'front': All rings (Global reach)
   */
  filter: 'core' | 'platform' | 'front';

  /**
   * Pipeline transformations to apply.
   */
  pipeline: Array<(methods: MgmtMethod[]) => MgmtMethod[]>;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert string to PascalCase.
 */
export function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert string to camelCase.
 */
export function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// ============================================================================
// Method Transformation
// ============================================================================

/**
 * Convert MgmtMethod to RawMethod with snake_case conversion.
 *
 * After addManagementPrefix(), method.name looks like "bookmark_addBookmark".
 * This converts the entire thing to snake_case for the bind-point.
 * The implName is the method part without the management prefix.
 * 
 * Includes enriched metadata from heddles (useResult, wrappers, fieldName).
 */
export function toRawMethod(method: MgmtMethod): RawMethod {
  // The name already has format "mgmtPrefix_methodName" (e.g., "bookmark_addBookmark")
  // Convert entire thing to snake_case: "bookmark_add_bookmark"
  const bindPointName = toSnakeCase(method.name);

  // Extract just the method name part for implName
  // Split by first underscore: "bookmark_add_bookmark" -> ["bookmark", "add_bookmark"]
  const firstUnderscore = bindPointName.indexOf('_');
  const implName = firstUnderscore > 0 ? bindPointName.slice(firstUnderscore + 1) : bindPointName;

  // Extract enriched metadata from heddles (stored in method.metadata)
  const heddlesMeta = method.metadata ?? {};

  return {
    name: bindPointName,
    implName,
    jsName: method.jsName || camelCase(method.name),
    returnType: method.returnType,
    isCollection: method.isCollection,
    params: method.params.map((p) => ({
      name: p.name,
      type: p.tsType,
      optional: p.optional,
    })),
    description: method.description || `${method.managementName}.${method.name}`,
    // Enriched fields from heddles (computed from ownership chain)
    useResult: heddlesMeta.useResult as boolean | undefined,
    link: heddlesMeta.fieldName ? {
      fieldName: heddlesMeta.fieldName as string,
      wrappers: heddlesMeta.wrappers as string[] | undefined,
    } : undefined,
  };
}

/**
 * Build MethodLink from management link metadata.
 */
export function buildMethodLink(
  mgmt: ManagementMetadata
): { fieldName: string; wrappers?: string[] } | undefined {
  if (!mgmt.link) return undefined;

  return {
    fieldName: mgmt.link.fieldName,
    wrappers: ['Option', 'Mutex'],
  };
}

/**
 * Extract management name from bind-point name.
 * Best-effort mapping since RawMethod doesn't have managementName.
 */
export function extractManagementFromBindPoint(
  bindPointName: string,
  managementNames: string[]
): string | undefined {
  const methodNameLower = bindPointName.toLowerCase();

  for (const mgmtName of managementNames) {
    const mgmtPrefix = toSnakeCase(mgmtName.replace(/Mgmt$/, ''));
    if (methodNameLower.startsWith(mgmtPrefix + '_')) {
      return mgmtName;
    }
  }
  return undefined;
}

// ============================================================================
// Data Building Helpers
// ============================================================================

export interface ServiceNaming {
  nameAffix: string;
  pascalAffix: string;
  serviceName: string;
  interfaceName: string;
  logTag: string;
  channelId: string;
  channelName: string;
}

/**
 * Build service naming from core metadata and spiraler affix.
 */
export function buildServiceNaming(
  packageName: string,
  nameAffix?: string
): ServiceNaming {
  const pascalAffix = nameAffix ? pascalCase(nameAffix) : '';
  const coreNamePascal = pascalCase(packageName);

  const serviceName = pascalAffix
    ? `${coreNamePascal}${pascalAffix}Service`
    : `${coreNamePascal}Service`;

  const interfaceName = pascalAffix
    ? `I${coreNamePascal}${pascalAffix}`
    : `I${coreNamePascal}`;

  return {
    nameAffix: nameAffix || '',
    pascalAffix,
    serviceName,
    interfaceName,
    logTag: serviceName.toUpperCase().replace(/\s/g, '_'),
    channelId: serviceName.toLowerCase().replace(/\s/g, '_'),
    channelName: serviceName,
  };
}

export interface AndroidPackageData {
  packageDir: string;
  packageName: string;
  packagePath: string;
  jniPackagePath: string;
}

/**
 * Build Android-specific package paths.
 */
export function buildAndroidPackageData(
  basePackageName: string,
  gradleNamespace: string
): AndroidPackageData {
  return {
    packageDir: `o19/crates/${basePackageName}-android`,
    packageName: gradleNamespace,
    packagePath: gradleNamespace.replace(/\./g, '/'),
    jniPackagePath: gradleNamespace.replace(/\./g, '_'),
  };
}

// ============================================================================
// Treadle Kit Implementation
// ============================================================================

export interface TreadleKit {
  /** The generator context */
  context: GeneratorContext;

  /** The weaving plan */
  plan: WeavingPlan;

  /**
   * Validate node types match expected pattern.
   * Returns true if valid, false if should skip silently.
   * Throws if invalid and should abort.
   */
  validateNodes(
    current: SpiralNode,
    previous: SpiralNode,
    expected: { current: string; previous: string }
  ): boolean;

  /**
   * Collect methods from managements with filtering and transformation.
   */
  collectMethods(config: MethodConfig): RawMethod[];

  /**
   * Build template data from a function or static object.
   */
  buildData(
    dataFn: (context: GeneratorContext, current: SpiralNode, previous: SpiralNode) => Record<string, unknown>,
    current: SpiralNode,
    previous: SpiralNode
  ): Record<string, unknown>;

  /**
   * Generate multiple files from templates.
   */
  generateFiles(
    outputs: Array<{
      template: string;
      path: string;
      language: 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript';
      condition?: (context: GeneratorContext) => boolean;
    }>,
    data: Record<string, unknown>,
    methods: RawMethod[]
  ): Promise<GeneratedFile[]>;

  /**
   * Standard hookup implementations.
   */
  hookup: {
    /**
     * Android-specific hookup: manifest, AIDL callback, Gradle config.
     */
    android(data: AndroidHookupData): Promise<void>;

    /**
     * TODO: Rust crate hookup.
     */
    rustCrate(packageDir: string, moduleName: string): void;

    /**
     * TODO: Tauri plugin hookup.
     */
    tauriPlugin(options: { libRsPath: string; commands: string[] }): void;
  };
}

/**
 * Create a treadle kit for building generators.
 */
export function createTreadleKit(context: GeneratorContext): TreadleKit {
  return {
    context,
    plan: context.plan,

    validateNodes(current, previous, expected): boolean {
      const currentType = current.typeName;
      const previousType = previous.typeName;

      if (currentType !== expected.current || previousType !== expected.previous) {
        if (process.env.DEBUG_MATRIX) {
          console.log(`[KIT] Skipping: ${currentType} → ${previousType} not ${expected.current} → ${expected.previous}`);
        }
        return false;
      }
      return true;
    },

    collectMethods(config): RawMethod[] {
      ensurePlanComplete(context.plan, 'collect methods in kit');

      // Filter by reach
      const filtered = filterByReach(context.plan.managements, config.filter);

      // Convert to MgmtMethod format
      const mgmtMethods: MgmtMethod[] = [];

      for (const mgmt of filtered) {
        for (const method of mgmt.methods) {
          mgmtMethods.push({
            id: `${mgmt.name}.${method.name}`,
            managementName: mgmt.name,
            name: method.name,
            jsName: method.name,
            params: method.params.map((p) => ({
              name: p.name,
              tsType: p.type,
              optional: p.optional ?? false,
            })),
            returnType: method.returnType,
            isCollection: method.operation === 'list' || method.name.startsWith('list'),
            tags: [`crud:${method.operation}`],
            crudOperation: method.operation,
          });
        }
      }

      // Apply pipeline transformations
      let processedMethods = mgmtMethods;
      for (const transform of config.pipeline) {
        processedMethods = transform(processedMethods);
      }

      // Convert to RawMethod
      return processedMethods.map((m) => toRawMethod(m));
    },

    buildData(dataFn, current, previous): Record<string, unknown> {
      return dataFn(context, current, previous);
    },

    async generateFiles(outputs, data, methods): Promise<GeneratedFile[]> {
      const files: GeneratedFile[] = [];

      for (const output of outputs) {
        // Check condition
        if (output.condition && !output.condition(context)) {
          continue;
        }

        // Resolve path template
        const outputPath = output.path.replace(/\{(\w+)\}/g, (match, key) => {
          if (key in data) {
            return String(data[key]);
          }
          return match;
        });

        // Generate the file
        const file = await generateCode({
          template: output.template,
          outputPath,
          data,
          methods,
        });

        files.push(file);
      }

      return files;
    },

    hookup: {
      async android(data): Promise<void> {
        // Create a minimal files array for the hookup to potentially add to
        const files: GeneratedFile[] = [];
        await executeAndroidHookup(context, files, data);
        // Note: The files array isn't returned here - this is for side effects
      },

      rustCrate(_packageDir: string, _moduleName: string): void {
        console.log('[KIT] Rust crate hookup not yet implemented. Use custom hookup.');
      },

      tauriPlugin(_options: { libRsPath: string; commands: string[] }): void {
        console.log('[KIT] Tauri plugin hookup not yet implemented. Use custom hookup.');
      },
    },
  };
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData,
} from '../shuttle/hookup-manager.js';
