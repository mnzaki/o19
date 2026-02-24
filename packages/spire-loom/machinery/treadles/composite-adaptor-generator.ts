/**
 * Composite Adaptor Generator
 *
 * "The loom weaves a loom that weaves."
 *
 * Generates hybrid adaptors that route CRUD operations to different
 * underlying adaptors based on operation type:
 * - READ operations → Drizzle/SQLite adaptor
 * - WRITE operations → Tauri/TheStream adaptor
 *
 * This enables the full circle architecture:
 *   TypeScript → Composite Adaptor → (Drizzle for read, Tauri→TheStream→PKB for write) → Event → DbActor → SQLite
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratorContext, GeneratedFile } from '../heddles/index.js';
import type { RawMethod } from '../bobbin/index.js';
import {
  defineTreadle,
  generateFromTreadle,
  type TreadleDefinition,
} from '../treadle-kit/declarative.js';
import {
  routeOperation,
  analyzeRouting,
  isHybridRouting,
  getReadAdaptor,
  getWriteAdaptor,
} from '../sley/operation-router.js';
import type { CrudOperation } from '../../warp/crud.js';
import { OperationMux } from '../../warp/spiral/operation-mux.js';

// ============================================================================
// Types
// ============================================================================

export interface CompositeAdaptorOptions {
  /** Output directory for generated files */
  outputDir: string;
  /** Management name (e.g., 'Bookmark', 'Media') */
  managementName: string;
  /** Port interface name */
  portName: string;
  /** Read adaptor class name */
  readAdaptorName: string;
  /** Write adaptor class name */
  writeAdaptorName: string;
  /** Whether to generate event coordination */
  generateEventCoordination?: boolean;
}

