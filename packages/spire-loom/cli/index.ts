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

import { weave, type WeaverConfig, type WeavingResult } from '../weaver/index.js';
import { parseArgs, handleCommonArgs } from './lib.js';

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
 * Takes the weave function from the caller so that it can use the library as
 * loaded from the warp!
 *
 * NOTE: this reversal of control flow is VERY IMPORTANT otherwise we face
 * issues with tsx creating multiple instances of the module which makes
 * instanceof tests fail.
 */
export async function main(loomMods: Record<string, any>): Promise<void> {
  const args = process.argv.slice(1);
  const options = parseArgs(args);
  const warp = loomMods['WARP.ts'] ?? loomMods['WARP.js'];

  // Handle common args (help, version, graph)
  const handled = await handleCommonArgs(options, warp, 'classic');
  if (handled) {
    process.exit(0);
  }

  console.log('🧵 Spire-Loom - Weaving spires from surfaces\n');

  try {
    const result = await weave(loomMods, {
      verbose: options.verbose,
      packageFilter: options.package
    });

    console.log('\n✅ Weaving complete!');
    console.log(`   Files generated: ${result.filesGenerated}`);
    console.log(`   Files modified: ${result.filesModified}`);
    console.log(`   Files unchanged: ${result.filesUnchanged}`);

    if (result.errors.length > 0) {
      console.log(`\n❌ ${result.errors.length} error(s) occurred during weaving`);
      console.log('   (See full details above in the log)');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}
