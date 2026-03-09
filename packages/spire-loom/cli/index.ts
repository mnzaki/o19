#!/usr/bin/env node
/**
 * spire-loom CLI
 *
 * "The loom that weaves spires from surfaces."
 *
 * Minimal command-line interface for code generation.
 * For the interactive UI, use spire-loom-warp or spire-loom-mud-warp.
 */

// Polyfill for decorator metadata
import 'reflect-metadata';

import type { WeavingResult } from '@o19/spire-loom/weaver';
import { handleCommonArgs } from './lib.js';

export {
  parseArgs,
  showVersion,
  showHelp,
  printGraph,
  findWorkspaceConfig,
  handleCommonArgs
} from './lib.js';
export type { CliOptions } from './lib.js';

/**
 * Main entry point for classic CLI mode.
 * Takes the weave function from the caller.
 */
export async function main(
  weave: () => Promise<WeavingResult>,
  warp: Record<string, any>
): Promise<void> {
  const args = process.argv.slice(2);

  // Handle common args (help, version, graph)
  const handled = await handleCommonArgs(args, warp, 'classic');
  if (handled) {
    process.exit(0);
  }

  console.log('🧵 Spire-Loom - Weaving spires from surfaces\n');

  try {
    const result = await weave();

    console.log('\n✅ Weaving complete!');
    console.log(`   Files generated: ${result.filesGenerated}`);
    console.log(`   Files modified: ${result.filesModified}`);
    console.log(`   Files unchanged: ${result.filesUnchanged}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ Errors: ${result.errors.length}`);
      for (const error of result.errors) {
        console.error(`   - ${error.message}`);
      }
      // Re-throw the first error to show full stack trace
      throw result.errors[0];
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}
