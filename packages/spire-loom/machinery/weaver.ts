/**
 * The Weaver
 *
 * The master operator of the loom. Takes a WARP.ts module and
 * orchestrates the machinery to generate code.
 *
 * The weaving process:
 * 1. Reed - Scans workspace, discovers packages
 * 2. Heddles - Matches spiral patterns to generators (builds IR)
 * 3. Shuttle - Weaves files into existence
 * 4. Beater - Formats and packs the generated code
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { SpiralOut, SpiralMux, SpiralRing, CoreRing } from '../warp/index.js';
import type { Layer } from '../warp/layers.js';
import { SpiralRing as SpiralRingClass } from '../warp/spiral/pattern.js';
import { Heddles, type WeavingPlan, type GenerationTask, GeneratorMatrix } from './heddles/index.js';
import { createDefaultMatrix } from './treadles/index.js';
import { collectManagements, type ManagementMetadata } from './reed/index.js';
import { ensureFile } from './shuttle/file-system-operations.js';
import { startGeneration, cleanupAllBlocks } from './shuttle/block-registry.js';
import { getRefinements } from '../warp/refine/decorator.js';
import type { RefinementResult } from '../warp/refine/types.js';
import { collectQueriesFromDirectory, type CollectedQuery, type QueryCollectionResult } from './reed/index.js';

// Placeholder for future implementation
export interface WeaverConfig {
  /** Root of the workspace */
  workspaceRoot: string;
  /** Path to loom directory (default: workspaceRoot/loom) */
  loomDir?: string;
  /** Output directory for generated code */
  outputDir?: string;
  /** Which rings to generate (default: all) */
  rings?: string[];
  /** Filter to specific package by export name (e.g., 'foundframe', 'android') */
  packageFilter?: string;
  /** Verbosity level */
  verbose?: boolean;
  /** Pre-loaded managements (optional) */
  managements?: ManagementMetadata[];
}

export interface WeavingResult {
  /** Number of files generated */
  filesGenerated: number;
  /** Number of files modified */
  filesModified: number;
  /** Number of files unchanged */
  filesUnchanged: number;
  /** Any errors that occurred */
  errors: Error[];
  /** The weaving plan (intermediate representation) */
  plan?: WeavingPlan;
}

/**
 * The Weaver operates the loom to generate code from a WARP.ts module.
 *
 * Usage:
 *   import * as warp from './loom/WARP.js';
 *   const weaver = new Weaver(warp);
 *   const result = await weaver.weave();
 */
export class Weaver {
  private heddles: Heddles;
  private managements: ManagementMetadata[] = [];
  private queries: CollectedQuery[] = [];

  constructor(
    private warp: Record<string, SpiralRing>,
    matrix?: GeneratorMatrix
  ) {
    this.heddles = new Heddles(matrix ?? createDefaultMatrix());
  }

  /**
   * Collect Management Imprints from loom/ directory.
   */
  async collectManagements(loomDir: string): Promise<void> {
    this.managements = await collectManagements(loomDir);
    
    if (this.managements.length === 0) {
      console.warn('⚠️  No Management Imprints found in loom/');
    }
  }

  /**
   * Collect @loom.crud.query decorators from loom/ directory.
   * 
   * This is called by the reed during the dressing phase.
   * Queries are later passed to refinements during weaving.
   */
  async collectQueries(loomDir: string): Promise<QueryCollectionResult> {
    return collectQueriesFromDirectory(loomDir);
  }

  /**
   * Build the weaving plan (intermediate representation).
   * 
   * This is the first phase of weaving - analyzing the WARP.ts
   * structure and matching it against the generator matrix.
   * 
   * The plan contains:
   * - All edges in the spiral graph
   * - All nodes grouped by type
   * - Management Imprints for code generation
   * - Generation tasks derived from matrix matching
   */
  buildPlan(): WeavingPlan {
    return this.heddles.buildPlan(this.warp, this.managements);
  }

