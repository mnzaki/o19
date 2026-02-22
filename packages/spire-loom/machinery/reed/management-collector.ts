/**
 * Management Collector
 *
 * Collects and parses Management Imprints from loom/ files.
 * Extracts @reach and @crud metadata for code generation.
 * Uses Stage 3 decorator metadata (WeakMap-based).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getReach, getCrudMethods, getMethodTags, getLinkTarget, type CrudMetadata } from '../../warp/imprint.js';
import type { LinkMetadata } from '../../warp/imprint.js';

// TypeScript method signature parser
interface ParsedMethod {
  name: string;
  params: Array<{ name: string; type: string; optional?: boolean }>;
  returnType: string;
}

/**
 * Parse TypeScript source file to extract method signatures.
 * This is a simple regex-based parser for Management classes.
 */
function parseMethodSignatures(sourceFile: string): Map<string, ParsedMethod> {
  const methods = new Map<string, ParsedMethod>();
  const content = fs.readFileSync(sourceFile, 'utf-8');
  
  // Match method signatures like:
  //   addBookmark(url: string, title?: string, notes?: string): string
  //   getNodeId(): string
  //   confirmPairing(deviceId: string, code: string): boolean
  const methodRegex = /^(\s+)(\w+)\s*\(([^)]*)\)\s*:\s*(\w+(?:\[\])?)\s*\{/gm;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, , name, paramsStr, returnType] = match;
    
    // Skip constructor and private methods
    if (name === 'constructor' || name.startsWith('_')) continue;
    
    // Parse parameters
    const params: Array<{ name: string; type: string; optional?: boolean }> = [];
    if (paramsStr.trim()) {
      const paramParts = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
      for (const param of paramParts) {
        // Match: name: type or name?: type
        const paramMatch = param.match(/^(\w+)(\?)?:\s*(.+)$/);
        if (paramMatch) {
          params.push({
            name: paramMatch[1],
            type: paramMatch[3].trim(),
            optional: !!paramMatch[2],
          });
        }
      }
    }
    
    methods.set(name, {
      name,
      params,
      returnType: returnType.trim(),
    });
  }
  
  return methods;
}

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
  /** CRUD operation type (if CRUD-tagged) */
  operation?: CrudOperation;
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
  /** Tags attached to this method (e.g., ['crud:create', 'auth:required']) */
  tags?: string[];
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
  /** Link target for routing (e.g., Foundframe.device_manager) */
  link?: LinkMetadata;
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
  
  // Find classes with @reach decorator (indicated by reachMetadata)
  for (const [exportName, exported] of Object.entries(module)) {
    if (typeof exported === 'function' && getReach(exported)) {
      // This is a Management class
      return extractMetadata(exported as new (...args: any[]) => any, filePath);
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
  // Get reach from decorator metadata (Stage 3)
  const reach = getReach(mgmtClass) ?? 'Private';
  
  // Get link target from decorator metadata
  const link = getLinkTarget(mgmtClass);
  
  // Get CRUD methods from decorator metadata
  const crudMethods = getCrudMethods(mgmtClass);
  
  // Get method tags from decorator metadata
  const methodTags = getMethodTags(mgmtClass);
  
  // Parse method signatures from source file
  const parsedMethods = parseMethodSignatures(sourceFile);
  
  const methods: MethodMetadata[] = [];
  const processedMethods = new Set<string>();
  
  // First, collect all CRUD-tagged methods
  if (crudMethods) {
    for (const [methodName, metadata] of crudMethods) {
      // Get parsed signature if available
      const parsed = parsedMethods.get(methodName);
      
      // Get tags for this method
      const tags = methodTags?.get(methodName);
      
      methods.push({
        name: methodName,
        operation: metadata.operation as CrudOperation,
        params: parsed?.params ?? [],
        returnType: parsed?.returnType ?? 'void',
        isCollection: metadata.collection,
        isSoftDelete: metadata.soft,
        tags,
      });
      processedMethods.add(methodName);
    }
  }
  
  // Then, collect all other parsed methods (non-CRUD)
  for (const [methodName, parsed] of parsedMethods.entries()) {
    if (processedMethods.has(methodName)) continue;
    
    // Get tags for this method (if any)
    const tags = methodTags?.get(methodName);
    
    methods.push({
      name: methodName,
      params: parsed.params,
      returnType: parsed.returnType,
      isCollection: false,
      isSoftDelete: false,
      tags,
    });
  }
  
  // Get constants from prototype
  const constants: Record<string, unknown> = {};
  const prototype = mgmtClass.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);
  
  for (const name of propertyNames) {
    if (name === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor?.value !== undefined && typeof descriptor.value !== 'function') {
      constants[name] = descriptor.value;
    }
  }
  
  return {
    name: mgmtClass.name,
    reach,
    sourceFile,
    methods,
    constants,
    link,
  };
}

/**
 * Filter managements by reach level for a specific ring.
 * 
 * Reach levels:
 * - Global: Available in all rings (core → platform → tauri → ddd → front)
 * - Local:  Available in core, platform, tauri, ddd (NOT front/typescript)
 * - Private: Core only
 */
export function filterByReach(
  managements: ManagementMetadata[],
  ringType: 'core' | 'platform' | 'tauri' | 'ddd' | 'front'
): ManagementMetadata[] {
  const reachMap: Record<string, ReachLevel[]> = {
    core: ['Private', 'Local', 'Global'],
    platform: ['Local', 'Global'],
    tauri: ['Local', 'Global'],  // Local includes tauri
    ddd: ['Local', 'Global'],     // Local includes ddd
    front: ['Global'],            // Only Global reaches front
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
  return management.methods.filter(m => m.operation && operations.includes(m.operation));
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
