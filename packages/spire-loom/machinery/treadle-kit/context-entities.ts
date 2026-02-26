/**
 * Context Entities Builder
 *
 * Builds entity helpers for the generator context.
 * Similar to context-methods.ts but for entities.
 */

import type { EntityMetadata } from '@o19/spire-loom/warp/imprint';
import type { EntityHelpers, EntityWithFields } from '../heddles/types.js';
import { buildComputedHelpers } from './computed-entity-helpers.js';

/**
 * Build entity helpers for the generator context.
 */
export function buildContextEntities(entities: EntityMetadata[]): EntityHelpers {
  return {
    all: entities,

    byManagement(): Map<string, EntityMetadata[]> {
      const grouped = new Map<string, EntityMetadata[]>();
      for (const entity of entities) {
        const list = grouped.get(entity.managementName) ?? [];
        list.push(entity);
        grouped.set(entity.managementName, list);
      }
      return grouped;
    },

    withTag(tag: string): EntityMetadata[] {
      return entities.filter((e) => e.options?.tags?.includes(tag));
    },

    get readOnly(): EntityMetadata[] {
      return entities.filter((e) => e.options?.readOnly);
    },

    get readWrite(): EntityMetadata[] {
      return entities.filter((e) => !e.options?.readOnly);
    },

    /**
     * Get entities with field metadata and computed SQL helpers.
     *
     * This is the main entry point for code generation - it provides
     * entities with all the computed properties templates need:
     * - insertFields, updateFields
     * - insertColumns, insertPlaceholders
     * - primaryField, etc.
     */
    withFields(): EntityWithFields[] {
      return entities
        .filter((e) => e.fields && e.fields.length > 0)
        .map((entity) => {
          const helpers = buildComputedHelpers(entity.fields!);
          return {
            ...entity,
            ...helpers
          } as EntityWithFields;
        });
    },

    forEach(cb: (entity: EntityMetadata) => void): void {
      entities.forEach(cb);
    },

    filteredForEach(
      filter: (entity: EntityMetadata) => boolean,
      cb: (entity: EntityMetadata) => void
    ): void {
      entities.filter(filter).forEach(cb);
    }
  };
}
