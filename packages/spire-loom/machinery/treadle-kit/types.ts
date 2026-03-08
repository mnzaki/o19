/**
 * Treadle Kit - Types 📝
 *
 * Core type definitions for the treadle kit.
 */

import type { MethodMetadata } from '../../warp/metadata.js';
import type { GeneratorContext } from '../../weaver/plan-builder.js';
import type { WeavingPlan } from '../../weaver/plan.js';
import type { GeneratedFile } from '../bobbin/index.js';
import type { SpiralNode } from '../heddles/index.js';
import type { LanguageMethod } from '../reed/language/method.js';
import type { LanguageEntity } from '../reed/language/entity.js';
import type { BoundQuery } from '../sley/query.js';
import { hookup } from '../sley/index.js';

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
  pipeline: Array<(methods: MethodMetadata[]) => MethodMetadata[]>;
}

/**
 * Language enhancement API.
 * Delegates to BoundQuery.addLang() for multi-language support.
 */
export interface LanguageAPI {
  /**
   * Enhance methods with specified languages.
   *
   * First language becomes the default (item.lang), 
   * additional languages accessible as item.rs, item.ts, etc.
   *
   * @param langs - Language identifiers (e.g., 'rust', 'typescript')
   */
  add(...langs: string[]): void;

  /** Whether any language has been added */
  readonly isEnhanced: boolean;

  /** List of enhanced language extension keys (rs, ts, kt) */
  readonly languages: string[];
}

/**
 * Output specification for file generation.
 * Language is auto-detected from template filename.
 */
export interface OutputSpec {
  template: string;
  path: string;
  condition?: (context: GeneratorContext) => boolean;
  /**
   * Per-output context data merged with main data for this output only.
   * Useful for per-entity generation with shared templates.
   */
  context?: Record<string, unknown>;
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
   * CRUD classification pipeline.
   *
   * Derives crudName from method tags before language enhancement.
   */
  //crud: CrudAPI;

  /**
   * Language enhancement system.
   *
   * Creates language views (method.rs, method.ts) with idiomatic naming.
   */
  language: LanguageAPI;

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
   *
   * Auto-enhances methods for each output's detected language.
   */
  generateFiles(
    outputs: OutputSpec[],
    data: Record<string, unknown>,
    methods: BoundQuery<LanguageMethod>,
    entities?: BoundQuery<LanguageEntity>
  ): Promise<GeneratedFile[]>;

  /**
   * Standard hookup implementations.
   */
  hookup: {
    /**
     * Android-specific hookup: manifest, AIDL callback, Gradle config.
     */
    android(data: hookup.AndroidHookupData): Promise<void>;

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
