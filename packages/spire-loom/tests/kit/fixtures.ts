/**
 * Test Fixtures
 *
 * Pre-built mock objects for common test scenarios.
 */

import type { TreadleDefinition, OutputSpec } from '../../machinery/treadle-kit/declarative.js';

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
}

/**
 * Create a mock treadle definition for testing.
 *
 * Uses the TreadleDefinition format (tieup style - no matches needed).
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
 *       .tieup({ treadles: [mockTreadle], warpData: {} })
 *   }
 * });
 * ```
 */
export function createMockTreadle(config: MockTreadleConfig): TreadleDefinition {
  if (config.shouldError) {
    throw new Error(`Mock treadle ${config.name} configured to fail on creation`);
  }

  return {
    name: config.name,
    // Tieup style - no matches needed
    methods: {
      filter: 'core',
      pipeline: []
    },
    outputs: (ctx) => {
      // Generate output specs for each mock file
      return (config.files ?? []).map(file => ({
        template: 'mock/template.ejs',
        path: file.path,
        language: 'rust' as const
      }));
    },
    data: (ctx) => {
      // Provide file contents to templates
      return {
        mockFiles: config.files ?? [],
        mockModifiedFiles: config.modifiedFiles ?? []
      };
    }
  };
}

/**
 * Pre-built mock treadles for common scenarios.
 */
export const mockTreadles = {
  /**
   * A treadle that generates a single Rust file.
   */
  rustFile: (name: string, content?: string): TreadleDefinition => ({
    name: `rust-${name}`,
    methods: { filter: 'core', pipeline: [] },
    outputs: [{
      template: 'mock/rust-file.ejs',
      path: `src/${name}.rs`,
      language: 'rust'
    }],
    data: {
      structName: name.charAt(0).toUpperCase() + name.slice(1),
      defaultContent: content ?? `// Generated ${name}\npub struct ${name} {}`
    }
  }),

  /**
   * A treadle that generates a TypeScript file.
   */
  typescriptFile: (name: string, content?: string): TreadleDefinition => ({
    name: `ts-${name}`,
    methods: { filter: 'front', pipeline: [] },
    outputs: [{
      template: 'mock/ts-file.ejs',
      path: `${name}.ts`,
      language: 'typescript'
    }],
    data: {
      interfaceName: name.charAt(0).toUpperCase() + name.slice(1),
      defaultContent: content ?? `// Generated ${name}\nexport interface ${name} {}`
    }
  }),

  /**
   * A treadle that fails.
   */
  failing: (name: string): TreadleDefinition => ({
    name: `failing-${name}`,
    methods: { filter: 'core', pipeline: [] },
    outputs: () => {
      throw new Error(`Mock treadle ${name} failed during output generation`);
    },
    data: {}
  }),

  /**
   * A treadle that echoes its config to output.
   */
  echoConfig: (): TreadleDefinition => ({
    name: 'echo-config',
    methods: { filter: 'core', pipeline: [] },
    outputs: [{
      template: 'mock/echo.ejs',
      path: 'config.echo.json',
      language: 'rust'
    }],
    data: (ctx) => ({
      configJson: JSON.stringify(ctx.config, null, 2)
    })
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
  withTieup: (treadle: TreadleDefinition, config: Record<string, unknown>) => ({
    foundframe: {} as any, // Would have .tieup({ treadles: [treadle], warpData: config })
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
