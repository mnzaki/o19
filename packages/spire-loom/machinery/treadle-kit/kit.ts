/**
 * Treadle Kit - Kit Implementation 🧰
 *
 * The main TreadleKit factory and implementation.
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratorContext, WeavingPlan, MethodHelpers } from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import { filterByReach } from '../reed/index.js';
import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod, GeneratedFile } from '../bobbin/index.js';
import { generateCode } from '../bobbin/index.js';
import {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData
} from '../shuttle/hookup-manager.js';
import { writeEventCallbackAidl } from '../bobbin/android.js';
import type { MethodConfig, TreadleKit } from './types.js';
import { toRawMethod, buildMethodHelpers } from './method-helpers.js';

/**
 * Create a treadle kit for building generators.
 * 
 * The kit provides a unified interface for:
 * - Validating spiral node types
 * - Collecting and transforming methods
 * - Building template data
 * - Generating files from templates
 * - Running hookups for external file configuration
 * 
 * @param context - The generator context with plan, paths, etc.
 * @returns TreadleKit with all capabilities
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
          console.log(
            `[KIT] Skipping: ${currentType} → ${previousType} not ${expected.current} → ${expected.previous}`
          );
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
              optional: p.optional ?? false
            })),
            returnType: method.returnType,
            isCollection: method.operation === 'list' || method.name.startsWith('list'),
            tags: [`crud:${method.operation}`],
            crudOperation: method.operation
          });
        }
      }

      // Apply pipeline transformations
      let processedMethods = mgmtMethods;
      for (const transform of config.pipeline) {
        processedMethods = transform(processedMethods);
      }

      // Convert to RawMethod
      const rawMethods = processedMethods.map((m) => toRawMethod(m));
      
      // Build and attach method helpers to context
      context.methods = buildMethodHelpers(rawMethods);
      
      return rawMethods;
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

        // Merge per-output context with main data (context takes precedence)
        const mergedData = output.context
          ? { ...data, ...output.context }
          : data;

        // Generate the file (workspace templates checked first)
        const file = await generateCode({
          template: output.template,
          outputPath,
          data: mergedData,
          methods,
          workspaceRoot: context.workspaceRoot
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
      }
    }
  };
}

// Re-export hookup utilities for convenience
export {
  configureAndroidManifest,
  findCoreNameForTask,
  configureGradleBuild,
  executeAndroidHookup,
  type AndroidHookupData
} from '../shuttle/hookup-manager.js';