export interface CompositeMethod {
  /** CRUD operation type */
  operation: CrudOperation;
  /** Method name */
  name: string;
  /** Target adaptor: 'read' | 'write' */
  target: 'read' | 'write';
  /** Parameter types */
  params: Array<{ name: string; type: string }>;
  /** Return type */
  returnType: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractManagementName(current: SpiralNode, previous: SpiralNode): string | undefined {
  // Try to extract from current node's metadata
  const metadata = (current.ring as any).metadata;
  if (metadata?.managementName) {
    return metadata.managementName;
  }
  
  // Try from previous node's core
  const core = (previous.ring as any).core;
  if (core?.name) {
    return core.name;
  }
  
  // Default: extract from ring type name
  const ringName = current.ring.constructor.name;
  if (ringName.includes('Ring')) {
    return ringName.replace('Ring', '');
  }
  
  return undefined;
}

function methodNameForOperation(operation: CrudOperation, entityName: string): string {
  switch (operation) {
    case 'create':
      return `add${entityName}`;
    case 'read':
      return `get${entityName}`;
    case 'update':
      return `update${entityName}`;
    case 'delete':
      return `delete${entityName}`;
    case 'list':
      return `list${entityName}s`;
    default:
      return `${operation}${entityName}`;
  }
}

function generateParams(operation: CrudOperation, entityName: string): Array<{ name: string; type: string }> {
  switch (operation) {
    case 'create':
      return [{ name: 'data', type: `Create${entityName}Input` }];
    case 'read':
      return [{ name: 'id', type: 'string' }];
    case 'update':
      return [
        { name: 'id', type: 'string' },
        { name: 'data', type: `Update${entityName}Input` },
      ];
    case 'delete':
      return [{ name: 'id', type: 'string' }];
    case 'list':
      return [
        { name: 'filter', type: `${entityName}Filter?` },
        { name: 'cursor', type: 'string?' },
      ];
    default:
      return [];
  }
}

function generateReturnType(operation: CrudOperation, entityName: string): string {
  switch (operation) {
    case 'create':
      return `Promise<${entityName}>`;
    case 'read':
      return `Promise<${entityName} | null>`;
    case 'update':
      return `Promise<${entityName}>`;
    case 'delete':
      return `Promise<boolean>`;
    case 'list':
      return `Promise<${entityName}ListResult>`;
    default:
      return 'Promise<void>';
  }
}

// ============================================================================
// Generator Function
// ============================================================================

export interface CompositeGenerationOptions {
  outputDir: string;
  managementName: string;
  portName?: string;
  readAdaptorName?: string;
  writeAdaptorName?: string;
}

/**
 * Generate composite adaptor files.
 *
 * This is the main entry point for the generator.
 * It analyzes the OperationMux routing and generates the appropriate adaptor.
 */
export async function generateCompositeAdaptor(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  // Check if this is actually an OperationMux
  if (!(previous.ring instanceof OperationMux)) {
    console.log('  ⚠ Not an OperationMux ring, skipping composite generation');
    return [];
  }
  
  // Extract management name
  const managementName = extractManagementName(current, previous) || 'Entity';
  const portName = `I${managementName}Port`;
  
  // Analyze the operation routing
  const routing = analyzeRouting(previous.ring);
  const isHybrid = isHybridRouting(previous.ring);
  
  // Get adaptor names
  const readAdaptor = getReadAdaptor(previous.ring);
  const writeAdaptor = getWriteAdaptor(previous.ring);
  const readAdaptorName = readAdaptor ? `${managementName}DrizzleAdaptor` : 'unknown';
  const writeAdaptorName = writeAdaptor ? `${managementName}TauriAdaptor` : 'unknown';
  
  // Build method configurations
  const methods: CompositeMethod[] = routing.map(r => ({
    operation: r.operation,
    name: methodNameForOperation(r.operation, managementName),
    target: r.category === 'read' ? 'read' : 'write',
    params: generateParams(r.operation, managementName),
    returnType: generateReturnType(r.operation, managementName),
  }));
  
  // Build template data
  const templateData = {
    managementName,
    portName,
    readAdaptorName,
    writeAdaptorName,
    isHybrid,
    methods,
    routing,
  };
  
  // For now, return a placeholder file
  // In full implementation, this would use the treadle kit
  const outputPath = path.join(
    context?.workspaceRoot ?? process.cwd(),
    'foundframe-tauri/ts/composite',
    `${managementName.toLowerCase()}.composite.adaptor.ts`
  );
  
  console.log(`  ✓ Generated composite adaptor for ${managementName}`);
  console.log(`    Read → ${readAdaptorName}`);
  console.log(`    Write → ${writeAdaptorName}`);
  console.log(`    Methods: ${methods.length} (${methods.filter(m => m.target === 'read').length} read, ${methods.filter(m => m.target === 'write').length} write)`);
  
  // Return generated file metadata
  return [{
    path: outputPath,
    content: `// Composite adaptor for ${managementName}
// Generated by spire-loom composite-adaptor-generator
// Template data: ${JSON.stringify(templateData, null, 2)}
`,
  }];
}

// ============================================================================
// Treadle Definition (for declarative use)
// ============================================================================

/**
 * Composite Adaptor Treadle
 *
 * Matches OperationMux rings and generates hybrid adaptors.
 * 
 * NOTE: This treadle uses custom validation since OperationMux
 * can appear at different points in the spiral chain.
 */
export const compositeAdaptorTreadle: TreadleDefinition = defineTreadle({
  // Match any pair - validation checks for OperationMux
  matches: [
    { current: 'any', previous: 'any' },
  ],
  
  // Method collection
  methods: {
    filter: 'front',
    pipeline: [],
  },
  
  // Output specification
  outputs: [
    {
      template: 'composite/adaptor.ts.ejs',
      path: '{outputDir}/{managementName}.composite.adaptor.ts',
      language: 'typescript',
    },
  ],
  
  // Custom validation: only generate for OperationMux
  validate: (current: SpiralNode, previous: SpiralNode): boolean => {
    const isMux = previous.ring instanceof OperationMux;
    if (isMux && process.env.DEBUG_MATRIX) {
      console.log(`[COMPOSITE] Validated OperationMux for ${previous.ring.constructor.name}`);
    }
    return isMux;
  },
  
  // Extra data for templates
  data: (context: GeneratorContext, current: SpiralNode, previous: SpiralNode) => {
    const managementName = extractManagementName(current, previous) || 'Entity';
    const routing = analyzeRouting(previous.ring);
    const isHybrid = isHybridRouting(previous.ring);
    
    const readAdaptor = getReadAdaptor(previous.ring);
    const writeAdaptor = getWriteAdaptor(previous.ring);
    
    const methods: CompositeMethod[] = routing.map(r => ({
      operation: r.operation,
      name: methodNameForOperation(r.operation, managementName),
      target: r.category === 'read' ? 'read' : 'write',
      params: generateParams(r.operation, managementName),
      returnType: generateReturnType(r.operation, managementName),
    }));
    
    return {
      managementName,
      portName: `I${managementName}Port`,
      readAdaptorName: readAdaptor ? `${managementName}DrizzleAdaptor` : 'unknown',
      writeAdaptorName: writeAdaptor ? `${managementName}TauriAdaptor` : 'unknown',
      isHybrid,
      methods,
      routing,
    };
  },
  
  // Custom hookup for TypeScript/npm packages
  hookup: {
    type: 'custom',
    customHookup: async (context, files, data) => {
      console.log(`  ✓ Hooked up composite adaptor for ${data.managementName}`);
    },
  },
});

// ============================================================================
// Template Data Types
// ============================================================================

/**
 * Template data structure for composite/adaptor.ts.ejs
 */
export interface CompositeAdaptorTemplateData {
  managementName: string;
  portName: string;
  readAdaptorName: string;
  writeAdaptorName: string;
  methods: CompositeMethod[];
  isHybrid: boolean;
}
