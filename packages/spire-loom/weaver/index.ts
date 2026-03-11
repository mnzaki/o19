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

import * as path from 'node:path';
import type { WARP } from '../warp/index.js';
import { createMatrix } from '../machinery/treadles/index.js';
import { fileSystem, blockRegistry } from '../machinery/sley/index.js';
import { loadWarp, loadWorkspace } from './workspace-discovery.js';
import { Loom, type WorkspaceInfo } from '../machinery/loom.js';
import { PatternMatcher, type GeneratedFile, type GenerationTask } from './plan-builder.js';
import type { WeavingPlan } from './plan.js';
export type { WeavingPlan } from './plan.js';
import type { TreadleTrodder } from '../machinery/treadle-kit/types.js';

// Placeholder for future implementation
export interface WeaverConfig {
  /** The workspace to weave */
  workspace?: WorkspaceInfo;
  /** Output directory for generated code */
  scrimName?: string;
  /** Which rings to generate (default: all) */
  rings?: string[];
  /** Filter to specific package by export name (e.g., 'foundframe', 'android') */
  packageFilter?: string;
  /** Verbosity level */
  verbose?: boolean;
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
  private _patternMatcher?: PatternMatcher;
  private _loom?: Loom;

  constructor(public config?: WeaverConfig) {}

  get loom() {
    if (!this._loom) throw new Error('no workspace loaded yet!');
    return this._loom;
  }

