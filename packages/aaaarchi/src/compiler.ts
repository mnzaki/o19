/**
 * AAAArchi Compiler - Declarative to Imperative
 * 
 * Transforms declarative ArchitectureConfig into imperative runtime validators.
 * 
 * This is the "compilation" phase of the two-layer pattern:
 *   LAYER 1: Declarative (ArchitectureConfig - what)
 *   ↓ compileToImperative()
 *   LAYER 2: Imperative (ImperativeArchitecture - how)
 * 
 * Inspired by spire-loom's compileToImperative() for language definitions.
 */

import type { 
  ArchitectureConfig, 
  LayerConfig,
  ProjectDAG,
  ArchitecturalContext 
} from './types.js';
import { findLayerPath, findAllLayerPaths, analyzeDAG } from './utils.js';

// ============================================
// IMPERATIVE ARCHITECTURE INTERFACE
// ============================================

/**
 * The compiled imperative architecture.
 * Fast runtime validators pre-computed from declarative config.
 */
export interface ImperativeArchitecture {
  /** O(1) layer transition check */
  canCall(fromLayer: string, toLayer: string): boolean;
  
  /** Pre-computed path validation */
  validatePath(layers: string[]): PathValidationResult;
  
  /** Pre-computed shortest path */
  getPath(fromLayer: string, toLayer: string): string[] | null;
  
  /** Pre-computed all paths */
  getAllPaths(fromLayer: string, toLayer: string): string[][];
  
  /** Cycle detection */
  detectCycle(chain: string[]): string[] | null;
  
  /** Get layer's position in onion */
  getPosition(layer: string): number;
  
  /** Get layer's allowed dependencies */
  getDependencies(layer: string): string[];
  
  /** Get all layers that can reach this layer */
  getDependents(layer: string): string[];
  
  /** Check if layer exists */
  hasLayer(layer: string): boolean;
  
  /** Get layer config */
  getLayerConfig(layer: string): LayerConfig | undefined;
  
  /** Get all layer names */
  getAllLayers(): string[];
  
  /** Get entry points (no incoming edges) */
  getEntryPoints(): string[];
  
  /** Get leaf nodes (no outgoing edges) */
  getLeaves(): string[];
  
  /** Generate DAG for visualization */
  toDAG(): ProjectDAG;
  
  /** The original config (for introspection) */
  readonly source: ArchitectureConfig;
}

export interface PathValidationResult {
  valid: boolean;
  violations: PathViolation[];
  suggestedPath: string[] | null;
}

export interface PathViolation {
  type: 'layer-skip' | 'invalid-dependency' | 'unknown-layer' | 'cycle';
  from: string;
  to: string;
  explanation: string;
  fix: string;
  severity: 'error' | 'warning';
}

// ============================================
// COMPILATION CACHE
// ============================================

const compilationCache = new Map<string, ImperativeArchitecture>();

function getCacheKey(config: ArchitectureConfig): string {
  // Simple hash of config
  return JSON.stringify(config);
}

// ============================================
// COMPILER IMPLEMENTATION
// ============================================

export function compileToImperative(
  config: ArchitectureConfig
): ImperativeArchitecture {
  const cacheKey = getCacheKey(config);
  
  if (compilationCache.has(cacheKey)) {
    return compilationCache.get(cacheKey)!;
  }
  
  const imperative = new ImperativeArchitectureImpl(config);
  compilationCache.set(cacheKey, imperative);
  return imperative;
}

/**
 * Clear compilation cache (useful for testing)
 */
export function clearCompilationCache(): void {
  compilationCache.clear();
}

// ============================================
// IMPERATIVE ARCHITECTURE IMPLEMENTATION
// ============================================

class ImperativeArchitectureImpl implements ImperativeArchitecture {
  readonly source: ArchitectureConfig;
  
  // Pre-computed lookup tables
  private transitionTable: Map<string, boolean> = new Map();
  private shortestPaths: Map<string, string[] | null> = new Map();
  private allPaths: Map<string, string[][]> = new Map();
  private positionTable: Map<string, number> = new Map();
  private dependencyTable: Map<string, string[]> = new Map();
  private dependentsTable: Map<string, Set<string>> = new Map();
  private entryPoints: string[] = [];
  private leaves: string[] = [];
  private layerList: string[] = [];
  
  constructor(config: ArchitectureConfig) {
    this.source = config;
    this.precompute(config);
  }
  
