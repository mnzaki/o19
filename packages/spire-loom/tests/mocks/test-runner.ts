/**
 * Simplified Test Runner
 *
 * Test runner that works with mocked components, avoiding filesystem dependencies.
 */

import { createMockVirtualFs, createMockTreadleUtils } from './filesystem.js';
import { tieupRegistry } from './loom.js';
import type { SpiralRing } from '../../warp/spiral/pattern.js';

export interface MockTestRunnerConfig {
  /** WARP module exports */
  warp: Record<string, any>;
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface MockWeaveResult {
  /** Files that would be generated */
  filesGenerated: string[];
  /** Files that would be modified */
  filesModified: string[];
  /** Errors that occurred */
  errors: string[];
  /** Tieups that were executed */
  executedTieups: any[];
  /** Virtual filesystem state */
  vfs: any;
}

/**
 * Create a test runner that doesn't depend on real filesystem.
 */
export function createMockTestRunner(config: MockTestRunnerConfig) {
  const vfs = createMockVirtualFs();
  const logs: string[] = [];

  return {
    /**
     * Simulate a weave operation.
     */
    async weave(): Promise<MockWeaveResult> {
      const filesGenerated: string[] = [];
      const filesModified: string[] = [];
      const errors: string[] = [];
      const executedTieups: any[] = [];

      if (config.verbose) {
        logs.push('Starting mock weave...');
      }

      // Collect all rings from warp
      const rings = Object.values(config.warp);

      // Process each ring's tieups
      for (const ring of rings) {
        const tieups = this.getTieups(ring);
        const packagePath = ring.metadata?.packagePath || '.';
        
        if (tieups.length > 0 && config.verbose) {
          logs.push(`Processing ${tieups.length} tieup(s) for ring (packagePath: ${packagePath})...`);
        }

        for (const { treadle, config: tieupConfig } of tieups) {
          try {
            // Create mock context
            const context = {
              ring,
              config: tieupConfig,
              packagePath,
              utils: createMockTreadleUtils(vfs, packagePath)
            };

            // Execute treadle
            const result = await treadle(context);
            
            // Normalize paths to include package prefix and clean up ./
            const normalizePath = (path: string) => {
              // Remove leading ./ from path
              const cleanPath = path.replace(/^\.\//, '');
              // Add package prefix if not already present
              return packagePath && packagePath !== '.' && !cleanPath.startsWith(packagePath) 
                ? `${packagePath}/${cleanPath}` 
                : cleanPath;
            };
            
            if (result.generatedFiles) {
              filesGenerated.push(...result.generatedFiles.map(normalizePath));
            }
            if (result.modifiedFiles) {
              filesModified.push(...result.modifiedFiles.map(normalizePath));
            }
            if (result.errors) {
              errors.push(...result.errors);
            }

            executedTieups.push({
              treadle: treadle.name || 'anonymous',
              config: tieupConfig,
              result
            });

            if (config.verbose) {
              logs.push(`  ✓ Executed tieup: ${result.generatedFiles?.length || 0} files`);
            }
          } catch (e) {
            const errorMsg = (e as Error).message;
            errors.push(errorMsg);
            if (config.verbose) {
              logs.push(`  ✗ Error: ${errorMsg}`);
            }
          }
        }
      }

      if (config.verbose) {
        logs.push(`Weave complete: ${filesGenerated.length} generated, ${errors.length} errors`);
      }

      return {
        filesGenerated,
        filesModified,
        errors,
        executedTieups,
        vfs
      };
    },

    /**
     * Get tieups attached to a ring.
     */
    getTieups(ring: any): any[] {
      return tieupRegistry.get(ring) || [];
    },

    /**
     * Get a ring from the warp.
     */
    getRing(name: string): any {
      return config.warp[name];
    },

    /**
     * Get captured logs.
     */
    getLogs(): string[] {
      return logs;
    },

    /**
     * Read a file from the virtual filesystem.
     */
    readFile(path: string): string | null {
      return vfs.readFile(path);
    },

    /**
     * List all files in the virtual filesystem.
     */
    listFiles(): string[] {
      return vfs.listFiles();
    }
  };
}

/**
 * Simple assertion helpers for tests.
 */
export const assertions = {
  /**
   * Assert that a file was generated.
   */
  fileGenerated(result: MockWeaveResult, path: string): void {
    if (!result.filesGenerated.includes(path)) {
      throw new Error(`Expected file to be generated: ${path}\nGenerated: ${result.filesGenerated.join(', ')}`);
    }
  },

  /**
   * Assert that a file was modified.
   */
  fileModified(result: MockWeaveResult, path: string): void {
    if (!result.filesModified.includes(path)) {
      throw new Error(`Expected file to be modified: ${path}`);
    }
  },

  /**
   * Assert no errors occurred.
   */
  noErrors(result: MockWeaveResult): void {
    if (result.errors.length > 0) {
      throw new Error(`Expected no errors, but got:\n${result.errors.join('\n')}`);
    }
  },

  /**
   * Assert that content was written to a file.
   */
  fileContains(vfs: any, path: string, content: string): void {
    const fileContent = vfs.readFile(path);
    if (!fileContent) {
      throw new Error(`File does not exist: ${path}`);
    }
    if (!fileContent.includes(content)) {
      throw new Error(`File ${path} does not contain: ${content}\nContent: ${fileContent}`);
    }
  }
};
