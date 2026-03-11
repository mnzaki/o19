/**
 * Scrim-Loom Heddles with AAAArchi Validation 🦡
 *
 * The heddles raise/lower warp threads based on patterns.
 * Unlike spire-loom's pure enrichment, we validate architectural
 * constraints and use Ferror for rich violation messages.
 */

import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';

// ============================================
// TYPES
// ============================================

export interface ScrimManagement {
  name: string;
  layer: string;
  domain: string;
  link?: string;
  methods: ScrimMethod[];
  _violations?: ArchitecturalViolation[];
  _computed?: {
    canGenerate: boolean;
    validTargets: string[];
    dagContext: any;
  };
}

export interface ScrimMethod {
  name: string;
  operation?: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
}

export interface ArchitecturalViolation {
  type: 'layer-skip' | 'invalid-link' | 'circular-dep' | 'missing-layer';
  from: string;
  to: string;
  explanation: string;
  fix: string;
  severity: 'error' | 'warning';
}

// ============================================
// HEDDLES VALIDATOR
// ============================================

export class ScrimHeddles {
  private violations: ArchitecturalViolation[] = [];
  
  /**
   * Enrich a management with validation.
   *
   * This is like spire-loom's heddles, but with AAAArchi validation:
   * 1. Validate layer transitions
   * 2. Check for architectural violations
   * 3. Enrich with computed metadata
   * 4. Report violations via Ferror
   */
  enrich(mgmt: ScrimManagement): ScrimManagement {
    this.violations = [];
    
    // Get architectural context
    const scope = AAAArchi.forFile(import.meta.url);
    const ctx = scope.getContext();
    
    // Validate layer is valid
    this.validateLayer(mgmt.layer, mgmt.name);
    
    // If there's a link, validate the transition
    if (mgmt.link) {
      this.validateLink(mgmt, scope);
    }
    
    // Validate each method's placement
    mgmt.methods.forEach(method => {
      this.validateMethod(method, mgmt);
    });
    
    // Build DAG and check for issues
    const dag = AAAArchi.buildProjectDAG();
    this.validateAgainstDAG(mgmt, dag);
    
    // If there are violations, attach them (but don't throw yet)
    // The weaver will decide whether to throw based on severity
    if (this.violations.length > 0) {
      return {
        ...mgmt,
        _violations: this.violations
      };
    }
    
    // Enrich with computed metadata
    return {
      ...mgmt,
      // Add computed fields
      _computed: {
        canGenerate: true,
        validTargets: scope.getValidTargets(),
        dagContext: ctx
      }
    };
  }
  
  /**
   * Validate a layer name.
   */
  private validateLayer(layer: string, context: string): void {
    const validLayers = ['domain', 'infrastructure', 'repository', 'service', 'controller', 'application'];
    
    if (!validLayers.includes(layer)) {
      this.violations.push({
        type: 'missing-layer',
        from: 'unknown',
        to: layer,
        explanation: `"${layer}" is not a valid layer in the architecture`,
        fix: `Use one of: ${validLayers.join(', ')}`,
        severity: 'error'
      });
    }
  }
  
  /**
   * Validate a link target.
   */
  private validateLink(mgmt: ScrimManagement, scope: ReturnType<typeof AAAArchi.forFile>): void {
    const ctx = scope.getContext();
    
    // Parse link target to determine its layer
    // Format: foundframe.inner.core.thestream
    const targetLayer = this.inferLayerFromPath(mgmt.link!);
    
    if (targetLayer) {
      const canCall = scope.canCall(targetLayer);
      
      if (!canCall) {
        const violations = AAAArchi.validatePath([ctx.layer, targetLayer]);
        
        if (violations.length > 0) {
          this.violations.push({
            type: 'layer-skip',
            from: ctx.layer,
            to: targetLayer,
            explanation: `${mgmt.name} (${ctx.layer}) links to ${targetLayer}, but this violates the architecture: ${violations[0].explanation}`,
            fix: violations[0].fix,
            severity: 'error'
          });
        }
      }
    }
  }
  
