/**
 * Management Collector
 *
 * Collects and parses Management Imprints from loom/ files.
 * Extracts @reach and @crud metadata for code generation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * CRUD operation type.
 */
export type CrudOperation = 'create' | 'read' | 'update' | 'delete' | 'list';

/**
 * Management reach level.
 */
export type ReachLevel = 'Private' | 'Local' | 'Global';

/**
 * Method metadata from @crud decorator.
 */
export interface MethodMetadata {
  /** Method name */
  name: string;
  /** CRUD operation type */
  operation: CrudOperation;
  /** Parameter types (parsed from signature) */
  params: Array<{ name: string; type: string; optional?: boolean }>;
  /** Return type */
  returnType: string;
  /** JSDoc description */
  description?: string;
  /** Whether this is a collection operation (returns array) */
  isCollection?: boolean;
  /** Whether this is a soft delete */
  isSoftDelete?: boolean;
}

/**
 * Management Imprint metadata.
 */
export interface ManagementMetadata {
  /** Management class name (e.g., "BookmarkMgmt") */
  name: string;
  /** Reach level from @reach decorator */
  reach: ReachLevel;
  /** Source file path */
  sourceFile: string;
  /** Methods with their CRUD metadata */
  methods: MethodMetadata[];
  /** Constants defined in the management */
  constants: Record<string, unknown>;
}

/**
 * Collect all Management Imprints from loom/ directory.
 */
export async function collectManagements(loomDir: string): Promise<ManagementMetadata[]> {
  const managements: ManagementMetadata[] = [];
  
  // Find all .ts files in loom/
  const files = fs.readdirSync(loomDir)
    .filter(f => f.endsWith('.ts') && f !== 'WARP.ts')
    .map(f => path.join(loomDir, f));
  
  for (const file of files) {
    try {
      const mgmt = await loadManagement(file);
      if (mgmt) {
        managements.push(mgmt);
      }
    } catch (error) {
      console.warn(`Warning: Could not load ${file}:`, error);
    }
  }
  
  return managements;
}

/**
 * Load a single Management from a file.
 */
async function loadManagement(filePath: string): Promise<ManagementMetadata | null> {
  // Import the module
  const moduleUrl = pathToFileURL(filePath).href;
  const module = await import(moduleUrl);
  
  // Find classes with @reach decorator (indicated by _reach property)
  const exports = Object.values(module);
  
  for (const exp of exports) {
    if (typeof exp === 'function' && exp.prototype?._reach && exp.prototype.constructor) {
      // This is a Management class
      return extractMetadata(exp as new (...args: any[]) => any, filePath);
    }
  }
  
  return null;
}

/**
 * Extract metadata from a Management class.
 */
function extractMetadata(
  mgmtClass: new (...args: any[]) => any,
  sourceFile: string
): ManagementMetadata {
  const prototype = mgmtClass.prototype;
  
  // Get reach from decorator
  const reach: ReachLevel = prototype._reach || 'Private';
  
  // Get CRUD methods from decorator
  const crudMethods: MethodMetadata[] = [];
  const crudMap: Map<string, { operation: CrudOperation; options?: any }> = 
    prototype._crudMethods || new Map();
  
  // Extract method signatures from class
  const propertyNames = Object.getOwnPropertyNames(prototype);
  
  for (const name of propertyNames) {
    if (name === 'constructor') continue;
    
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (typeof descriptor?.value === 'function') {
      // Check if this method has @crud decorator
      const crudInfo = crudMap.get(name);
      
      if (crudInfo) {
        crudMethods.push({
          name,
          operation: crudInfo.operation,
          params: [], // Would need TypeScript reflection to get these
          returnType: 'void', // Would need TypeScript reflection
          isCollection: crudInfo.options?.collection,
          isSoftDelete: crudInfo.options?.soft,
        });
      }
    }
  }
  
  // Get constants from prototype
  const constants: Record<string, unknown> = {};
  for (const name of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor?.value !== undefined && typeof descriptor.value !== 'function') {
      constants[name] = descriptor.value;
    }
  }
  
  return {
    name: mgmtClass.name,
    reach,
    sourceFile,
    methods: crudMethods,
    constants,
  };
}

/**
 * Filter managements by reach level for a specific ring.
 */
export function filterByReach(
  managements: ManagementMetadata[],
  ringType: 'core' | 'platform' | 'tauri' | 'ddd' | 'front'
): ManagementMetadata[] {
  const reachMap: Record<string, ReachLevel[]> = {
    core: ['Private', 'Local', 'Global'],
    platform: ['Local', 'Global'],
    tauri: ['Global'],
    ddd: ['Global'],
    front: ['Global'],
  };
  
  const allowedReach = reachMap[ringType] || ['Global'];
  
  return managements.filter(m => allowedReach.includes(m.reach));
}

/**
 * Filter methods by CRUD operation.
 */
export function filterByCrud(
  management: ManagementMetadata,
  operations: CrudOperation[]
): MethodMetadata[] {
  return management.methods.filter(m => operations.includes(m.operation));
}

/**
 * Group managements by their reach level.
 */
export function groupByReach(
  managements: ManagementMetadata[]
): Map<ReachLevel, ManagementMetadata[]> {
  const grouped = new Map<ReachLevel, ManagementMetadata[]>();
  
  for (const mgmt of managements) {
    if (!grouped.has(mgmt.reach)) {
      grouped.set(mgmt.reach, []);
    }
    grouped.get(mgmt.reach)!.push(mgmt);
  }
  
  return grouped;
}

/**
 * Generate AIDL methods from Management metadata.
 */
export function toAidlMethods(managements: ManagementMetadata[]): Array<{
  name: string;
  returnType: string;
  params: Array<{ name: string; type: string }>;
  description?: string;
}> {
  const methods: Array<{
    name: string;
    returnType: string;
    params: Array<{ name: string; type: string }>;
    description?: string;
  }> = [];
  
  for (const mgmt of managements) {
    for (const method of mgmt.methods) {
      methods.push({
        name: method.name,
        returnType: method.returnType === 'void' ? 'void' : 'String',
        params: method.params.map(p => ({
          name: p.name,
          type: mapTsToAidlType(p.type),
        })),
        description: method.description || `${mgmt.name}.${method.name}`,
      });
    }
  }
  
  return methods;
}

/**
 * Map TypeScript types to AIDL types.
 */
function mapTsToAidlType(tsType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'String',
    'String': 'String',
    'number': 'int',
    'boolean': 'boolean',
    'void': 'void',
    'any': 'String',
  };
  
  // Handle arrays
  if (tsType.endsWith('[]')) {
    const inner = tsType.slice(0, -2);
    return `${mapTsToAidlType(inner)}[]`;
  }
  
  // Handle optionals
  if (tsType.endsWith('?')) {
    const inner = tsType.slice(0, -1);
    return mapTsToAidlType(inner);
  }
  
  return typeMap[tsType] || 'String';
}
