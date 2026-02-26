/**
 * Context Entities Builder
 *
 * Builds entity helpers for the generator context.
 * Similar to context-methods.ts but for entities.
 */

import type { EntityMetadata } from '@o19/spire-loom/warp/imprint';
import type { EntityHelpers } from '../heddles/types.js';

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
