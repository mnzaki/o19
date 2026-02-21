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

import type { SpiralOut, SpiralMux, SpiralRing } from '../warp/index.js';
import { Heddles, type WeavingPlan, type GenerationTask, GeneratorMatrix } from './heddles/index.js';
import { createDefaultMatrix } from './treadles/index.js';
import { collectManagements, type ManagementMetadata } from './reed/index.js';

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
    const errors: Error[] = [];
    let filesGenerated = 0;
    let filesModified = 0;
    let filesUnchanged = 0;

    if (config?.verbose) {
      console.log('Weaving WARP.ts...');
      console.log('Rings found:', Object.keys(this.warp));
    }

    // Phase 0: Collect Management Imprints (Reed)
    if (this.managements.length === 0 && config?.loomDir) {
      await this.collectManagements(config.loomDir);
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
      console.log(`  - ${plan.tasks.length} generation tasks`);
      console.log(`  - ${plan.nodesByType.size} node types`);
    }

    // Phase 2: Execute generation tasks (Shuttle)
    for (const task of plan.tasks) {
      try {
        const result = await this.executeTask(task, config);
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

    // Call the generator
    const files = await generator(task.current, task.previous);

    // TODO: Write files using shuttle
    if (config?.verbose) {
      console.log(`  Generated ${files.length} files`);
      for (const file of files) {
        console.log(`    - ${file.path}`);
      }
    }

    return { generated: files.length, modified: 0, unchanged: 0 };
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
