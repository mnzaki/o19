/**
 * Entity Field Collector 🌾
 *
 * Collects field metadata from entity classes using the shared
 * ClassMetadataCollector pattern.
 *
 * "Fields bloom from the class; we merely gather them."
 */

import { Field } from '@o19/spire-loom/warp/field';
import { createCollector } from './class-metadata-collector.js';
import type { EntityFieldMetadata } from '../treadle-kit/computed-entity-helpers.js';

/**
 * Predicate: Check if a value is a Field instance.
 */
function isFieldInstance(value: unknown): value is Field<unknown> {
  return value instanceof Field;
}

/**
 * Extractor: Set the field name and convert to metadata.
 */
function extractField(value: Field<unknown>, propName: string): EntityFieldMetadata {
  // The field was created without knowing its name
  // Now that we have the property name, set it
  value.name = propName;

  // Convert to the serializable metadata format
  // Note: Language-specific types are resolved at enhancement time
  return {
    name: value.name,
    tsType: value.tsType,
    columnName: value.columnName,
    nullable: value.nullable,
    isPrimary: value.isPrimary,
    isCreatedAt: value.isCreatedAt,
    isUpdatedAt: value.isUpdatedAt,
    forInsert: value.forInsert,
    forUpdate: value.forUpdate
  };
}

/**
 * Collector for entity fields.
 *
 * Usage:
 * ```typescript
 * const fields = collectEntityFields(Bookmark);
 * // [{ name: 'id', tsType: 'number', ... }, ...]
 * // Language-specific types resolved at enhancement time
 * ```
 */
export const collectEntityFields = createCollector({
  predicate: isFieldInstance,
  extractor: extractField
});

/**
 * Convenience function to collect fields directly.
 *
 * @param EntityClass - The entity class to inspect
 * @returns Array of field metadata
 */
export function getEntityFields(EntityClass: new (...args: any[]) => any): EntityFieldMetadata[] {
  return collectEntityFields.collect(EntityClass);
}
