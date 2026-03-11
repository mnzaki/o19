/**
 * AAAArchi - Architecture Annotating Aardvark Archi
 * 
 * The foundation layer: maps structure, builds DAG, provides architectural metadata.
 * Ferror and Orka build upon this foundation.
 */

// ============================================
// CORE ANNOTATION (Domain/Layer agnostic)
// ============================================

/**
 * The base annotation - no domain or layer yet.
 * These are the raw materials AAAArchi works with.
 */
export interface BaseAnnotation {
  function: string;
  context?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Architectural metadata for a specific location in code.
 * Domain and layer are resolved by AAAArchi based on file path/conventions.
 */
export interface ArchitecturalContext {
  /** The domain (horizontal concern) - e.g., 'user', 'auth', 'payment' */
  domain: string;
  
  /** The layer (vertical concern) - e.g., 'controller', 'service', 'repository' */
  layer: string;
  
  /** The function/method name within the layer */
  function: string;
  
  /** Full file path */
  file: string;
  
  /** What layers this can legally call */
  canDependOn: string[];
  
  /** Layer invariant - the rule this layer enforces */
  invariant?: string;
}

// ============================================
// LAYER CONFIGURATION
// ============================================

/**
 * Configuration for a layer in the architectural onion.
 */
export interface LayerConfig {
  /** Layers this one can depend on */
  canDependOn: string[];
  
  /** The invariant/rule this layer maintains */
  invariant?: string;
  
  /** Position in the onion (0 = center/domain, higher = outer) */
  position?: number;
}

/**
 * Configuration for a domain in the DAG.
 */
export interface DomainConfig {
  /** Parent domains in the DAG (inheritance) */
  extends?: string[];
  
  /** Domains this one depends on */
  dependsOn?: string[];
  
  /** Layer configurations specific to this domain */
  layers?: Record<string, Partial<LayerConfig>>;
}

/**
 * The full architectural configuration.
 */
export interface ArchitectureConfig {
  /** Layer definitions (the onion structure) */
  layers: Record<string, LayerConfig>;
  
  /** Domain definitions (the DAG structure) */
  domains?: Record<string, DomainConfig>;
  
  /** Violation rules for specific transitions */
  violations?: Record<string, ViolationRule>;
}

export interface ViolationRule {
  expected?: string;
  violation: string;
  explanation: string;
  fix: string;
}

// ============================================
// FILE SCOPE ACCUMULATOR
// ============================================

/**
 * File-level accumulator - collects annotations within a file.
 * This is AAAArchi's primary interface for capturing structure.
 */
export interface FileScope {
  /** The file path this scope represents */
  readonly file: string;
  
  /** Resolved domain for this file */
  readonly domain: string;
  
  /** Resolved layer for this file */
  readonly layer: string;
  
  /**
   * Annotate a function with metadata.
   * This registers the function in AAAArchi's accumulator.
   */
  annotate(fn: Function, annotation: BaseAnnotation): void;
  
  /**
   * Get the architectural context for this file.
   * Used by Ferror to resolve domain:layer for throws.
   */
  getContext(): ArchitecturalContext;
  
  /**
   * Check if this layer can legally call another layer.
   * Used for violation detection.
   */
  canCall(targetLayer: string): boolean;
  
  /**
   * Get all valid target layers for this file.
   */
  getValidTargets(): string[];
}

// ============================================
// PROJECT DAG
// ============================================

/**
 * A node in the architectural DAG.
 */
export interface DAGNode {
  id: string;           // "domain:layer"
  domain: string;
  layer: string;
  dependencies: string[]; // Other node IDs
}

/**
 * The full project DAG.
 */
export interface ProjectDAG {
  nodes: DAGNode[];
  edges: Array<{ from: string; to: string }>;
  violations: Array<{
    type: string;
    from: string;
    to: string;
    explanation: string;
  }>;
}

// ============================================
// GLOBAL API
// ============================================

/**
 * The global AAAArchi interface.
 * 
 * Usage:
 *   const scope = AAAArchi.forFile(import.meta.url);
 *   scope.annotate(myFunction, { function: 'getUser' });
 */
export interface AAAArchiAPI {
  /**
   * Get or create a file scope for the given file path.
   * This is the entry point for all AAAArchi operations.
   */
  forFile(filePath: string): FileScope;
  
  /**
   * Get the current architectural context (for use in decorators).
   * Returns undefined if not in an annotated context.
   */
  getCurrentContext(): ArchitecturalContext | undefined;
  
  /**
   * Build the full project DAG from all accumulated file scopes.
   */
  buildProjectDAG(): ProjectDAG;
  
  /**
   * Validate a layer transition path.
   * Returns violations if any.
   */
  validatePath(layers: string[]): Array<{
    violation: string;
    explanation: string;
    fix: string;
  }>;
  
  /**
   * Get attempt history for an operation (for retry/circuit tracking).
   * Orka uses this for retry decisions.
   */
  getAttemptHistory(operationId: string): Array<{
    layer: string;
    timestamp: number;
    success: boolean;
    error?: Error;
  }>;
  
  /**
   * Record an attempt for tracking.
   */
  recordAttempt(operationId: string, result: {
    layer: string;
    success: boolean;
    error?: Error;
  }): void;
}
