/**
 * CRUD Derivation 🎯
 *
 * Derive CRUD method names from tags and method metadata.
 *
 * Moved from machinery/reed/language-types.ts as part of
 * the CRUD/language separation refactoring.
 *
 * @module warp/crud-derivation
 */

import type { CrudOperation } from './crud.js';

/**
 * Derive the standardized CRUD method name from operation and context.
 *
 * @param crudOperation - The CRUD operation type
 * @param hasIdParam - Whether the method has an 'id' parameter
 * @param entityName - The entity name (for 'getEntity' style naming)
 * @returns Standardized CRUD method name
 *
 * @example
 * deriveCrudMethodName('read', true) → 'getById'
 * deriveCrudMethodName('read', false, 'Bookmark') → 'getBookmark'
 * deriveCrudMethodName('create', false) → 'create'
 */
export function deriveCrudMethodName(
  crudOperation: CrudOperation | undefined,
  hasIdParam: boolean,
  entityName?: string
): string {
  if (!crudOperation) return '';

  switch (crudOperation) {
    case 'create':
      return 'create';
    case 'read':
      return hasIdParam ? 'getById' : entityName ? `get${entityName}` : 'get';
    case 'list':
      return 'list';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    default:
      return '';
  }
}

/**
 * Extract entity name from method name.
 *
 * Best-effort extraction from patterns like:
 * - 'bookmark_addBookmark' → 'Bookmark'
 * - 'addBookmark' → 'Bookmark'
 *
 * @param methodName - The method name
 * @returns Extracted entity name or undefined
 */
function extractEntityFromMethod(methodName: string): string | undefined {
  // Try to extract from management_prefix_methodName pattern
  const parts = methodName.split('_');
  if (parts.length >= 2) {
    // Last part often contains the entity/action
    const lastPart = parts[parts.length - 1];
    // Remove common action prefixes
    const entityMatch = lastPart.match(/^(?:add|get|update|delete|list)(.+)/i);
    if (entityMatch) {
      return entityMatch[1];
    }
  }
  return undefined;
}

/**
 * Get CRUD name from method tags.
 *
 * Looks for 'crud:*' tag and derives appropriate method name.
 *
 * @param method - Method with tags
 * @returns CRUD method name or undefined if no CRUD tag
 */
export function getCrudNameFromTags(method: { tags?: string[] }): string | undefined {
  const crudTag = method.tags?.find((t) => t.startsWith('crud:'));
  if (!crudTag) return undefined;

  const operation = crudTag.replace('crud:', '') as CrudOperation;
  const entityName = extractEntityFromMethod(''); // TODO: get actual method name
  const hasId = false; // TODO: check actual params

  return deriveCrudMethodName(operation, hasId, entityName);
}

/**
 * Get CRUD name from method with full context.
 *
 * @param method - Method with name, tags, and params
 * @returns CRUD method name or undefined
 */
export function getCrudNameFromMethod(method: {
  name: string;
  tags?: string[];
  params?: Array<{ name: string }>;
}): string | undefined {
  const crudTag = method.tags?.find((t) => t.startsWith('crud:'));
  if (!crudTag) return undefined;

  const operation = crudTag.replace('crud:', '') as CrudOperation;
  const entityName = extractEntityFromMethod(method.name);
  const hasId = method.params?.some((p) => p.name === 'id') ?? false;

  return deriveCrudMethodName(operation, hasId, entityName);
}