  get patternMatcher() {
    if (!this._patternMatcher) throw new Error('no workspace loaded yet!');
    return this._patternMatcher;
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
   * - Generation tasks derived from matrix matching
   */
  async buildPlan(workspace: WorkspaceInfo, warp: WARP): Promise<WeavingPlan> {
    const matrix = await createMatrix(workspace.root);
    this._patternMatcher = new PatternMatcher(matrix);
    return Object.assign(await this.patternMatcher.buildPlan(warp, workspace.root), {
      managements: this.loom.heddles!.mgmts
    });
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
  async weave(loomMods: Record<string, any>, loom?: Loom): Promise<WeavingResult> {
    console.log('here');
    const config = this.config;
    const workspace = config?.workspace ?? loadWorkspace();

    if (!workspace) {
      console.warn('⚠️ No loom/ directory found');
      throw new Error('No loom/ directory found');
    }

    const warp = loadWarp(loomMods['WARP.ts'] ?? loomMods['WARP.js']);
    if (config?.verbose) {
      console.log('🧵 Configuring workspace');
      console.log('Rings found:', Object.keys(warp));
    }

    // Start a new generation for block tracking
    blockRegistry.startGeneration();

    const errors: Error[] = [];
    let filesGenerated = 0;
    let filesModified = 0;
    let filesUnchanged = 0;

    this._loom = loom ?? new Loom(workspace);

    // Phase 0: Collect from loom/ directory (Reed)
    const heddles = await this.loom.buildHeddles(loomMods);

    if (heddles.errors.length) {
      console.error(
        `\nErrors found while building heddles (extracting metadata): ${heddles.errors.length}`
      );
      for (const error of heddles.errors) {
        console.error(`  - ${error}`);
      }

      throw new Error("can't weave with broken heddles");
    }

    const shed = await this.loom.openShed();

    if (config?.verbose) {
      console.log(`Managements found: ${heddles.mgmts.length}`);
      for (const mgmt of heddles.mgmts) {
        console.log(`  - ${mgmt.name} (@reach ${mgmt.reach})`);
        console.log(
          `    Methods: ${mgmt.methods.map((m) => `${m.name} (${m.crudOperation})`).join(', ')}\n`
        );
      }

      //if (shed.queries.length) {
      //  console.log(`\nCollected ${shed.queries.length} @loom.crud.query decorator(s):`);
      //  for (const query of shed.queries) {
      //    console.log(`  - ${query.className}.${query.methodName}`);
      //  }
      //}

      console.log(`Managements found: ${shed.mgmts.source.length}`);
      for (const mgmt of shed.mgmts.source) {
        console.log(`  - ${mgmt.name} (@reach ${mgmt.reach})`);
        console.log(
          `    Methods: ${mgmt.methods.map((m) => `${m.name} (${m.crudOperation})`).join(', ')}\n`
        );
      }
    }

    // Phase 1: Build the weaving plan (Heddles)
    const plan = await this.buildPlan(workspace, warp);

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
    //    const refinementResults = await this.processRefinements(plan, config);
    //    if (refinementResults.length > 0) {
    //      filesGenerated += refinementResults.reduce((sum, r) => sum + r.generatedFiles.length, 0);
    //
    //      for (const result of refinementResults) {
    //        if (result.errors.length > 0) {
    //          errors.push(...result.errors.map((e) => new Error(e)));
    //        }
    //      }
    //
    //      if (config?.verbose) {
    //        console.log(`\nRefinements processed: ${refinementResults.length}`);
    //        console.log(
    //          `  Files generated by refinements: ${refinementResults.reduce((sum, r) => sum + r.generatedFiles.length, 0)}`
    //        );
    //      }
    //    }
    //
    // Filter tasks if packageFilter is specified
    let tasksToExecute = plan.tasks;
    if (config?.packageFilter) {
      const filter = config.packageFilter.toLowerCase();
      tasksToExecute = plan.tasks.filter((task) => {
        // Match against the current node's export name or the match pattern
        const exportName = task.exportName.toLowerCase();
        const currentType = task.match[0].toLowerCase();
        const previousType = task.match[1]?.toLowerCase() ?? '';

        // Check if any part of the task matches the filter
        return (
          exportName.includes(filter) ||
          currentType.includes(filter) ||
          previousType.includes(filter)
        );
      });

      if (config.verbose) {
        console.log(`
Package filter: "${config.packageFilter}"`);
        console.log(`  Tasks before filter: ${plan.tasks.length}`);
        console.log(`  Tasks after filter: ${tasksToExecute.length}`);
        if (tasksToExecute.length === 0) {
          console.log('  ⚠️  No tasks match this filter');
          console.log(
            '  Available packages:',
            [...new Set(plan.tasks.map((t) => t.exportName))].join(', ')
          );
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
        // Print full error details inline for immediate visibility
        console.error(`\n❌ Error in task ${task.match.join('→')}:`);
        console.error(`   ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      }
    }

    // Phase 3: Format code (Beater)
    // TODO: Implement beater formatting

    // Phase 4: Cleanup orphaned blocks
    const cleanup = blockRegistry.cleanupAllBlocks();
    if (config?.verbose && cleanup.blocksRemoved > 0) {
      console.log(
        `\nCleanup: removed ${cleanup.blocksRemoved} orphaned blocks from ${cleanup.filesProcessed} files`
      );
      for (const detail of cleanup.details) {
        console.log(`  - ${detail.filePath}: removed ${detail.removed.join(', ')}`);
      }
    }

    return {
      filesGenerated,
      filesModified,
      filesUnchanged,
      errors,
      plan: config?.verbose ? plan : undefined
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
    // Get the generator - either from task (tieup) or from matrix
    let generator: TreadleTrodder | undefined = task.generator;

    if (!generator) {
      generator = this.patternMatcher.matchPair(task.match[0], task.match[1]);
    }

    if (!generator) {
      if (config?.verbose) {
        console.log(`No generator for ${task.match.join('→')}, skipping...`);
      }
      return { generated: 0, modified: 0, unchanged: 0 };
    }

    // Get treadle name from generator if available
    const treadleName = (generator as any).treadleName || task.match[0];

    if (config?.verbose) {
      console.log(`\nGenerating: ${task.match.join(' → ')} (${task.exportName})`);
    }

    // Get package info from ring metadata
    const currentRing = task.current.ring as any;
    const packagePath = currentRing.metadata?.packagePath ?? '';
    const packageDir = packagePath
      ? path.join(config?.workspace?.root ?? '.', packagePath)
      : (config?.workspace?.root ?? '.');

    // Call the generator with context
    const context = {
      ...this.loom.shed,
      plan,
      workspaceRoot: config?.workspace?.root ?? process.cwd(),
      outputDir: config?.scrimName,
      packagePath,
      packageDir,
      config: task.config // Pass tieup config as context.config
    };

    if (process.env.DEBUG) {
      console.log(`[DEBUG] Calling generator ${treadleName} for ${task.match.join('→')}`);
      console.log(`[DEBUG] Package: ${packagePath}, Dir: ${packageDir}`);
    }

    let files: GeneratedFile[];
    try {
      files = await generator(task.current, task.previous, context);
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(`[DEBUG] Generator ${treadleName} threw error:`, error);
        if (error instanceof Error && error.stack) {
          console.error('[DEBUG] Stack:', error.stack);
        }
      }
      throw error; // Re-throw to be caught by outer handler
    }

    // Write files using shuttle
    let written = 0;

    // Log treadle execution summary
    console.log(`  🧵 ${treadleName}: ${files.length} file(s)`);

    for (const file of files) {
      // Treadle paths are relative to the package directory
      // All generated files go into spire/ subdirectory to keep packages clean
      let fullPath: string;
      if (path.isAbsolute(file.path)) {
        fullPath = file.path;
      } else {
        // Automatically prefix with spire/ to isolate generated code
        const spirePath = path.join('spire', file.path);
        fullPath = path.join(context.packageDir, spirePath);
      }

      try {
        fileSystem.ensureFile(fullPath, file.content);
        written++;
        if (config?.verbose) {
          console.log(`    ✓ ${file.path} → ${fullPath}`);
        }
      } catch (error) {
        console.error(`    ✗ Failed to write ${file.path}:`, error);
        if (process.env.DEBUG) {
          console.error('Full error details:', error);
          if (error instanceof Error && error.stack) {
            console.error('Stack trace:', error.stack);
          }
        }
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
  //private async processRefinements(
  //  plan: WeavingPlan,
  //  config?: WeaverConfig
  //): Promise<RefinementResult[]> {
  //  const results: RefinementResult[] = [];

  //  // Collect all unique rings from the plan (including inner rings)
  //  const rings = this.collectAllLayersFromPlan(plan);

  //  // Use queries collected during Phase 0 (Reed)
  //  const collectedQueries = this.queries;

  //  for (const ring of rings) {
  //    const refinements = getRefinements(ring);

  //    if (refinements.length === 0) continue;

  //    if (config?.verbose) {
  //      console.log(`\nProcessing ${refinements.length} refinement(s) for ring...`);
  //    }

  //    for (const { provider } of refinements) {
  //      try {
  //        // Initialize the provider
  //        await provider.initialize();

  //        // Filter queries for this provider (if specified)
  //        const queriesForProvider = collectedQueries.filter(
  //          (q) => !q.providerName || q.providerName === provider.name
  //        );

  //        if (config?.verbose && queriesForProvider.length > 0) {
  //          console.log(`  Passing ${queriesForProvider.length} queries to ${provider.name}`);
  //        }

  //        // Build weaving context
  //        const context = {
  //          workspaceRoot: config?.workspace?.root ?? process.cwd(),
  //          midstagePath: path.join(
  //            config?.workspace?.root ?? '.',
  //            '.midstage',
  //            `refinement-${provider.name}`
  //          ),
  //          outputPath: path.join(config?.workspace?.root ?? '.', 'generated', provider.name),
  //          schema: {}, // TODO: Pass actual parsed schema
  //          queries: queriesForProvider, // Pass collected queries!
  //          log: (msg: string) => {
  //            if (config?.verbose) console.log(`  [${provider.name}] ${msg}`);
  //          }
  //        };

  //        // Run the refinement
  //        const result = await provider.refine(ring, context);
  //        results.push(result);

  //        if (config?.verbose) {
  //          console.log(`  ✓ ${provider.name}: ${result.generatedFiles.length} files`);
  //          if (result.warnings.length > 0) {
  //            for (const warning of result.warnings) {
  //              console.log(`    ⚠️  ${warning}`);
  //            }
  //          }
  //        }
  //      } catch (error) {
  //        results.push({
  //          generatedFiles: [],
  //          errors: [`${provider.name}: ${(error as Error).message}`],
  //          warnings: []
  //        });

  //        if (config?.verbose) {
  //          console.error(`  ✗ ${provider.name} failed:`, error);
  //        }
  //      }
  //    }
  //  }

  //  return results;
  //}
}

/**
 * Convenience function to weave a WARP.ts module.
 */
export async function weave(
  loomMods: Record<string, any>,
  config?: WeaverConfig
): Promise<WeavingResult> {
  console.log('making weaver', { config, loomMods });
  const weaver = new Weaver(config);
  return await weaver.weave(loomMods);
}
