/**
 * Ferror implementation - the error chain node
 * 
 * Built on AAAArchi. Domain and layer come from architectural context.
 */

import type { 
  Ferror as IFerror, 
  ErrorAnnotation,
  FerrorChain 
} from './types.js';
import { AAAArchi } from '@o19/aaaarchi';

export class Ferror extends Error implements IFerror {
  readonly domain: string;
  readonly layer: string;
  readonly annotation: ErrorAnnotation;
  readonly cause: unknown;
  readonly root: Error;
  readonly createdAt: number;
  readonly __ferror = true;
  
  private siblings: Array<Omit<ErrorAnnotation, 'domain' | 'layer'>> = [];

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
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, Ferror);
    }
  }

  isFerror(): this is Ferror {
    return true;
  }

  annotate(annotation: Omit<ErrorAnnotation, 'domain' | 'layer'>): this {
    this.siblings.push(annotation);
    return this;
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

  detectViolations(): Array<{
    type: string;
    from: string;
    to: string;
    explanation: string;
    fix: string;
  }> {
    const chain = this.getChain();
    const layers = chain.map(c => c.layer);
    
    // Use AAAArchi to validate the path
    const violations = AAAArchi.validatePath(layers);
    
    return violations.map(v => ({
      type: v.violation,
      from: layers[layers.length - 2] || 'unknown',
      to: layers[layers.length - 1] || 'unknown',
      explanation: v.explanation,
      fix: v.fix,
    }));
  }

  getSiblings(): Array<Omit<ErrorAnnotation, 'domain' | 'layer'>> {
    return this.siblings;
  }
}

// Type guard
export function isFerror(error: unknown): error is Ferror {
  return error instanceof Ferror;
}
