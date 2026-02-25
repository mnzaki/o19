/**
 * Treadle Kit - Method Helpers 🛠️
 *
 * Method transformation and helper building utilities.
 */

import type { MgmtMethod } from '../sley/index.js';
import type { RawMethod } from '../bobbin/index.js';
import type { ManagementMetadata } from '../reed/index.js';
import type { MethodHelpers } from '../heddles/index.js';
import { camelCase, toSnakeCase } from '../stringing.js';

/**
 * Convert MgmtMethod to RawMethod with snake_case conversion.
 *
 * After addManagementPrefix(), method.name looks like "bookmark_addBookmark".
 * This converts the entire thing to snake_case for the bind-point.
 * The implName is the method part without the management prefix.
 *
 * Includes enriched metadata from heddles (useResult, wrappers, fieldName).
 * 
 * @param method - Management method from pipeline
 * @returns Raw method ready for code generation
 */
export function toRawMethod(method: MgmtMethod): RawMethod {
  // The name already has format "mgmtPrefix_methodName" (e.g., "bookmark_addBookmark")
  // Convert entire thing to snake_case: "bookmark_add_bookmark"
  const bindPointName = toSnakeCase(method.name);

  // Extract just the method name part for implName
  // Split by first underscore: "bookmark_add_bookmark" -> ["bookmark", "add_bookmark"]
  const firstUnderscore = bindPointName.indexOf('_');
  const implName = firstUnderscore > 0 ? bindPointName.slice(firstUnderscore + 1) : bindPointName;

  // Extract enriched metadata from heddles (stored in method.metadata)
  const heddlesMeta = method.metadata ?? {};

  return {
    name: bindPointName,
    implName,
    jsName: method.jsName || camelCase(method.name),
    returnType: method.returnType,
    isCollection: method.isCollection,
    params: method.params.map((p) => ({
      name: p.name,
      type: p.tsType,
      optional: p.optional
    })),
    description: method.description || `${method.managementName}.${method.name}`,
    // Enriched fields from heddles (computed from ownership chain)
    useResult: heddlesMeta.useResult as boolean | undefined,
    link: heddlesMeta.fieldName
      ? {
          fieldName: heddlesMeta.fieldName as string,
          wrappers: heddlesMeta.wrappers as string[] | undefined
        }
      : undefined
  };
}

/**
 * Build MethodLink from management link metadata.
 * 
 * @param mgmt - Management metadata
 * @returns Link info or undefined if no link
 */
export function buildMethodLink(
  mgmt: ManagementMetadata
): { fieldName: string; wrappers?: string[] } | undefined {
  if (!mgmt.link) return undefined;

  return {
    fieldName: mgmt.link.fieldName,
    wrappers: ['Option', 'Mutex']
  };
}

/**
 * Extract management name from bind-point name.
 * Best-effort mapping since RawMethod doesn't have managementName.
 * 
 * @param bindPointName - Snake_case method name (e.g., "bookmark_add_bookmark")
 * @param managementNames - All known management names
 * @returns Best matching management name or undefined
 */
export function extractManagementFromBindPoint(
  bindPointName: string,
  managementNames: string[]
): string | undefined {
  const methodNameLower = bindPointName.toLowerCase();

  for (const mgmtName of managementNames) {
    const mgmtPrefix = toSnakeCase(mgmtName.replace(/Mgmt$/, ''));
    if (methodNameLower.startsWith(mgmtPrefix + '_')) {
      return mgmtName;
    }
  }
  return undefined;
}

/**
 * Build method helpers for GeneratorContext.
 * Provides convenient access to filtered and grouped methods.
 * 
 * @param methods - Raw methods after pipeline transformation
 * @returns Method helpers with grouping and filtering
 */
export function buildMethodHelpers(methods: RawMethod[]): MethodHelpers {
  return {
    all: methods,
    
    byManagement(): Map<string, RawMethod[]> {
      const map = new Map<string, RawMethod[]>();
      methods.forEach((method) => {
        // Extract management name from method name or metadata
        const mgmtName = (method as any).managementName || 
                         method.name.split('_')[0] || 
                         'default';
        const list = map.get(mgmtName) || [];
        list.push(method);
        map.set(mgmtName, list);
      });
      return map;
    },
    
    byCrud(): Map<string, RawMethod[]> {
      const map = new Map<string, RawMethod[]>();
      methods.forEach((method) => {
        const op = (method as any).crudOperation;
        if (op) {
          const list = map.get(op) || [];
          list.push(method);
          map.set(op, list);
        }
      });
      return map;
    },
    
    withTag(tag: string): RawMethod[] {
      return methods.filter(m => (m as any).tags?.includes(tag));
    },
    
    withCrud(op: string): RawMethod[] {
      return methods.filter(m => (m as any).crudOperation === op);
    },
    
    forEach(cb: (method: RawMethod) => void): void {
      methods.forEach(cb);
    },
    
    filteredForEach(filter: (method: RawMethod) => boolean, cb: (method: RawMethod) => void): void {
      methods.filter(filter).forEach(cb);
    },
    
    get creates(): RawMethod[] { return this.withCrud('create'); },
    get reads(): RawMethod[] { return this.withCrud('read'); },
    get updates(): RawMethod[] { return this.withCrud('update'); },
    get deletes(): RawMethod[] { return this.withCrud('delete'); },
    get lists(): RawMethod[] { return this.withCrud('list'); }
  };
}
