/**
 * Entity Pipeline (The Sley - Threading)
 *
 * A composable pipeline for processing Entity classes across spiral rings.
 *
 * Architecture:
 * ```
 * Entity Class (loom/bookmark.ts)
 *     ↓
 * Raw Entity[] (from inner ring)
 *     ↓
 * Translation Layer 1: addPrefix('Bookmark')
 *     ↓
 * Translation Layer 2: tagFilter(['core'])
 *     ↓
 * ... more translations ...
 *     ↓
 * Filter (by tags, readOnly)
 *     ↓
 * Code Generation
 * ```
 *
 * Mirrors the Method Pipeline pattern exactly.
 */

import type { EntityMetadata } from '@o19/spire-loom/warp/imprint';

// ============================================================================
// Core Types
// ============================================================================

/**
 * An Entity at any stage of processing.
 *
 * This is the unified representation that flows through the pipeline.
 * Each translation layer can modify fields, but the entity identity is preserved.
 */
export interface Entity {
  /** Unique identifier: "{managementName}.{entityName}" */
  readonly id: string;

  /** Management this entity belongs to (e.g., "BookmarkMgmt") */
  managementName: string;

  /** Entity class name (e.g., "Bookmark") */
  name: string;

  /** Table/collection name (defaults to entity name) */
  tableName: string;

  /** Whether this entity is read-only */
  readOnly: boolean;

  /** Tags for categorization */
  tags: string[];

  /**
   * Arbitrary metadata that translations can attach.
   * Use namespacing: 'myTranslation.key' to avoid collisions.
   */
  metadata?: Record<string, unknown>;
}

/**
 * A function that transforms entities.
 */
export type EntityTranslation = (entities: Entity[]) => Entity[];

/**
 * A filter predicate for entities.
 * Returns true to KEEP the entity, false to exclude.
 */
export type EntityFilter = (entity: Entity) => boolean;

// ============================================================================
// Pipeline Builder
// ============================================================================

/**
 * Builds an entity processing pipeline.
 *
 * Usage:
 * ```typescript
 * const pipeline = new EntityPipeline()
 *   .translate(addPrefix('Bookmark'))
 *   .translate(someTransform);
 *
 * const allEntities = pipeline.process(rawEntities);
 * const filtered = pipeline.filter(allEntities, tagFilter(['core']));
 * ```
 */
export class EntityPipeline {
  private translations: EntityTranslation[] = [];

  /**
   * Add a translation to the pipeline.
   * Translations are applied in the order added.
   */
  translate(translation: EntityTranslation): this {
    this.translations.push(translation);
    return this;
  }

  /**
   * Process entities through all translations.
   * Returns the complete, transformed entity set.
   */
  process(entities: Entity[]): Entity[] {
    return this.translations.reduce(
      (current, translate) => translate(current),
      entities
    );
  }

  /**
   * Filter entities at the last second.
   * This should be called right before code generation.
   */
  filter(entities: Entity[], predicate: EntityFilter): Entity[] {
    return entities.filter(predicate);
  }
}

// ============================================================================
// Common Translations
// ============================================================================

/**
 * Add a prefix to all entity names.
 *
 * @param prefix - Prefix to add (e.g., "Bookmark")
 * @returns Translation function
 */
export function addPrefix(prefix: string): EntityTranslation {
  return (entities) =>
    entities.map((entity) => ({
      ...entity,
      name: `${prefix}${entity.name}`,
    }));
}

/**
 * Set table names based on a pattern.
 *
 * @param pattern - Pattern to use, with {name} placeholder
 * @returns Translation function
 */
export function setTableNamePattern(pattern: string): EntityTranslation {
  return (entities) =>
    entities.map((entity) => ({
      ...entity,
      tableName: pattern.replace('{name}', entity.name.toLowerCase()),
    }));
}

// ============================================================================
// Common Filters
// ============================================================================

/**
 * Create a filter that excludes entities with matching tags.
 *
 * @param filterOut - Tags to exclude (e.g., ['internal'])
 * @returns Filter predicate
 */
export function tagFilter(filterOut: string[]): EntityFilter {
  const filterSet = new Set(filterOut);

  return (entity) => {
    if (!entity.tags || entity.tags.length === 0) {
      // Entities without tags are never filtered
      return true;
    }
    // Keep entities that don't match any filter tag
    return !entity.tags.some((tag) => filterSet.has(tag));
  };
}

/**
 * Create a filter that only includes read-only or read-write entities.
 */
export function readOnlyFilter(readOnly: boolean): EntityFilter {
  return (entity) => entity.readOnly === readOnly;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Group entities by management name.
 */
export function groupByManagement<T extends { managementName: string }>(
  entities: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const entity of entities) {
    const list = grouped.get(entity.managementName) ?? [];
    list.push(entity);
    grouped.set(entity.managementName, list);
  }

  return grouped;
}

/**
 * Group entities by readOnly status.
 */
export function groupByReadOnly<T extends { readOnly: boolean }>(
  entities: T[]
): Map<boolean, T[]> {
  const grouped = new Map<boolean, T[]>();

  for (const entity of entities) {
    const list = grouped.get(entity.readOnly) ?? [];
    list.push(entity);
    grouped.set(entity.readOnly, list);
  }

  return grouped;
}

// ============================================================================
// Source Conversion
// ============================================================================

/**
 * Convert raw EntityMetadata to Entity pipeline format.
 *
 * This is the ENTRY POINT to the pipeline - call this first to get
 * entities in the right shape, then apply translations.
 */
export function fromSourceEntities(
  managementName: string,
  entities: EntityMetadata[]
): Entity[] {
  return entities.map((entity) => ({
    id: `${managementName}.${entity.name}`,
    managementName,
    name: entity.name,
    tableName: entity.options?.tableName ?? entity.name.toLowerCase(),
    readOnly: entity.options?.readOnly ?? false,
    tags: entity.options?.tags ?? [],
  }));
}
