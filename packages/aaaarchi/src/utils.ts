/**
 * AAAArchi Utilities - Helper functions for common operations
 * 
 * These utilities help Ferror and other consumers use AAAArchi's
 * domain:layer abstractions effectively.
 */

import { 
  type ArchitecturalContext, 
  type ProjectDAG, 
  type ArchitectureConfig,
  type LayerConfig 
} from './types.js';

// ============================================
// PATH FINDING THROUGH DAG
// ============================================

/**
 * Find the shortest path between two layers in the architecture.
 * Used by Ferror to suggest "proper" call paths.
 * 
 * Example:
 *   findLayerPath(layers, 'controller', 'repository')
 *   // Returns: ['controller', 'service', 'repository']
 */
export function findLayerPath(
  layers: Record<string, LayerConfig>,
  from: string,
  to: string
): string[] | null {
  if (from === to) return [from];
  
  const fromConfig = layers[from];
  if (!fromConfig) return null;
  
  // Direct dependency
  if (fromConfig.canDependOn.includes(to)) {
    return [from, to];
  }
  
  // BFS to find shortest path
  const visited = new Set<string>();
  const queue: Array<{ layer: string; path: string[] }> = [
    { layer: from, path: [from] }
  ];
  
  while (queue.length > 0) {
    const { layer, path } = queue.shift()!;
    const config = layers[layer];
    
    if (!config) continue;
    
    for (const dep of config.canDependOn) {
      if (dep === to) {
        return [...path, dep];
      }
      
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push({ layer: dep, path: [...path, dep] });
      }
    }
  }
  
  return null;
}

/**
 * Find all possible paths from one layer to another.
 * Used for rich error context.
 */
export function findAllLayerPaths(
  layers: Record<string, LayerConfig>,
  from: string,
  to: string,
  maxDepth: number = 5
): string[][] {
  const paths: string[][] = [];
  
  function dfs(current: string, path: string[], depth: number) {
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
  }
  
  dfs(from, [from], 0);
  return paths;
}

// ============================================
// SUGGESTION GENERATION
// ============================================

export interface ViolationSuggestion {
  type: 'add-layer' | 'change-path' | 'reconfigure';
  description: string;
  codeExample?: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Generate suggestions for fixing a layer violation.
 * Used by Ferror to provide actionable error messages.
 */
export function generateSuggestions(
  layers: Record<string, LayerConfig>,
  from: string,
  to: string
): ViolationSuggestion[] {
  const suggestions: ViolationSuggestion[] = [];
  
  // Find the proper path
  const properPath = findLayerPath(layers, from, to);
  
  if (properPath && properPath.length > 2) {
    const missingLayers = properPath.slice(1, -1);
    suggestions.push({
      type: 'add-layer',
      description: `Add ${missingLayers.join(' → ')} between ${from} and ${to}`,
      codeExample: `${from} → ${missingLayers.join(' → ')} → ${to}`,
      impact: 'medium',
    });
  }
  
  // Check if we can reconfigure the architecture
  const fromConfig = layers[from];
  if (fromConfig) {
    const allLayers = Object.keys(layers);
    const couldDependOn = allLayers.filter(l => 
      l !== from && !fromConfig.canDependOn.includes(l)
    );
    
    if (couldDependOn.includes(to)) {
      suggestions.push({
        type: 'reconfigure',
        description: `Consider allowing ${from} to depend on ${to} in architecture config`,
        impact: 'high',
      });
    }
  }
  
  // Suggest valid targets from current layer
  if (fromConfig && fromConfig.canDependOn.length > 0) {
    suggestions.push({
      type: 'change-path',
      description: `From ${from}, you can legally call: ${fromConfig.canDependOn.join(', ')}`,
      impact: 'low',
    });
  }
  
  return suggestions;
}

// ============================================
// CONTEXT ENRICHMENT
// ============================================

export interface EnrichedContext extends ArchitecturalContext {
  /** Position in the onion (0 = center, higher = outer) */
  position: number;
  
  /** Distance from domain layer */
  depth: number;
  
  /** All layers that can reach this layer */
  calledBy: string[];
  
