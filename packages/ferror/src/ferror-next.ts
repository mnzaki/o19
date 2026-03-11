/**
 * Ferror Next - Building on AAAArchi's domain:layer abstractions
 * 
 * Key insight: AAAArchi already has domain:layer. Ferror should USE it,
 * not duplicate it with ferrorMod.x.y magic getters.
 * 
 * New API:
 *   // Auto-resolve from file context (RECOMMENDED)
 *   const ferror = Ferror.forFile(import.meta.url);
 *   throw ferror(error, { stance: 'authoritative', summary: '...' });
 *   
 *   // Explicit when needed (rare)
 *   const ferror = Ferror.forDomainLayer('user', 'service');
 */

import type { 
  ErrorAnnotation,
  Suggestion,
} from './types.js';
import { AAAArchi, type ArchitecturalContext, type FileScope } from '@o19/aaaarchi';

// ============================================
// FERROR CONTEXT - Rich error context from AAAArchi
// ============================================

export interface FerrorContext {
  /** The error being wrapped */
  error: Error;
  
  /** AAAArchi file scope (contains domain, layer, canDependOn) */
  scope: FileScope;
  
  /** Full architectural context */
  archContext: ArchitecturalContext;
  
  /** Project DAG for violation analysis */
  dag: ReturnType<typeof AAAArchi.buildProjectDAG>;
}

// ============================================
// BUILDER PATTERN - Fluent API for error construction
// ============================================

export class FerrorBuilder {
  private context: FerrorContext;
  private annotation: Partial<ErrorAnnotation> = {};
  
  constructor(context: FerrorContext) {
    this.context = context;
  }
  
  /** Set the function name */
  function(name: string): this {
    this.annotation.function = name;
    return this;
  }
  
  /** Set the stance */
  stance(stance: 'authoritative' | 'transparent'): this {
    this.annotation.stance = stance;
    return this;
  }
  
  /** Set the summary */
  summary(text: string): this {
    this.annotation.summary = text;
    return this;
  }
  
  /** Set detailed explanation */
  explanation(text: string): this {
    this.annotation.explanation = text;
    return this;
  }
  
  /** Add a suggestion */
  suggest(action: string, message: string): this {
    if (!this.annotation.suggestions) {
      this.annotation.suggestions = [];
    }
    this.annotation.suggestions.push({ action, message });
    return this;
  }
  
  /** Add multiple suggestions from DAG analysis */
  suggestFromAnalysis(): this {
    const { archContext, dag } = this.context;
    
    // Analyze what layers CAN be called from current layer
    const validTargets = archContext.canDependOn;
    
    if (validTargets.length > 0) {
      this.suggest(
        'valid-targets',
        `From ${archContext.layer}, you can call: ${validTargets.join(', ')}`
      );
    }
    
    // If in violation, suggest path through DAG
    const violations = dag.violations.filter(v => 
      v.from === `${archContext.domain}:${archContext.layer}`
    );
    
    for (const v of violations) {
      this.suggest('fix-violation', v.explanation);
    }
    
    return this;
  }
  
  /** Add context data */
  withContext(key: string, value: unknown): this {
    if (!this.annotation.context) {
      this.annotation.context = {};
    }
    (this.annotation.context as Record<string, unknown>)[key] = value;
    return this;
  }
  
  /** Add tags */
  tag(...tags: string[]): this {
    this.annotation.tags = [...(this.annotation.tags || []), ...tags];
    return this;
  }
  
  /** Build the final Ferror */
  build(): Ferror {
    const { scope, error } = this.context;
    const ctx = scope.getContext();
    
    const fullAnnotation: ErrorAnnotation = {
      function: this.annotation.function || ctx.function || 'unknown',
      stance: this.annotation.stance || 'authoritative',
      summary: this.annotation.summary || error.message || 'Unknown error',
      explanation: this.annotation.explanation,
      suggestions: this.annotation.suggestions,
      context: this.annotation.context,
      tags: this.annotation.tags,
      domain: ctx.domain,
      layer: ctx.layer,
    };
    
    return new Ferror({
      domain: ctx.domain,
      layer: ctx.layer,
      annotation: fullAnnotation,
      cause: error,
      root: isFerror(error) ? error.root : error,
    });
  }
  
  /** Build and throw */
  throw(): never {
    throw this.build();
  }
}

// ============================================
// SIMPLIFIED FERROR CLASS
// ============================================

class Ferror extends Error {
  readonly domain: string;
  readonly layer: string;
  readonly annotation: ErrorAnnotation;
  readonly cause: unknown;
  readonly root: Error;
  readonly createdAt: number;
  readonly __ferror = true;
  
