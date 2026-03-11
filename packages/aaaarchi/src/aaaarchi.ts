/**
 * AAAArchi - Architecture Annotating Aardvark Archi
 * 
 * The foundation layer implementation.
 * 
 * TODO: This is a stub implementation for API validation.
 * Full implementation would:
 * - Parse file paths to infer domain/layer
 * - Build DAG from all registered file scopes
 * - Track attempt history for Orka
 */

import type {
  BaseAnnotation,
  ArchitecturalContext,
  ArchitectureConfig,
  FileScope,
  ProjectDAG,
  AAAArchiAPI,
  LayerConfig,
} from './types.js';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const defaultConfig: ArchitectureConfig = {
  layers: {
    domain: {
      canDependOn: [],
      invariant: 'Domain logic must be pure',
      position: 0,
    },
    usecase: {
      canDependOn: ['domain'],
      invariant: 'Use cases orchestrate domain logic',
      position: 1,
    },
    repository: {
      canDependOn: ['domain', 'infrastructure'],
      invariant: 'Repository abstracts storage',
      position: 2,
    },
    service: {
      canDependOn: ['domain', 'repository', 'usecase'],
      invariant: 'Services coordinate use cases',
      position: 2,
    },
    controller: {
      canDependOn: ['domain', 'service'],
      invariant: 'Controllers handle HTTP only',
      position: 3,
    },
    infrastructure: {
      canDependOn: [],
      invariant: 'Infrastructure provides primitives',
      position: 4,
    },
  },
};

// ============================================
// IN-MEMORY STATE (stub implementation)
// ============================================

const fileScopes = new Map<string, FileScopeImpl>();
const annotations = new Map<string, BaseAnnotation[]>();
const attemptHistory = new Map<string, Array<{ layer: string; timestamp: number; success: boolean; error?: Error }>>();

let currentContext: ArchitecturalContext | undefined;

// ============================================
// FILE SCOPE IMPLEMENTATION
// ============================================

class FileScopeImpl implements FileScope {
  readonly file: string;
  readonly domain: string;
  readonly layer: string;
  private config: ArchitectureConfig;

  constructor(filePath: string, config: ArchitectureConfig = defaultConfig) {
    this.file = filePath;
    this.config = config;
    
    // Infer domain and layer from file path
    // Strategy: check folder names, then filename
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    const fileNameWithoutExt = fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
    
    // Try to infer layer from path (folder or filename)
    const layerMatch = parts.find(p => p in config.layers) || 
                       (fileNameWithoutExt in config.layers ? fileNameWithoutExt : undefined);
    this.layer = layerMatch || 'unknown';
    
    // Try to infer domain from path (usually parent of layer)
    const layerIndex = parts.indexOf(this.layer);
    this.domain = layerIndex > 0 ? parts[layerIndex - 1] : 'unknown';
    
    // Fallback: extract domain hints from filename or path
    if (this.domain === 'unknown') {
      // Remove file extension and check for domain hints
      const nameHints = fileNameWithoutExt.toLowerCase();
      if (nameHints.includes('user')) this.domain = 'user';
      else if (nameHints.includes('auth')) this.domain = 'auth';
      else if (nameHints.includes('bookmark')) this.domain = 'bookmark';
      else this.domain = 'app';
    }
  }

  annotate(fn: Function, annotation: BaseAnnotation): void {
    const key = `${this.file}#${fn.name || 'anonymous'}`;
    const existing = annotations.get(key) || [];
    existing.push(annotation);
    annotations.set(key, existing);
    
    // Set current context for decorators
    currentContext = this.getContext();
  }

  getContext(): ArchitecturalContext {
    const layerConfig = this.config.layers[this.layer] || { canDependOn: [] };
    
    return {
      domain: this.domain,
      layer: this.layer,
      function: 'unknown', // Would be set by decorator
      file: this.file,
      canDependOn: layerConfig.canDependOn,
      invariant: layerConfig.invariant,
    };
  }

  canCall(targetLayer: string): boolean {
    const layerConfig = this.config.layers[this.layer];
    if (!layerConfig) return false;
    return layerConfig.canDependOn.includes(targetLayer);
  }