  /**
   * Validate a method's placement in its management.
   */
  private validateMethod(method: ScrimMethod, mgmt: ScrimManagement): void {
    // Check if CRUD operations are in appropriate layers
    if (method.operation) {
      const allowedLayers: Record<string, string[]> = {
        create: ['service', 'repository'],
        read: ['service', 'repository', 'controller'],
        update: ['service', 'repository'],
        delete: ['service', 'repository'],
        list: ['service', 'repository', 'controller'],
        query: ['service', 'repository', 'controller']
      };
      
      const allowed = allowedLayers[method.operation];
      if (allowed && !allowed.includes(mgmt.layer)) {
        this.violations.push({
          type: 'invalid-link',
          from: mgmt.layer,
          to: method.operation,
          explanation: `CRUD operation "${method.operation}" is not typically placed in the ${mgmt.layer} layer`,
          fix: `Move ${method.name} to one of: ${allowed.join(', ')}, or reconsider the operation type`,
          severity: 'warning'
        });
      }
    }
  }
  
  /**
   * Validate against the full project DAG.
   */
  private validateAgainstDAG(
    mgmt: ScrimManagement,
    dag: ReturnType<typeof AAAArchi.buildProjectDAG>
  ): void {
    // Check for circular dependencies
    const nodeId = `${mgmt.domain}:${mgmt.layer}`;
    const deps = dag.edges.filter(e => e.from === nodeId);
    
    // Check if any dependency creates a cycle back to this node
    for (const dep of deps) {
      const cycle = this.findCycle(dag, dep.to, nodeId, new Set());
      if (cycle) {
        this.violations.push({
          type: 'circular-dep',
          from: nodeId,
          to: dep.to,
          explanation: `Circular dependency detected: ${cycle.join(' → ')}`,
          fix: 'Break the cycle by restructuring dependencies',
          severity: 'error'
        });
      }
    }
  }
  
  /**
   * Find a cycle in the DAG starting from a node.
   */
  private findCycle(
    dag: ReturnType<typeof AAAArchi.buildProjectDAG>,
    start: string,
    target: string,
    visited: Set<string>,
    path: string[] = []
  ): string[] | null {
    if (start === target) {
      return [...path, target];
    }
    
    if (visited.has(start)) {
      return null;
    }
    
    visited.add(start);
    path.push(start);
    
    const edges = dag.edges.filter(e => e.from === start);
    for (const edge of edges) {
      const cycle = this.findCycle(dag, edge.to, target, new Set(visited), [...path]);
      if (cycle) {
        return cycle;
      }
    }
    
    return null;
  }
  
  /**
   * Infer layer from a path like "foundframe.inner.core.thestream"
   */
  private inferLayerFromPath(path: string): string | undefined {
    if (path.includes('infrastructure')) return 'infrastructure';
    if (path.includes('repository')) return 'repository';
    if (path.includes('service')) return 'service';
    if (path.includes('controller')) return 'controller';
    if (path.includes('core')) return 'domain';
    return undefined;
  }
  
  /**
   * Throw a Ferror for the first error violation.
   */
  throwIfErrors(mgmt: ScrimManagement & { _violations?: ArchitecturalViolation[] }): void {
    const errors = mgmt._violations?.filter(v => v.severity === 'error');
    
    if (errors && errors.length > 0) {
      const firstError = errors[0];
      const ferror = ferroringModule()[mgmt.domain][mgmt.layer];
      
      throw ferror(
        new Error('Architectural violation'),
        {
          function: mgmt.name,
          stance: 'authoritative',
          summary: firstError.explanation,
          explanation: `Validation failed with ${errors.length} error(s) and ${mgmt._violations!.length - errors.length} warning(s).`,
          suggestions: [
            { action: 'fix-violation', message: firstError.fix },
            { action: 'view-dag', message: 'Run AAAArchi.buildProjectDAG() to visualize the architecture' }
          ],
          context: {
            management: mgmt.name,
            violations: mgmt._violations
          },
          tags: ['architectural-violation', firstError.type]
        }
      );
    }
  }
}

// Singleton instance
export const scrimHeddles = new ScrimHeddles();
