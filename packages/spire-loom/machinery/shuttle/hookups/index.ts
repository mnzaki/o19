/**
 * Hookups
 *
 * Declarative file hookup system for spire-loom.
 * Applies configuration changes to external files based on path-based spec types.
 */

import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { HookupSpec, HookupType, HookupResult } from './types.js';
import { detectHookupType, validateHookup } from './types.js';

// Handler imports
import { applyAndroidManifestHookup } from './android-manifest.js';
import { applyCargoTomlHookup } from './cargo-toml.js';
import { applyRustModuleHookup } from './rust-module.js';
import { applyTypeScriptHookup } from './typescript.js';
import { applyGradleHookup } from './gradle.js';
import { applyKotlinHookup } from './kotlin.js';
import { applyViteConfigHookup } from './vite-config.js';

// Re-export types
export * from './types.js';

// Re-export individual handlers for advanced use
export {
  applyAndroidManifestHookup,
  applyCargoTomlHookup,
  applyRustModuleHookup,
  applyTypeScriptHookup,
  applyViteConfigHookup,
  applyGradleHookup,
  applyKotlinHookup,
};

// ============================================================================
// Dispatcher
// ============================================================================

/**
 * Run all hookup specs.
 * Called by treadle-kit Phase 3.
 */
export async function runHookups(
  hookups: HookupSpec[],
  context: GeneratorContext
): Promise<HookupResult[]> {
  const results: HookupResult[] = [];
  
  for (const hookup of hookups) {
    // Validate spec
    const validation = validateHookup(hookup);
    if (!validation.valid) {
      results.push({
        path: hookup.path,
        type: detectHookupType(hookup.path),
        status: 'error',
        message: `Validation failed: ${validation.errors.join(', ')}`,
      });
      continue;
    }
    
    // Detect type from path
    const hookupType = detectHookupType(hookup.path);
    
    // Resolve full path
    const fullPath = path.isAbsolute(hookup.path)
      ? hookup.path
      : path.join(context.packageDir, hookup.path);
    
    // Route to appropriate handler
    try {
      const result = await routeHookup(hookupType, fullPath, hookup, context);
      results.push(result);
      
      if (process.env.DEBUG_MATRIX) {
        console.log(`[HOOKUP] ${result.type}: ${result.status} - ${result.message}`);
      }
    } catch (error) {
      results.push({
        path: fullPath,
        type: hookupType,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  return results;
}

/**
 * Route a hookup to its handler.
 */
async function routeHookup(
  type: HookupType,
  filePath: string,
  spec: HookupSpec,
  context: GeneratorContext
): Promise<HookupResult> {
  switch (type) {
    case 'android-manifest':
      return applyAndroidManifestHookup(filePath, spec as import('./types.js').AndroidManifestHookup, context);
    
    case 'cargo-toml':
      return applyCargoTomlHookup(filePath, spec as import('./types.js').CargoTomlHookup, context);
    
    case 'rust-module':
      return applyRustModuleHookup(filePath, spec as import('./types.js').RustModuleHookup, context);
    
    case 'gradle':
      return applyGradleHookup(filePath, spec as import('./types.js').GradleHookup, context);
    
    case 'kotlin':
      return applyKotlinHookup(filePath, spec as import('./types.js').KotlinHookup, context);
    
    case 'typescript':
      return applyTypeScriptHookup(filePath, spec as import('./types.js').TypeScriptIndexHookup, context);
    
    case 'vite-config':
      return applyViteConfigHookup(filePath, spec as import('./types.js').ViteConfigHookup, context);
    
    case 'npm-package':
      // TODO: Implement npm-package handler
      return {
        path: filePath,
        type: 'npm-package',
        status: 'skipped',
        message: 'npm-package hookup not yet implemented',
      };
    
    case 'ios-plist':
      // TODO: Implement ios-plist handler
      return {
        path: filePath,
        type: 'ios-plist',
        status: 'skipped',
        message: 'ios-plist hookup not yet implemented',
      };
    
    case 'file-block':
      // TODO: Implement generic file-block handler
      return {
        path: filePath,
        type: 'file-block',
        status: 'skipped',
        message: 'file-block hookup not yet implemented',
      };
    
    default:
      throw new Error(`Unknown hookup type: ${type}`);
  }
}

/**
 * Run a single hookup (for advanced use).
 */
export async function runHookup(
  spec: HookupSpec,
  context: GeneratorContext
): Promise<HookupResult> {
  const results = await runHookups([spec], context);
  return results[0];
}
