/**
 * Test Fixtures
 *
 * Pre-built mock objects for common test scenarios.
 */

import type { CustomTreadle, TreadleContext, TreadleResult } from '../../warp/tieups.js';

/**
 * A mock file for testing.
 */
export interface MockFile {
  path: string;
  content: string;
}

/**
 * Configuration for creating a mock treadle.
 */
export interface MockTreadleConfig {
  /** Name of the treadle */
  name: string;
  /** Files to generate */
  files?: MockFile[];
  /** Files to modify */
  modifiedFiles?: string[];
  /** Simulate an error */
  shouldError?: boolean;
  /** Custom generate logic */
  customGenerate?: (context: TreadleContext) => Promise<TreadleResult>;
}

/**
 * Create a mock custom treadle for testing.
 *
 * @example
 * ```typescript
 * const mockTreadle = createMockTreadle({
 *   name: 'test-treadle',
 *   files: [
 *     { path: 'test.rs', content: '// generated' }
 *   ]
 * });
 *
 * const runner = createTestRunner({
 *   warp: {
 *     foundframe: loom.spiral(core)
 *       .tieup.intra(mockTreadle, { test: true })
 *   }
 * });
 * ```
 */
export function createMockTreadle(config: MockTreadleConfig): CustomTreadle {
  return async (context: TreadleContext): Promise<TreadleResult> => {
    if (config.shouldError) {
      throw new Error(`Mock treadle ${config.name} failed`);
    }

    if (config.customGenerate) {
      return config.customGenerate(context);
    }

    // Default: write mock files
    for (const file of (config.files ?? [])) {
      await context.utils.writeFile(file.path, file.content);
    }

    return {
      generatedFiles: (config.files ?? []).map(f => f.path),
      modifiedFiles: config.modifiedFiles ?? [],
      errors: [],
    };
  };
}

/**
 * Pre-built mock treadles for common scenarios.
 */
export const mockTreadles = {
  /**
   * A treadle that generates a single Rust file.
   */
  rustFile: (name: string, content?: string) => createMockTreadle({
    name: `rust-${name}`,
    files: [{
      path: `src/${name}.rs`,
      content: content ?? `// Generated ${name}\npub struct ${name} {}`,
    }],
  }),

  /**
   * A treadle that generates a TypeScript file.
   */
  typescriptFile: (name: string, content?: string) => createMockTreadle({
    name: `ts-${name}`,
    files: [{
      path: `${name}.ts`,
      content: content ?? `// Generated ${name}\nexport interface ${name} {}`,
    }],
  }),

  /**
   * A treadle that modifies an existing file.
   */
  fileModifier: (path: string, insertion: string) => createMockTreadle({
    name: 'file-modifier',
    customGenerate: async (context) => {
      await context.utils.updateFile(path, (content) => {
        return content + '\n' + insertion;
      });
      return {
        generatedFiles: [],
        modifiedFiles: [path],
        errors: [],
      };
    },
  }),

  /**
   * A treadle that fails.
   */
  failing: (name: string) => createMockTreadle({
    name,
    shouldError: true,
  }),

  /**
   * A treadle that echoes its config to output.
   */
  echoConfig: () => createMockTreadle({
    name: 'echo-config',
    customGenerate: async (context) => {
      const configJson = JSON.stringify(context.config, null, 2);
      await context.utils.writeFile('config.echo.json', configJson);
      return {
        generatedFiles: ['config.echo.json'],
        modifiedFiles: [],
        errors: [],
      };
    },
  }),
};

/**
 * Pre-built WARP configurations for testing.
 */
export const warpFixtures = {
  /**
   * Minimal: Just a core ring.
   */
  minimal: () => ({
    foundframe: {} as any, // Would need actual SpiralRing
  }),

  /**
   * With tieup: Core + custom treadle.
   */
  withTieup: (treadle: CustomTreadle, config: Record<string, unknown>) => ({
    foundframe: {} as any, // Would have .tieup.intra(treadle, config)
  }),

  /**
   * Full stack: Core + platforms + Tauri.
   */
  fullStack: () => ({
    foundframe: {} as any,
    android: {} as any,
    desktop: {} as any,
    tauri: {} as any,
  }),
};
