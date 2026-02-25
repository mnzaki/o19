/**
 * Abstract Test Runner
 *
 * Runs spire-loom against mocked WARP.ts configurations
 * without needing actual files on disk.
 */

import type { SpiralRing } from '../../warp/index.js';
import type { WeaverConfig, WeavingResult } from '../../machinery/weaver.js';
import { weave } from '../../machinery/weaver.js';

/**
 * Configuration for the test runner.
 */
export interface TestRunnerConfig {
  /** The WARP module exports (mocked) */
  warp: Record<string, SpiralRing>;
  /** Optional weaver configuration */
  weaverConfig?: Partial<WeaverConfig>;
  /** Virtual file system for generated files (optional) */
  virtualFs?: Map<string, string>;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Result from a test weave.
 */
export interface WeaveResult {
  /** Files that were generated */
  filesGenerated: string[];
  /** Files that were modified */
  filesModified: string[];
  /** Files that were unchanged */
  filesUnchanged: string[];
  /** Any errors that occurred */
  errors: Error[];
  /** The raw weaver result */
  raw: WeavingResult;
  /** Virtual file system content (if used) */
  virtualFs?: Map<string, string>;
  /** Console output captured during weave */
  output?: string;
}

/**
 * Test runner for spire-loom.
 *
 * Provides an isolated environment for testing weave behavior
 * without affecting the actual filesystem.
 */
export interface TestRunner {
  /** Run the weaver and return results */
  weave(): Promise<WeaveResult>;
  /** Get a specific exported ring */
  getRing(name: string): SpiralRing | undefined;
  /** Access the virtual filesystem */
  readFile(path: string): string | undefined;
  /** List all files in virtual filesystem */
  listFiles(): string[];
}

/**
 * Create a test runner with mocked WARP configuration.
 *
 * @example
 * ```typescript
 * const runner = createTestRunner({
 *   warp: {
 *     foundframe: loom.spiral(Foundframe),
 *     android: foundframe.android.foregroundService(),
 *   }
 * });
 *
 * const result = await runner.weave();
 * assert.equal(result.filesGenerated.length, 3);
 * ```
 */
export function createTestRunner(config: TestRunnerConfig): TestRunner {
  const virtualFs = config.virtualFs ?? new Map<string, string>();
  const logs: string[] = [];

  // Mock console methods if not verbose
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  return {
    async weave(): Promise<WeaveResult> {
      // Capture console output
      if (!config.verbose) {
        console.log = (...args: any[]) => {
          logs.push(args.map(a => String(a)).join(' '));
        };
        console.error = console.log;
        console.warn = console.log;
      }

      try {
        // Run the weaver
        const weaverConfig: WeaverConfig = {
          workspace: {
            type: 'workspace',
            root: '/virtual/workspace',
            warpPath: '/virtual/loom/WARP.ts',
          },
          verbose: config.verbose ?? false,
          ...config.weaverConfig,
        };

        const result = await weave(config.warp, weaverConfig);

        return {
          filesGenerated: [],
          filesModified: [],
          filesUnchanged: [],
          errors: result.errors,
          raw: result,
          virtualFs,
          output: logs.join('\n'),
        };
      } finally {
        // Restore console
        if (!config.verbose) {
          console.log = originalConsole.log;
          console.error = originalConsole.error;
          console.warn = originalConsole.warn;
        }
      }
    },

    getRing(name: string): SpiralRing | undefined {
      return config.warp[name];
    },

    readFile(path: string): string | undefined {
      return virtualFs.get(path);
    },

    listFiles(): string[] {
      return Array.from(virtualFs.keys());
    },
  };
}

/**
 * Create a test runner from a WARP.ts-like function.
 *
 * @example
 * ```typescript
 * const runner = createRunnerFromWarp((loom) => {
 *   const foundframe = loom.spiral(loom.rustCore());
 *   return { foundframe };
 * });
 * ```
 */
export function createRunnerFromWarp(
  warpFactory: (loom: any) => Record<string, SpiralRing>,
  config?: Omit<TestRunnerConfig, 'warp'>
): TestRunner {
  // Import loom dynamically
  const loom = {} as any; // Would need actual loom import
  const warp = warpFactory(loom);
  return createTestRunner({ warp, ...config });
}
