/**
 * Treadle Kit - Types 📝
 *
 * Core type definitions for the treadle kit.
 */

import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod, GeneratedFile } from '../bobbin/index.js';
import type { SpiralNode, GeneratorContext, WeavingPlan, MethodHelpers } from '../heddles/index.js';
import type { AndroidHookupData } from '../shuttle/hookup-manager.js';

/**
 * Method filtering and transformation configuration.
 * Mirrors the type in declarative.ts for kit usage.
 */
export interface MethodConfig {
  /**
   * Filter by reach level.
   * - 'core': Core only (includes Private reach)
   * - 'platform': Core + Platform (Local reach)
   * - 'front': All rings (Global reach)
   */
  filter: 'core' | 'platform' | 'front';

  /**
   * Pipeline transformations to apply.
   */
  pipeline: Array<(methods: MgmtMethod[]) => MgmtMethod[]>;
}

/**
 * The TreadleKit interface - all capabilities for building generators.
 */
export interface TreadleKit {
  /** The generator context */
  context: GeneratorContext;

  /** The weaving plan */
  plan: WeavingPlan;

  /**
   * Validate node types match expected pattern.
   * Returns true if valid, false if should skip silently.
   * Throws if invalid and should abort.
   */
  validateNodes(
    current: SpiralNode,
    previous: SpiralNode,
    expected: { current: string; previous: string }
  ): boolean;

  /**
   * Collect methods from managements with filtering and transformation.
   */
  collectMethods(config: MethodConfig): RawMethod[];

  /**
   * Build template data from a function or static object.
   */
  buildData(
    dataFn: (
      context: GeneratorContext,
      current: SpiralNode,
      previous: SpiralNode
    ) => Record<string, unknown>,
    current: SpiralNode,
    previous: SpiralNode
  ): Record<string, unknown>;

  /**
   * Generate multiple files from templates.
   */
  generateFiles(
    outputs: Array<{
      template: string;
      path: string;
      language: 'kotlin' | 'rust' | 'rust_jni' | 'aidl' | 'typescript';
      condition?: (context: GeneratorContext) => boolean;
      /** 
       * Per-output context data merged with main data for this output only.
       * Useful for per-entity generation with shared templates.
       */
      context?: Record<string, unknown>;
    }>,
    data: Record<string, unknown>,
    methods: RawMethod[]
  ): Promise<GeneratedFile[]>;

  /**
   * Standard hookup implementations.
   */
  hookup: {
    /**
     * Android-specific hookup: manifest, AIDL callback, Gradle config.
     */
    android(data: AndroidHookupData): Promise<void>;

    /**
     * TODO: Rust crate hookup.
     */
    rustCrate(packageDir: string, moduleName: string): void;

    /**
     * TODO: Tauri plugin hookup.
     */
    tauriPlugin(options: { libRsPath: string; commands: string[] }): void;
  };
}
