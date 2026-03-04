/**
 * CRUD Pipeline 🗂️
 *
 * CRUD classification pipeline - runs BEFORE language enhancement.
 *
 * CRUD is a method classification system, not a language concern.
 * It derives crudName from tags like 'crud:create'.
 *
 * @module machinery/sley/crud-pipeline
 */

import type { RawMethod } from '../bobbin/code-generator.js';
import { getCrudNameFromTags } from '../../warp/crud-derivation.js';

/**
 * Apply CRUD classification to raw methods.
 *
 * Adds crudName property to methods that have CRUD tags.
 * This runs BEFORE language enhancement.
 *
 * @param methods - Raw methods from management metadata
 * @returns Methods with crudName added where applicable
 */
export function applyCrudPipeline(methods: RawMethod[]): RawMethod[] {
  return methods.map((method) => {
    const crudName = getCrudNameFromTags(method);
    if (!crudName) return method;

    return {
      ...method,
      crudName
    };
  });
}

/**
 * Check if a method has CRUD classification.
 *
 * @param method - Raw method to check
 * @returns True if method has a 'crud:*' tag
 */
export function hasCrudOperation(method: RawMethod): boolean {
  return method.tags?.some((t) => t.startsWith('crud:')) ?? false;
}

/**
 * Get the CRUD operation type from method tags.
 *
 * @param method - Raw method to inspect
 * @returns CRUD operation ('create', 'read', 'update', 'delete', 'list') or undefined
 */
export function getCrudOperation(method: RawMethod): string | undefined {
  const tag = method.tags?.find((t) => t.startsWith('crud:'));
  return tag?.replace('crud:', '');
}