  /**
   * Pre-compute all lookups for O(1) runtime performance
   */
  private precompute(config: ArchitectureConfig): void {
    const layers = config.layers;
    this.layerList = Object.keys(layers);
    
    // Pre-compute transition table
    for (const [fromLayer, fromConfig] of Object.entries(layers)) {
      // Position
      this.positionTable.set(fromLayer, fromConfig.position ?? 999);
      
      // Dependencies
      this.dependencyTable.set(fromLayer, [...fromConfig.canDependOn]);
      
      // Build dependents (reverse lookup)
      for (const toLayer of fromConfig.canDependOn) {
        if (!this.dependentsTable.has(toLayer)) {
          this.dependentsTable.set(toLayer, new Set());
        }
        this.dependentsTable.get(toLayer)!.add(fromLayer);
      }
      
      // Transition table
      for (const toLayer of this.layerList) {
        const canCall = fromConfig.canDependOn.includes(toLayer);
        this.transitionTable.set(`${fromLayer}:${toLayer}`, canCall);
      }
    }
    
    // Pre-compute shortest paths (Floyd-Warshall style)
    for (const from of this.layerList) {
      for (const to of this.layerList) {
        const path = this.computeShortestPath(layers, from, to);
        this.shortestPaths.set(`${from}:${to}`, path);
        
        const allPaths = this.computeAllPaths(layers, from, to);
        this.allPaths.set(`${from}:${to}`, allPaths);
      }
    }
    
    // Entry points (no incoming edges)
    this.entryPoints = this.layerList.filter(layer => {
      return !this.dependentsTable.has(layer) || 
             this.dependentsTable.get(layer)!.size === 0;
    });
    
    // Leaves (no outgoing edges)
    this.leaves = this.layerList.filter(layer => {
      const deps = this.dependencyTable.get(layer);
      return !deps || deps.length === 0;
    });
  }
  
  /**
   * Compute shortest path using BFS
   */
  private computeShortestPath(
    layers: Record<string, LayerConfig>,
    from: string,
    to: string
  ): string[] | null {
    if (from === to) return [from];
    
    const queue: Array<{ layer: string; path: string[] }> = [
      { layer: from, path: [from] }
    ];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const { layer, path } = queue.shift()!;
      
      if (visited.has(layer)) continue;
      visited.add(layer);
      
      const config = layers[layer];
      if (!config) continue;
      
      for (const dep of config.canDependOn) {
        if (dep === to) {
          return [...path, dep];
        }
        if (!visited.has(dep)) {
          queue.push({ layer: dep, path: [...path, dep] });
        }
      }
    }
    
    return null;
  }
  
  /**
   * Compute all paths (with depth limit)
   */
  private computeAllPaths(
    layers: Record<string, LayerConfig>,
    from: string,
    to: string,
    maxDepth: number = 5
  ): string[][] {
    const paths: string[][] = [];
    
    const dfs = (current: string, path: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (current === to) {
        paths.push([...path]);
        return;
      }
      
      const config = layers[current];
      if (!config) return;
      
      for (const dep of config.canDependOn) {
        if (!path.includes(dep)) { // Avoid cycles
          dfs(dep, [...path, dep], depth + 1);
        }
      }
    };
    
    dfs(from, [from], 0);
    return paths;
  }
  
  // ============================================
  // PUBLIC API (All O(1) lookups)
  // ============================================
  
  canCall(fromLayer: string, toLayer: string): boolean {
    return this.transitionTable.get(`${fromLayer}:${toLayer}`) ?? false;
  }
  
  validatePath(layers: string[]): PathValidationResult {
    const violations: PathViolation[] = [];
    
    // Check each transition
    for (let i = 1; i < layers.length; i++) {
      const from = layers[i - 1];
      const to = layers[i];
      
      // Unknown layer check
      if (!this.hasLayer(from)) {
        violations.push({
          type: 'unknown-layer',
          from,
          to,
          explanation: `Layer "${from}" is not defined in architecture`,
          fix: `Define "${from}" in AAAArchi configuration`,
          severity: 'error',
        });
        continue;
      }
      
      if (!this.hasLayer(to)) {
        violations.push({
          type: 'unknown-layer',
          from,
          to,
          explanation: `Layer "${to}" is not defined in architecture`,
          fix: `Define "${to}" in AAAArchi configuration`,
          severity: 'error',
        });
        continue;
      }
      
      // Direct transition check
      if (this.canCall(from, to)) {
        continue; // Valid
      }
      
      // Check if it's a skip
      const path = this.getPath(from, to);
      if (path && path.length > 2) {
        const missing = path.slice(1, -1);
        violations.push({
          type: 'layer-skip',
          from,
          to,
          explanation: `Missing intermediate layer(s): ${missing.join(' → ')}`,
          fix: `Use path: ${path.join(' → ')}`,
          severity: 'error',
        });
      } else {
        violations.push({
          type: 'invalid-dependency',
          from,
          to,
          explanation: `"${from}" cannot depend on "${to}"`,
          fix: `Review architectural constraints for ${from}`,
          severity: 'error',
        });
      }
    }
    
    // Cycle detection
    const cycle = this.detectCycle(layers);
    if (cycle) {
      violations.push({
        type: 'cycle',
        from: cycle[0],
        to: cycle[cycle.length - 1],
        explanation: `Circular dependency detected: ${cycle.join(' → ')}`,
        fix: 'Break the cycle by restructuring dependencies',
        severity: 'error',
      });
    }
    
    // Suggest proper path from first to last
    const suggestedPath = layers.length >= 2 
      ? this.getPath(layers[0], layers[layers.length - 1])
      : null;
    
    return {
      valid: violations.length === 0,
      violations,
      suggestedPath,
    };
  }
  
  getPath(fromLayer: string, toLayer: string): string[] | null {
    return this.shortestPaths.get(`${fromLayer}:${toLayer}`) ?? null;
  }
  
  getAllPaths(fromLayer: string, toLayer: string): string[][] {
    return this.allPaths.get(`${fromLayer}:${toLayer}`) ?? [];
  }
  
  detectCycle(chain: string[]): string[] | null {
    const seen = new Map<string, number>();
    
    for (let i = 0; i < chain.length; i++) {
      const layer = chain[i];
      if (seen.has(layer)) {
        // Found cycle
        const start = seen.get(layer)!;
        return chain.slice(start, i + 1);
      }
      seen.set(layer, i);
    }
    
    return null;
  }
  
  getPosition(layer: string): number {
    return this.positionTable.get(layer) ?? 999;
  }
  
  getDependencies(layer: string): string[] {
    return this.dependencyTable.get(layer) ?? [];
  }
  
  getDependents(layer: string): string[] {
    const set = this.dependentsTable.get(layer);
    return set ? Array.from(set) : [];
  }
  
  hasLayer(layer: string): boolean {
    return layer in this.source.layers;
  }
  
  getLayerConfig(layer: string): LayerConfig | undefined {
    return this.source.layers[layer];
  }
  
  getAllLayers(): string[] {
    return [...this.layerList];
  }
  
  getEntryPoints(): string[] {
    return [...this.entryPoints];
  }
  
  getLeaves(): string[] {
    return [...this.leaves];
  }
  
  toDAG(): ProjectDAG {
    const nodes = this.layerList.map(layer => ({
      id: layer,
      domain: 'default', // Could be enriched with domain info
      layer,
      dependencies: this.getDependencies(layer),
    }));
    
    const edges: Array<{ from: string; to: string }> = [];
    for (const from of this.layerList) {
      for (const to of this.getDependencies(from)) {
        edges.push({ from, to });
      }
    }
    
    // Find violations
    const violations: ProjectDAG['violations'] = [];
    for (const from of this.layerList) {
      for (const to of this.layerList) {
        if (from !== to && !this.canCall(from, to)) {
          // Check if there's any path
          const path = this.getPath(from, to);
          if (!path) {
            // No path exists - not necessarily a violation, just not allowed
          }
        }
      }
    }
    
    return { nodes, edges, violations };
  }
}