  /** Human-readable description of this context */
  description: string;
}

/**
 * Enrich architectural context with computed properties.
 * Used by Ferror for rich error messages.
 */
export function enrichContext(
  context: ArchitecturalContext,
  layers: Record<string, LayerConfig>,
  dag: ProjectDAG
): EnrichedContext {
  const layerConfig = layers[context.layer];
  const position = layerConfig?.position ?? 999;
  
  // Find all layers that can call this layer
  const calledBy = dag.edges
    .filter(e => e.to === `${context.domain}:${context.layer}`)
    .map(e => e.from.split(':')[1]);
  
  // Calculate depth from domain
  let depth = 0;
  let current = context.layer;
  while (current !== 'domain') {
    const config = layers[current];
    if (!config || config.canDependOn.length === 0) break;
    // Approximate: use first dependency
    current = config.canDependOn[0];
    depth++;
    if (depth > 10) break; // Safety
  }
  
  return {
    ...context,
    position,
    depth,
    calledBy,
    description: `${context.domain}:${context.layer} (position ${position}, depth ${depth})`,
  };
}

// ============================================
// DAG ANALYSIS
// ============================================

export interface DAGAnalysis {
  /** Total number of domain:layer combinations */
  totalNodes: number;
  
  /** Total number of valid transitions */
  totalEdges: number;
  
  /** Layers with no incoming edges (entry points) */
  entryPoints: string[];
  
  /** Layers with no outgoing edges (leaf nodes) */
  leafNodes: string[];
  
  /** Potential circular dependencies */
  cycles: string[][];
  
  /** Violations found */
  violations: Array<{
    from: string;
    to: string;
    type: 'layer-skip' | 'invalid-dependency' | 'circular';
    explanation: string;
  }>;
}

/**
 * Analyze a project DAG for structural insights.
 * Used by Ferror and visualization tools.
 */
export function analyzeDAG(
  dag: ProjectDAG,
  layers: Record<string, LayerConfig>
): DAGAnalysis {
  const entryPoints: string[] = [];
  const leafNodes: string[] = [];
  const cycles: string[][] = [];
  
  // Find entry points (no incoming edges)
  const incomingCounts = new Map<string, number>();
  for (const edge of dag.edges) {
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) || 0) + 1);
  }
  
  for (const node of dag.nodes) {
    if (!incomingCounts.has(node.id)) {
      entryPoints.push(node.id);
    }
    if (node.dependencies.length === 0) {
      leafNodes.push(node.id);
    }
  }
  
  // Simple cycle detection (would need full DFS for complete detection)
  // This is a stub - real implementation would be more sophisticated
  
  return {
    totalNodes: dag.nodes.length,
    totalEdges: dag.edges.length,
    entryPoints,
    leafNodes,
    cycles,
    violations: dag.violations.map(v => ({
      from: v.from,
      to: v.to,
      type: 'layer-skip', // Simplified
      explanation: v.explanation,
    })),
  };
}

// ============================================
// VISUALIZATION HELPERS
// ============================================

/**
 * Generate Mermaid diagram syntax for the DAG.
 * Used for documentation and error messages.
 */
export function toMermaid(
  dag: ProjectDAG,
  highlightPath?: string[]
): string {
  const lines: string[] = ['graph TD'];
  
  // Add nodes
  for (const node of dag.nodes) {
    const isHighlighted = highlightPath?.includes(node.id);
    const style = isHighlighted ? ':::highlight' : '';
    lines.push(`  ${node.id.replace(':', '_')}[${node.id}]${style}`);
  }
  
  // Add edges
  for (const edge of dag.edges) {
    const fromId = edge.from.replace(':', '_');
    const toId = edge.to.replace(':', '_');
    const isHighlighted = highlightPath?.includes(edge.from) && 
                          highlightPath?.includes(edge.to);
    const style = isHighlighted ? ':::highlight' : '';
    lines.push(`  ${fromId} --> ${toId}${style}`);
  }
  
  // Add styles
  lines.push('  classDef highlight fill:#f9f,stroke:#333,stroke-width:4px');
  
  return lines.join('\n');
}

/**
 * Generate plain text tree view of the architecture.
 */
export function toTreeView(
  layers: Record<string, LayerConfig>,
  root: string = 'domain'
): string {
  const lines: string[] = [];
  const visited = new Set<string>();
  
  function printLayer(name: string, indent: number) {
    if (visited.has(name)) {
      lines.push(`${'  '.repeat(indent)}${name} (circular reference)`);
      return;
    }
    
    visited.add(name);
    const config = layers[name];
    
    lines.push(`${'  '.repeat(indent)}${name}`);
    
    if (config) {
      for (const dep of config.canDependOn) {
        printLayer(dep, indent + 1);
      }
    }
    
    visited.delete(name);
  }
  
  printLayer(root, 0);
  return lines.join('\n');
}
