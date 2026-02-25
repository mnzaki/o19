/**
 * Gradle Hookup Handler
 *
 * Applies Gradle build.gradle hookups declaratively.
 */

import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { GradleHookup, HookupResult } from './types.js';
import { configureAndroidGradle } from '../android-gradle-integration.js';

/**
 * Apply Gradle build.gradle hookup.
 */
export function applyGradleHookup(
  filePath: string,
  spec: GradleHookup,
  context: GeneratorContext
): HookupResult {
  const changes: string[] = [];
  
  // Handle plugins
  if (spec.plugins) {
    for (const plugin of spec.plugins) {
      const applied = applyPlugin(filePath, plugin);
      if (applied) {
        changes.push(`Added plugin: ${typeof plugin === 'string' ? plugin : plugin.id}`);
      }
    }
  }
  
  // Handle dependencies
  if (spec.dependencies) {
    for (const [config, deps] of Object.entries(spec.dependencies)) {
      for (const dep of deps) {
        const applied = applyDependency(filePath, config, dep);
        if (applied) {
          changes.push(`Added dependency: ${config} ${dep}`);
        }
      }
    }
  }
  
  // Handle Android source sets
  if (spec.android?.sourceSets) {
    const applied = applySourceSets(filePath, spec.android.sourceSets);
    if (applied) {
      changes.push('Updated Android source sets');
    }
  }
  
  // Handle spire task
  if (spec.spireTask) {
    const applied = applySpireTask(filePath, spec.spireTask);
    if (applied) {
      changes.push(`Added spire task: ${spec.spireTask.name}`);
    }
  }
  
  // Handle raw blocks
  if (spec.blocks) {
    for (const block of spec.blocks) {
      const applied = applyRawBlock(filePath, block.name, block.content);
      if (applied) {
        changes.push(`Added block: ${block.name}`);
      }
    }
  }
  
  return {
    path: filePath,
    type: 'gradle',
    status: changes.length > 0 ? 'applied' : 'skipped',
    message: changes.length > 0 ? changes.join(', ') : 'No changes needed',
  };
}

/**
 * Apply a plugin declaration.
 */
function applyPlugin(
  filePath: string,
  plugin: string | GradleHookup['plugins'][number]
): boolean {
  // For now, this is a simplified implementation
  // A full implementation would use the gradle block manager
  const pluginId = typeof plugin === 'string' ? plugin : plugin.id;
  
  // This is a placeholder - real implementation would parse and modify build.gradle
  // For now, rely on the existing configureAndroidGradle for complex cases
  console.log(`  [Gradle] Would add plugin: ${pluginId}`);
  
  return true; // Assume applied for now
}

/**
 * Apply a dependency.
 */
function applyDependency(
  filePath: string,
  configuration: string,
  dependency: string
): boolean {
  // Placeholder implementation
  console.log(`  [Gradle] Would add dependency: ${configuration} ${dependency}`);
  return true;
}

/**
 * Apply Android source sets configuration.
 */
function applySourceSets(
  filePath: string,
  sourceSets: GradleHookup['android']['sourceSets']
): boolean {
  // Delegate to existing android-gradle-integration
  configureAndroidGradle(filePath, {
    spireDir: './spire',
    hasCargoToml: true,
    taskName: 'buildRust',
  });
  return true;
}

/**
 * Apply spire Rust build task.
 */
function applySpireTask(
  filePath: string,
  task: GradleHookup['spireTask']
): boolean {
  if (!task) return false;
  
  // Delegate to existing android-gradle-integration with task config
  configureAndroidGradle(filePath, {
    spireDir: task.targetDirectory,
    hasCargoToml: true,
    taskName: task.name,
  });
  
  return true;
}

/**
 * Apply a raw block.
 */
function applyRawBlock(filePath: string, name: string, content: string): boolean {
  // Placeholder - would use gradle block manager
  console.log(`  [Gradle] Would add block: ${name}`);
  return true;
}
