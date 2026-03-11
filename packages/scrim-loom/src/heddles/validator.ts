/**
 * Heddles with AAAArchi Validation 🦡
 *
 * The heddles raise/lower warp threads based on patterns,
 * validating architectural constraints with rich error messages.
 */

import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';

// ============================================
// TYPES
// ============================================

export interface Management {
  name: string;
  layer: string;
  domain: string;
  link?: string;
  methods: Method[];
  _violations?: Violation[];
  _computed?: {
    canGenerate: boolean;
    validTargets: string[];
    dagContext: any;
  };
}

export interface Method {
  name: string;
  operation?: string;
  returnType: string;
  parameters: Array<{ name: string; type: string }>;
}

export interface Violation {
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

export class Heddles {
  private violations: Violation[] = [];
  
  /**
   * Enrich a management with validation.
   *
   * Validates architectural constraints and enriches with computed metadata.
   */
  enrich(mgmt: Management): Management {
    this.violations = [];
    
    const scope = AAAArchi.forFile(import.meta.url);
    
    this.validateLayer(mgmt.layer, mgmt.name);
    
    if (mgmt.link) {
      this.validateLink(mgmt, scope);
    }
    
    mgmt.methods.forEach(method => {
      this.validateMethod(method, mgmt);
    });
    
    const dag = AAAArchi.buildProjectDAG();
    this.validateAgainstDAG(mgmt, dag);
    
    if (this.violations.length > 0) {
      return { ...mgmt, _violations: this.violations };
    }
    
    return {
      ...mgmt,
      _computed: {
        canGenerate: true,
        validTargets: scope.getValidTargets(),
        dagContext: scope.getContext()
      }
    };
  }
  
  private validateLayer(layer: string, context: string): void {
    const validLayers = ['domain', 'infrastructure', 'repository', 'service', 'controller', 'application'];
    
    if (!validLayers.includes(layer)) {
      this.violations.push({
        type: 'missing-layer',
        from: 'unknown',
        to: layer,
        explanation: `"${layer}" is not a valid layer`,
        fix: `Use one of: ${validLayers.join(', ')}`,
        severity: 'error'
      });
    }
  }
  
  private validateLink(mgmt: Management, scope: ReturnType<typeof AAAArchi.forFile>): void {
    const targetLayer = this.inferLayerFromPath(mgmt.link!);
    
    if (targetLayer && !scope.canCall(targetLayer)) {
      const violations = AAAArchi.validatePath([scope.layer || 'unknown', targetLayer]);
      
      if (violations.length > 0) {
        this.violations.push({
          type: 'layer-skip',
          from: scope.layer || 'unknown',
          to: targetLayer,
          explanation: `${mgmt.name} (${scope.layer}) links to ${targetLayer}, violating architecture`,
          fix: violations[0].fix,
          severity: 'error'
        });
      }
    }
  }
  
  private validateMethod(method: Method, mgmt: Management): void {
    if (method.operation) {
      const allowed: Record<string, string[]> = {
        create: ['service', 'repository'],
        read: ['service', 'repository', 'controller'],
        update: ['service', 'repository'],
        delete: ['service', 'repository'],
        list: ['service', 'repository', 'controller']
      };
      
      const allowedLayers = allowed[method.operation];
      if (allowedLayers && !allowedLayers.includes(mgmt.layer)) {
        this.violations.push({
          type: 'invalid-link',
          from: mgmt.layer,
          to: method.operation,
          explanation: `CRUD "${method.operation}" not typically in ${mgmt.layer} layer`,
          fix: `Move to: ${allowedLayers.join(', ')}`,
          severity: 'warning'
        });
      }
    }
  }
  
  private validateAgainstDAG(mgmt: Management, dag: any): void {
    const nodeId = `${mgmt.domain}:${mgmt.layer}`;
    
    for (const dep of dag.edges.filter((e: any) => e.from === nodeId)) {
      const cycle = this.findCycle(dag, dep.to, nodeId, new Set());
      if (cycle) {
        this.violations.push({
          type: 'circular-dep',
          from: nodeId,
          to: dep.to,
          explanation: `Circular: ${cycle.join(' → ')}`,
          fix: 'Restructure to break cycle',
          severity: 'error'
        });
      }
    }
  }
  
  private findCycle(dag: any, start: string, target: string, visited: Set<string>, path: string[] = []): string[] | null {
    if (start === target && path.length > 0) return [...path, target];
    if (visited.has(start)) return null;
    
    visited.add(start);
    path.push(start);
    
    for (const edge of dag.edges.filter((e: any) => e.from === start)) {
      const cycle = this.findCycle(dag, edge.to, target, new Set(visited), [...path]);
      if (cycle) return cycle;
    }
    
    return null;
  }
  
  private inferLayerFromPath(path: string): string | undefined {
    if (path.includes('infrastructure')) return 'infrastructure';
    if (path.includes('repository')) return 'repository';
    if (path.includes('service')) return 'service';
    if (path.includes('controller')) return 'controller';
    if (path.includes('core')) return 'domain';
    return undefined;
  }
  
  /**
   * Throw on first error violation.
   */
  throwIfErrors(mgmt: Management & { _violations?: Violation[] }): void {
    const errors = mgmt._violations?.filter(v => v.severity === 'error');
    
    if (errors?.length) {
      const first = errors[0];
      const ferror = ferroringModule()[mgmt.domain][mgmt.layer];
      
      throw ferror(new Error('Architecture violation'), {
        function: mgmt.name,
        stance: 'authoritative',
        summary: first.explanation,
        explanation: `${errors.length} error(s), ${mgmt._violations!.length - errors.length} warning(s)`,
        suggestions: [
          { action: 'fix', message: first.fix },
          { action: 'view-dag', message: 'Run AAAArchi.buildProjectDAG()' }
        ],
        context: { management: mgmt.name, violations: mgmt._violations },
        tags: ['architectural-violation', first.type]
      });
    }
  }
}

export const heddles = new Heddles();