  /**
   * Weave the WARP.ts module into generated code.
   *
   * This is the main entry point that orchestrates the entire
   * code generation process.
   * 
   * The process:
   * 1. Build the weaving plan (Heddles)
   * 2. Execute each generation task (Shuttle)
   * 3. Format the generated code (Beater)
   */
  async weave(config?: WeaverConfig): Promise<WeavingResult> {
    // Start a new generation for block tracking
    startGeneration();
    
    const errors: Error[] = [];
    let filesGenerated = 0;
    let filesModified = 0;
    let filesUnchanged = 0;

    if (config?.verbose) {
      console.log('Weaving WARP.ts...');
      console.log('Rings found:', Object.keys(this.warp));
    }

    // Phase 0: Collect from loom/ directory (Reed)
    if (config?.loomDir) {
      if (this.managements.length === 0) {
        await this.collectManagements(config.loomDir);
      }
      // Also collect @loom.crud.query decorators
      if (this.queries.length === 0) {
        const queryResult = await this.collectQueries(config.loomDir);
        this.queries = queryResult.queries;
        
        if (config?.verbose && this.queries.length > 0) {
          console.log(`\nCollected ${this.queries.length} @loom.crud.query decorator(s):`);
          for (const query of this.queries) {
            console.log(`  - ${query.className}.${query.methodName}`);
          }
        }
      }
    }

    if (config?.verbose) {
      console.log(`Managements found: ${this.managements.length}`);
      for (const mgmt of this.managements) {
        console.log(`  - ${mgmt.name} (@reach ${mgmt.reach})`);
        console.log(`    Methods: ${mgmt.methods.map(m => `${m.name} (${m.operation})`).join(', ')}`);
      }
      console.log();
    }

    // Phase 1: Build the weaving plan (Heddles)
    const plan = this.buildPlan();

    if (config?.verbose) {
      console.log(`\nPlan built:`);
      console.log(`  - ${plan.edges.length} edges in spiral graph`);
      for (const edge of plan.edges) {
        const fromName = edge.from.constructor.name;
        const toName = edge.to.constructor.name;
        console.log(`    Edge: ${fromName} -> ${toName}`);
      }
      console.log(`  - ${plan.tasks.length} generation tasks`);
      for (const task of plan.tasks) {
        console.log(`    Task: ${task.match.join(' -> ')}`);
      }
      console.log(`  - ${plan.nodesByType.size} node types`);
      // DEBUG: Show what matrix lookups were attempted
      console.log(`  - Matrix has ${(plan as any).matrix?.size ?? 'unknown'} entries`);
    }

    // Phase 2: Execute generation tasks (Shuttle)
    // First, process any ring refinements
    const refinementResults = await this.processRefinements(plan, config);
    if (refinementResults.length > 0) {
      filesGenerated += refinementResults.reduce((sum, r) => sum + r.generatedFiles.length, 0);
      
      for (const result of refinementResults) {
        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => new Error(e)));
        }
      }
      
      if (config?.verbose) {
        console.log(`\nRefinements processed: ${refinementResults.length}`);
        console.log(`  Files generated by refinements: ${refinementResults.reduce((sum, r) => sum + r.generatedFiles.length, 0)}`);
      }
    }

    // Process intra-tieups (custom treadles attached via .tieup.intra())
    const tieupResults = await this.processIntraTieups(plan, config);
    if (tieupResults.length > 0) {
      filesGenerated += tieupResults.reduce((sum, r) => sum + r.generated.length, 0);
      filesModified += tieupResults.reduce((sum, r) => sum + r.modified.length, 0);
      
      for (const result of tieupResults) {
        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => new Error(e)));
        }
      }
      
      if (config?.verbose) {
        console.log(`\nIntra-tieups processed: ${tieupResults.length}`);
        console.log(`  Files generated by tieups: ${tieupResults.reduce((sum, r) => sum + r.generated.length, 0)}`);
        console.log(`  Files modified by tieups: ${tieupResults.reduce((sum, r) => sum + r.modified.length, 0)}`);
      }
    }

    // Filter tasks if packageFilter is specified
    let tasksToExecute = plan.tasks;
    if (config?.packageFilter) {
      const filter = config.packageFilter.toLowerCase();
      tasksToExecute = plan.tasks.filter(task => {
        // Match against the current node's export name or the match pattern
        const exportName = task.exportName.toLowerCase();
        const currentType = task.match[0].toLowerCase();
        const previousType = task.match[1]?.toLowerCase() ?? '';
        
        // Check if any part of the task matches the filter
        return exportName.includes(filter) || 
               currentType.includes(filter) || 
               previousType.includes(filter);
      });
      
      if (config.verbose) {
        console.log(`
Package filter: "${config.packageFilter}"`);
        console.log(`  Tasks before filter: ${plan.tasks.length}`);
        console.log(`  Tasks after filter: ${tasksToExecute.length}`);
        if (tasksToExecute.length === 0) {
          console.log('  ⚠️  No tasks match this filter');
          console.log('  Available packages:', [...new Set(plan.tasks.map(t => t.exportName))].join(', '));
        }
      }
    }
    
    for (const task of tasksToExecute) {
      try {
        const result = await this.executeTask(task, plan, config);
        filesGenerated += result.generated;
        filesModified += result.modified;
        filesUnchanged += result.unchanged;
      } catch (error) {
        errors.push(error as Error);
        if (config?.verbose) {
          console.error(`Error executing task ${task.match.join('→')}:`, error);
        }
      }
    }

    // Phase 3: Format code (Beater)
    // TODO: Implement beater formatting

    // Phase 4: Cleanup orphaned blocks
    const cleanup = cleanupAllBlocks();
    if (config?.verbose && cleanup.blocksRemoved > 0) {
      console.log(`\nCleanup: removed ${cleanup.blocksRemoved} orphaned blocks from ${cleanup.filesProcessed} files`);
      for (const detail of cleanup.details) {
        console.log(`  - ${detail.filePath}: removed ${detail.removed.join(', ')}`);
      }
    }

    return {
      filesGenerated,
      filesModified,
      filesUnchanged,
      errors,
      plan: config?.verbose ? plan : undefined,
    };
  }

  /**
   * Execute a single generation task.
   */
  private async executeTask(
    task: GenerationTask,
    plan: WeavingPlan,
    config?: WeaverConfig
  ): Promise<{ generated: number; modified: number; unchanged: number }> {
    // Get the generator from the matrix via the heddles
    const matrix = (this.heddles as any).matrix as GeneratorMatrix;
    const generator = matrix.getPair(task.match[0], task.match[1]);
    
    if (!generator) {
      if (config?.verbose) {
        console.log(`No generator for ${task.match.join('→')}, skipping...`);
      }
      return { generated: 0, modified: 0, unchanged: 0 };
    }

    if (config?.verbose) {
      console.log(`\nGenerating: ${task.match.join(' → ')} (${task.exportName})`);
    }

    // Call the generator with context
    const context = {
      plan,
      workspaceRoot: config?.workspaceRoot ?? process.cwd(),
      outputDir: config?.outputDir,
    };
    const files = await generator(task.current, task.previous, context);

    // Write files using shuttle
    let written = 0;
    for (const file of files) {
      // If path starts with 'o19/' or 'packages/', it's relative to project root
      // Otherwise join with workspace root
      let fullPath: string;
      if (path.isAbsolute(file.path)) {
        fullPath = file.path;
      } else if (file.path.startsWith('o19/') || file.path.startsWith('packages/') || file.path.startsWith('apps/')) {
        // Path is relative to project root (parent of workspace root)
        fullPath = path.join(config?.workspaceRoot ?? '.', '..', file.path);
      } else {
        fullPath = path.join(config?.workspaceRoot ?? '.', file.path);
      }
      
      try {
        ensureFile(fullPath, file.content);
        written++;
        if (config?.verbose) {
          console.log(`    ✓ ${file.path}`);
        }
      } catch (error) {
        console.error(`    ✗ Failed to write ${file.path}:`, error);
      }
    }

    return { generated: written, modified: 0, unchanged: 0 };
  }

  /**
   * Process refinements attached to rings in the weaving plan.
   * 
   * Refinements are modifiers like @loom.refine.withPrisma() that
   * trigger compaction during weaving.
   * 
   * This method also collects @loom.crud.query decorators from loom files
   * and passes them to the refinement for SQL capture.
   */
  private async processRefinements(
    plan: WeavingPlan,
    config?: WeaverConfig
  ): Promise<RefinementResult[]> {
    const results: RefinementResult[] = [];

    // Collect all unique rings from the plan (including inner rings)
    const rings = this.collectAllLayersFromPlan(plan);

    // Use queries collected during Phase 0 (Reed)
    const collectedQueries = this.queries;

    for (const ring of rings) {
      const refinements = getRefinements(ring);
      
      if (refinements.length === 0) continue;

      if (config?.verbose) {
        console.log(`\nProcessing ${refinements.length} refinement(s) for ring...`);
      }

      for (const { provider } of refinements) {
        try {
          // Initialize the provider
          await provider.initialize();

          // Filter queries for this provider (if specified)
          const queriesForProvider = collectedQueries.filter(q => 
            !q.providerName || q.providerName === provider.name
          );

          if (config?.verbose && queriesForProvider.length > 0) {
            console.log(`  Passing ${queriesForProvider.length} queries to ${provider.name}`);
          }

          // Build weaving context
          const context = {
            workspaceRoot: config?.workspaceRoot ?? process.cwd(),
            midstagePath: path.join(
              config?.workspaceRoot ?? '.',
              '.midstage',
              `refinement-${provider.name}`
            ),
            outputPath: path.join(
              config?.workspaceRoot ?? '.',
              'generated',
              provider.name
            ),
            schema: {}, // TODO: Pass actual parsed schema
            queries: queriesForProvider, // Pass collected queries!
            log: (msg: string) => {
              if (config?.verbose) console.log(`  [${provider.name}] ${msg}`);
            },
          };

          // Run the refinement
          const result = await provider.refine(ring, context);
          results.push(result);

          if (config?.verbose) {
            console.log(`  ✓ ${provider.name}: ${result.generatedFiles.length} files`);
            if (result.warnings.length > 0) {
              for (const warning of result.warnings) {
                console.log(`    ⚠️  ${warning}`);
              }
            }
          }
        } catch (error) {
          results.push({
            generatedFiles: [],
            errors: [`${provider.name}: ${(error as Error).message}`],
            warnings: [],
          });
          
          if (config?.verbose) {
            console.error(`  ✗ ${provider.name} failed:`, error);
          }
        }
      }
    }

    return results;
  }

  /**
   * Recursively collect all rings from a weaving plan.
   * Walks the ring hierarchy to find inner rings (CoreRing, SpiralOut.inner, etc.)
   */
  private collectAllLayersFromPlan(plan: WeavingPlan): Set<Layer> {
    const collected = new Set<Layer>();
    
    // Start with task-level rings (task.current/task.previous are SpiralNodes)
    for (const task of plan.tasks) {
      this.collectLayerHierarchy(task.current.ring, collected);
      if (task.previous) {
        this.collectLayerHierarchy(task.previous.ring, collected);
      }
    }
    
    return collected;
  }
  
  /**
   * Recursively collect a ring and its inner rings.
   */
  private collectLayerHierarchy(layer: Layer, collected: Set<Layer>): void {
    if (collected.has(layer)) return;
    collected.add(layer);
    
    // Walk inner layers based on type
    const anyLayer = layer as any;
    
    // SpiralOut: check .inner
    if (anyLayer.inner instanceof SpiralRingClass) {
      this.collectLayerHierarchy(anyLayer.inner, collected);
    }
    
    // SpiralMux: check .innerRings array
    if (Array.isArray(anyLayer.innerRings)) {
      for (const inner of anyLayer.innerRings) {
        if (inner instanceof SpiralRingClass) {
          this.collectLayerHierarchy(inner, collected);
        }
      }
    }
    
    // CoreRing: check .layer and .core
    if (anyLayer.layer instanceof SpiralRingClass) {
      this.collectLayerHierarchy(anyLayer.layer, collected);
    }
    if (anyLayer.core instanceof SpiralRingClass) {
      this.collectLayerHierarchy(anyLayer.core, collected);
    }
  }

  /**
   * Process intra-tieups (custom treadles attached via .tieup.intra()).
   * 
   * Executes custom generation logic inside each ring's package.
   */
  private async processIntraTieups(
    plan: WeavingPlan,
    config?: WeaverConfig
  ): Promise<Array<{ generated: string[]; modified: string[]; errors: string[] }>> {
    const results: Array<{ generated: string[]; modified: string[]; errors: string[] }> = [];

    // Import here to avoid circular dependency
    const { getTieups, executeTieups } = await import('../warp/tieups.js');

    // Collect all unique layers from the plan (including inner layers)
    const layers = this.collectAllLayersFromPlan(plan);
    
    for (const layer of layers) {
      const tieups = getTieups(layer);
      
      if (tieups.length === 0) continue;

      if (config?.verbose) {
        console.log(`\nProcessing ${tieups.length} tieup(s) for layer...`);
      }

      // Determine package path from layer metadata
      const anyLayer = layer as any;
      const metadata = anyLayer.metadata as { packagePath?: string; packageName?: string; language?: string } | undefined;
      const packagePath = metadata?.packagePath 
        ? path.join(config?.workspaceRoot ?? process.cwd(), metadata.packagePath)
        : (config?.workspaceRoot ?? process.cwd());
      
      if (config?.verbose) {
        console.log(`  Using package path: ${packagePath}`);
        if (metadata) {
          console.log(`    (from layer metadata: ${metadata.packageName} @ ${metadata.packagePath})`);
        }
      }

      // Create utils for file operations
      const utils = {
        writeFile: async (relativePath: string, content: string) => {
          const fullPath = path.join(packagePath, relativePath);
          const dir = path.dirname(fullPath);
          await fsp.mkdir(dir, { recursive: true });
          await fsp.writeFile(fullPath, content, 'utf-8');
        },
        readFile: async (relativePath: string): Promise<string | null> => {
          try {
            const fullPath = path.join(packagePath, relativePath);
            return await fsp.readFile(fullPath, 'utf-8');
          } catch {
            return null;
          }
        },
        updateFile: async (relativePath: string, updater: (content: string) => string) => {
          const content = await utils.readFile(relativePath);
          if (content !== null) {
            const updated = updater(content);
            await utils.writeFile(relativePath, updated);
          }
        },
        fileExists: async (relativePath: string) => {
          try {
            const fullPath = path.join(packagePath, relativePath);
            await fsp.access(fullPath);
            return true;
          } catch {
            return false;
          }
        },
      };

      const result = await executeTieups(layer, packagePath, utils);
      results.push(result);

      if (config?.verbose && (result.generated.length > 0 || result.modified.length > 0)) {
        console.log(`  ✓ Generated: ${result.generated.length} files`);
        console.log(`  ✓ Modified: ${result.modified.length} files`);
      }
    }

    return results;
  }
}

/**
 * Convenience function to weave a WARP.ts module.
 */
export async function weave(
  warp: Record<string, SpiralRing>,
  config?: WeaverConfig
): Promise<WeavingResult> {
  const weaver = new Weaver(warp);
  return weaver.weave(config);
}

/**
 * Convenience function to build a weaving plan without executing.
 * Useful for debugging and inspection.
 */
export function buildPlan(warp: Record<string, SpiralRing>): WeavingPlan {
  const weaver = new Weaver(warp);
  return weaver.buildPlan();
}
