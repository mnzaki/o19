/**
 * Management Enhancement System 🌀
 *
 * Language-specific management enhancement with naming convention support.
 *
 * Mirrors the LanguageMethod/LanguageEntity pattern:
 * - Raw management metadata stored in constructor
 * - Language-specific names resolved via conventions
 * - Language set via this.lang property
 * - Supports multi-language via cloneWithLang (rs, ts, kt properties)
 *
 * @module machinery/reed/mgmt
 */

import { pascalCase, camelCase, snakeCase, Name } from '../stringing.js';
import { LanguageThing } from './language/types.js';
import type { ManagementMetadata } from '../../warp/metadata.js';

// ============================================================================
// LanguageMgmt Class
// ============================================================================

/**
 * Management with language-specific naming conventions.
 *
 * Provides convenient getters for service/entity names following
 * the language's naming conventions (PascalCase for services,
 * camelCase for variables, etc.).
 *
 * @example
 * ```typescript
 * const mgmt = new LanguageMgmt(metadata);
 * mgmt.lang = rustLanguage;
 *
 * // Rust conventions (snake_case for modules)
 * mgmt.serviceName  // → "BookmarkService" (PascalCase)
 * mgmt.entityName   // → "bookmark" (camelCase)
 * mgmt.moduleName   // → "bookmark" (snake_case)
 * mgmt.snakeName    // → "bookmark" (snake_case)
 * ```
 */
export class LanguageMgmt extends LanguageThing {
  constructor(
    /** Raw management metadata from heddles */
    readonly raw: ManagementMetadata
  ) {
    super(raw.name.replace(/Mgmt$/, ''));
  }

  /**
   * Service name (PascalCase).
   * "BookmarkMgmt" → "BookmarkService"
   */
  get serviceName() {
    // TODO choose case based on language config
    return this.name.withSuffix('Service');
  }

  /**
   * Port name (PascalCase).
   * "BookmarkMgmt" → "BookmarkPort"
   */
  get portName() {
    // TODO choose case based on language config
    return this.name.withSuffix('Port');
  }

  /**
   * Entity name (singular, camelCase).
   * "BookmarkMgmt" → "bookmark"
   */
  get entityName() {
    // TODO choose case based on language config
    return Name.of(this.raw.entities[0]?.name ?? this.name).withNewDefault('camelCase');
  }

  /**
   * Module name (snake_case).
   * "BookmarkMgmt" → "bookmark"
   */
  get moduleName() {
    // TODO choose case based on language config
    return this.name.withNewDefault('snake_case');
  }

  /**
   * Variable name (camelCase).
   * Alias for entityName.
   */
  get variableName() {
    return this.entityName;
  }

  /**
   * Reach level from @reach decorator.
   * Exposed directly from raw metadata.
   */
  get reach(): string {
    return this.raw.reach;
  }

  /**
   * Source file path.
   * Exposed directly from raw metadata.
   */
  get sourceFile(): string {
    return this.raw.sourceFile;
  }

  /**
   * Constants defined in the management.
   * Exposed directly from raw metadata.
   */
  get constants(): Record<string, unknown> {
    return this.raw.constants;
  }

  /**
   * Link target for routing.
   * Exposed directly from raw metadata.
   */
  get link(): ManagementMetadata['link'] {
    return this.raw.link;
  }

  /**
   * Raw methods from the management.
   * For LanguageMethod instances, use the methods from the shed.
   */
  get methods(): ManagementMetadata['methods'] {
    return this.raw.methods;
  }

  /**
   * Raw entities from the management.
   * For LanguageEntity instances, use the entities from the shed.
   */
  get entities(): ManagementMetadata['entities'] {
    return this.raw.entities;
  }
}