  getValidTargets(): string[] {
    const layerConfig = this.config.layers[this.layer];
    return layerConfig?.canDependOn || [];
  }
}

// ============================================
// GLOBAL API IMPLEMENTATION
// ============================================

const AAAArchi: AAAArchiAPI = {
  forFile(filePath: string): FileScope {
    if (!fileScopes.has(filePath)) {
      fileScopes.set(filePath, new FileScopeImpl(filePath));
    }
    return fileScopes.get(filePath)!;
  },

  getCurrentContext(): ArchitecturalContext | undefined {
    return currentContext;
  },

  buildProjectDAG(): ProjectDAG {
    // STUB: Build DAG from accumulated file scopes
    const nodes: ProjectDAG['nodes'] = [];
    const edges: ProjectDAG['edges'] = [];
    const violations: ProjectDAG['violations'] = [];

    // Collect all unique domain:layer combinations
    const seen = new Set<string>();
    for (const scope of fileScopes.values()) {
      const id = `${scope.domain}:${scope.layer}`;
      if (!seen.has(id)) {
        seen.add(id);
        
        const scopeImpl = scope as FileScopeImpl;
        const validTargets = scope.getValidTargets();
        
        nodes.push({
          id,
          domain: scope.domain,
          layer: scope.layer,
          dependencies: validTargets.map(l => `${scope.domain}:${l}`),
        });

        // Add edges
        for (const target of validTargets) {
          edges.push({ from: id, to: `${scope.domain}:${target}` });
        }
      }
    }

    return { nodes, edges, violations };
  },

  validatePath(layers: string[]): Array<{ violation: string; explanation: string; fix: string }> {
    const violations: Array<{ violation: string; explanation: string; fix: string }> = [];
    
    // Check each transition
    for (let i = 1; i < layers.length; i++) {
      const from = layers[i - 1];
      const to = layers[i];
      
      const fromConfig = defaultConfig.layers[from];
      if (!fromConfig) {
        violations.push({
          violation: `Unknown layer: ${from}`,
          explanation: `Layer ${from} is not defined in the architecture`,
          fix: `Define ${from} in AAAArchi configuration`,
        });
        continue;
      }
      
      if (!fromConfig.canDependOn.includes(to)) {
        // Check if it's a skip (missing intermediate layer)
        const expectedPath = findPath(defaultConfig.layers, from, to);
        if (expectedPath) {
          violations.push({
            violation: `Layer skip: ${from} → ${to}`,
            explanation: `Expected: ${from} → ${expectedPath.join(' → ')}`,
            fix: `Add missing intermediate layer calls`,
          });
        } else {
          violations.push({
            violation: `Invalid dependency: ${from} → ${to}`,
            explanation: `${from} cannot depend on ${to}`,
            fix: `Review architectural constraints`,
          });
        }
      }
    }
    
    return violations;
  },

  getAttemptHistory(operationId: string): Array<{ layer: string; timestamp: number; success: boolean; error?: Error }> {
    return attemptHistory.get(operationId) || [];
  },

  recordAttempt(operationId: string, result: { layer: string; success: boolean; error?: Error }): void {
    const history = attemptHistory.get(operationId) || [];
    history.push({
      layer: result.layer,
      timestamp: Date.now(),
      success: result.success,
      error: result.error,
    });
    attemptHistory.set(operationId, history);
  },
};

// ============================================
// UTILITIES
// ============================================

function findPath(layers: Record<string, LayerConfig>, from: string, to: string): string[] | null {
  // BFS to find path between layers
  const queue: Array<{ layer: string; path: string[] }> = [{ layer: from, path: [] }];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const { layer, path } = queue.shift()!;
    
    if (layer === to) {
      return path;
    }
    
    if (visited.has(layer)) continue;
    visited.add(layer);
    
    const config = layers[layer];
    if (config) {
      for (const dep of config.canDependOn) {
        queue.push({ layer: dep, path: [...path, dep] });
      }
    }
  }
  
  return null;
}

// ============================================
// EXPORTS
// ============================================

export { AAAArchi };
export type * from './types.js';