  constructor(props: {
    domain: string;
    layer: string;
    annotation: ErrorAnnotation;
    cause: unknown;
    root: Error;
  }) {
    super(props.annotation.summary);
    this.domain = props.domain;
    this.layer = props.layer;
    this.annotation = props.annotation;
    this.cause = props.cause;
    this.root = props.root;
    this.createdAt = Date.now();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Ferror);
    }
  }
  
  isFerror(): boolean {
    return true;
  }
  
  getChain(): Ferror[] {
    const chain: Ferror[] = [this];
    let current: unknown = this.cause;
    
    while (current instanceof Ferror) {
      chain.unshift(current);
      current = current.cause;
    }
    
    return chain;
  }
  
  /** Get violations using AAAArchi */
  getViolations(): Array<{
    type: string;
    from: string;
    to: string;
    explanation: string;
    fix: string;
  }> {
    const chain = this.getChain();
    const layers = chain.map(c => c.layer);
    
    return AAAArchi.validatePath(layers).map(v => ({
      type: v.violation,
      from: layers[layers.length - 2] || 'unknown',
      to: layers[layers.length - 1] || 'unknown',
      explanation: v.explanation,
      fix: v.fix,
    }));
  }
  
  /** Format for display with rich context */
  format(): string {
    const lines: string[] = [];
    
    lines.push(`❌ ${this.annotation.summary}`);
    lines.push(`   Domain: ${this.domain}, Layer: ${this.layer}`);
    
    if (this.annotation.explanation) {
      lines.push(`   ${this.annotation.explanation}`);
    }
    
    if (this.annotation.suggestions && this.annotation.suggestions.length > 0) {
      lines.push('');
      lines.push('   Suggestions:');
      for (const s of this.annotation.suggestions) {
        lines.push(`   • [${s.action}] ${s.message}`);
      }
    }
    
    const violations = this.getViolations();
    if (violations.length > 0) {
      lines.push('');
      lines.push('   Architectural Violations:');
      for (const v of violations) {
        lines.push(`   • ${v.type}: ${v.explanation}`);
        lines.push(`     Fix: ${v.fix}`);
      }
    }
    
    return lines.join('\n');
  }
}

function isFerror(error: unknown): error is Ferror {
  return error instanceof Ferror;
}

// ============================================
// NEW MAIN API - Uses AAAArchi's abstractions
// ============================================

export const FerrorNext = {
  /**
   * Create Ferror from file scope (RECOMMENDED)
   * Uses AAAArchi.forFile() to auto-resolve domain:layer
   */
  forFile(filePath: string | URL, error?: Error): FerrorBuilder {
    const path = typeof filePath === 'string' ? filePath : filePath.pathname;
    const scope = AAAArchi.forFile(path);
    
    return new FerrorBuilder({
      error: error || new Error('Unknown error'),
      scope,
      archContext: scope.getContext(),
      dag: AAAArchi.buildProjectDAG(),
    });
  },
  
  /**
   * Create Ferror from explicit domain:layer (rarely needed)
   * Use when you need to override AAAArchi's auto-detection
   */
  forDomainLayer(domain: string, layer: string, error?: Error): FerrorBuilder {
    // Create a synthetic scope
    const scope: FileScope = {
      file: 'synthetic',
      domain,
      layer,
      annotate: () => {},
      getContext: () => ({
        domain,
        layer,
        function: 'unknown',
        file: 'synthetic',
        canDependOn: [],
      }),
      canCall: () => true,
      getValidTargets: () => [],
    };
    
    return new FerrorBuilder({
      error: error || new Error('Unknown error'),
      scope,
      archContext: scope.getContext(),
      dag: AAAArchi.buildProjectDAG(),
    });
  },
  
  /**
   * Quick throw helper
   */
  throw(filePath: string | URL, summary: string): never {
    throw FerrorNext.forFile(filePath, new Error(summary))
      .stance('authoritative')
      .summary(summary)
      .build();
  },
  
  /**
   * Type guard
   */
  isFerror,
  
  /**
   * Get Ferror class for instanceof checks
   */
  FerrorClass: Ferror,
};

// ============================================
// DECORATORS - Using AAAArchi context
// ============================================

export function ferrorHandler(
  build: (ctx: FerrorContext) => Partial<ErrorAnnotation>
): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    
    descriptor.value = async function(...args: unknown[]) {
      try {
        return await original.apply(this, args);
      } catch (e) {
        // Get fresh context at error time (not decoration time)
        const filePath = target.constructor.toString(); // Approximation
        const scope = AAAArchi.forFile(filePath);
        
        const context: FerrorContext = {
          error: e as Error,
          scope,
          archContext: scope.getContext(),
          dag: AAAArchi.buildProjectDAG(),
        };
        
        const partial = build(context);
        
        throw FerrorNext.forFile(filePath, e as Error)
          .function(propertyKey as string)
          .stance(partial.stance || 'authoritative')
          .summary(partial.summary || (e as Error).message)
          .explanation(partial.explanation || '')
          .build();
      }
    };
    
    return descriptor;
  };
}

// Export both old and new for migration
export { FerrorNext as Ferror };