// ============================================
// HIGHER-LEVEL COMPILED FUNCTIONS
// ============================================

/**
 * Compile a context validator function.
 * Returns a function that validates if a context can perform an operation.
 */
export function compileContextValidator(
  config: ArchitectureConfig
): (context: ArchitecturalContext, targetLayer: string) => PathValidationResult {
  const imperative = compileToImperative(config);
  
  return (context, targetLayer) => {
    // Build path from context's layer to target
    const path = [context.layer, targetLayer];
    return imperative.validatePath(path);
  };
}

/**
 * Compile a multi-step validator.
 * Validates a chain of layer transitions.
 */
export function compileChainValidator(
  config: ArchitectureConfig
): (chain: string[]) => PathValidationResult {
  const imperative = compileToImperative(config);
  return (chain) => imperative.validatePath(chain);
}

/**
 * Compile a suggestions generator.
 * Returns rich suggestions for fixing violations.
 */
export function compileSuggestionsGenerator(
  config: ArchitectureConfig
): (fromLayer: string, toLayer: string) => Array<{
  type: 'add-layer' | 'change-path' | 'reconfigure';
  description: string;
  path?: string[];
  impact: 'low' | 'medium' | 'high';
}> {
  const imperative = compileToImperative(config);
  
  return (fromLayer, toLayer) => {
    const suggestions: Array<{
      type: 'add-layer' | 'change-path' | 'reconfigure';
      description: string;
      path?: string[];
      impact: 'low' | 'medium' | 'high';
    }> = [];
    
    // Direct path suggestion
    const path = imperative.getPath(fromLayer, toLayer);
    if (path && path.length > 2) {
      suggestions.push({
        type: 'add-layer',
        description: `Use intermediate layer(s): ${path.slice(1, -1).join(' → ')}`,
        path,
        impact: 'medium',
      });
    }
    
    // Alternative paths
    const allPaths = imperative.getAllPaths(fromLayer, toLayer);
    for (const altPath of allPaths.slice(1, 3)) { // Skip first (shortest), show alternatives
      suggestions.push({
        type: 'change-path',
        description: `Alternative path: ${altPath.join(' → ')}`,
        path: altPath,
        impact: 'low',
      });
    }
    
    // Reconfigure suggestion
    const config = imperative.getLayerConfig(fromLayer);
    if (config) {
      suggestions.push({
        type: 'reconfigure',
        description: `Allow ${fromLayer} to depend on ${toLayer} in architecture config`,
        impact: 'high',
      });
    }
    
    return suggestions;
  };
}
