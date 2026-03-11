/**
 * Ferror - The Ferris Error System
 * 
 * Built on AAAArchi. Domain and layer come from architectural context,
 * not hardcoded. This ensures errors always reflect the actual architecture.
 */

import type { BaseAnnotation, ArchitecturalContext } from '@o19/aaaarchi';

// ============================================
// FERROR ANNOTATION (extends BaseAnnotation)
// ============================================

/**
 * Error annotation adds domain, layer, and stance to the base annotation.
 * These are resolved from AAAArchi's architectural context.
 */
export interface ErrorAnnotation extends BaseAnnotation {
  /** Domain from AAAArchi context */
  domain: string;
  
  /** Layer from AAAArchi context */
  layer: string;
  
  /** 
   * Stance: How does this layer relate to the error?
   * - 'authoritative': This layer understands and claims the error
   * - 'transparent': This layer is just passing through context
   */
  stance: 'authoritative' | 'transparent';
  
  /** Human-readable summary of the error */
  summary: string;
  
  /** Detailed explanation */
  explanation?: string;
  
  /** Actionable suggestions for the caller */
  suggestions?: Suggestion[];
}

export interface Suggestion {
  action: string;
  message: string;
}

// ============================================
// FERROR CHAIN
// ============================================

/**
 * Ferror extends Error with chain capabilities.
 * Built on top of AAAArchi's architectural understanding.
 */
export interface FerrorChain {
  /** Domain from AAAArchi */
  readonly domain: string;
  
  /** Layer from AAAArchi */
  readonly layer: string;
  
  /** The full annotation */
  readonly annotation: ErrorAnnotation;
  
  /** What caused this error (could be raw Error or another Ferror) */
  readonly cause: unknown;
  
  /** The root cause (deepest error in chain) */
  readonly root: Error;
  
  /** When this error was created */
  readonly createdAt: number;
  
  /** Check if this is a Ferror */
  isFerror(): boolean;
  
  /** Add a sibling annotation */
  annotate(annotation: Omit<ErrorAnnotation, 'domain' | 'layer'>): this;
  
  /** Get the full chain from root to this */
  getChain(): Ferror[];
  
  /** 
   * Detect architectural violations using AAAArchi.
   * Returns violations if the chain shows illegal transitions.
   */
  detectViolations(): Array<{
    type: string;
    from: string;
    to: string;
    explanation: string;
    fix: string;
  }>;
}

/**
 * Ferror class type - Error combined with FerrorChain
 * We use a type alias instead of interface to avoid 'cause' conflict
 */
export type Ferror = Error & FerrorChain & {
  readonly __ferror: true;
};

// ============================================
// DECORATOR RECIPES
// ============================================

/**
 * Recipe for building annotations in decorators.
 * Domain and layer are automatically added by Ferror from AAAArchi context.
 */
export interface RecipeContext {
  error: Error;
  args: unknown[];
  /** The architectural context from AAAArchi */
  archContext: ArchitecturalContext;
}

export interface AnnotateRecipe {
  build: (ctx: RecipeContext) => Omit<ErrorAnnotation, 'domain' | 'layer'>;
}

export interface WrapRecipe {
  build: (ctx: RecipeContext) => Omit<ErrorAnnotation, 'domain' | 'layer'>;
}

export interface InterceptRecipe {
  when: (error: Error) => boolean;
  build: (ctx: RecipeContext) => Omit<ErrorAnnotation, 'domain' | 'layer'>;
}

export interface GuardRecipe {
  validate: (...args: unknown[]) => boolean;
  onFail: (...args: unknown[]) => Omit<ErrorAnnotation, 'domain' | 'layer'>;
}

// ============================================
// BOUND FERROR
// ============================================

/**
 * A Ferror bound to a specific domain:layer from AAAArchi context.
 * 
 * Usage:
 *   const ferror = Ferror.bind(AAArchi.forFile(import.meta.url));
 *   throw ferror(error, { stance: 'authoritative', summary: '...' });
 */
export interface BoundFerror {
  /**
   * Create a Ferror with the bound domain:layer.
   * Only need to provide function, stance, summary, etc.
   */
  (error: Error, annotation: Omit<ErrorAnnotation, 'domain' | 'layer'>): Ferror;
  
  /** Add context to existing errors */
  annotate(recipe: AnnotateRecipe): MethodDecorator;
  
  /** Always wrap with new layer */
  wrap(recipe: WrapRecipe): MethodDecorator;
  
  /** Conditionally intercept specific errors */
  intercept(recipe: InterceptRecipe): MethodDecorator;
  
  /** Pre-execution validation */
  guard(recipe: GuardRecipe): MethodDecorator;
  
  /** The bound domain (from AAAArchi) */
  readonly domain: string;
  
  /** The bound layer (from AAAArchi) */
  readonly layer: string;
}

// ============================================
// MODULE TYPE
// ============================================

/**
 * Ferror module provides domain:layer access via magic getters.
 * 
 * Usage:
 *   const ferror = ferrorMod.user.service;
 *   throw ferror(error, { ... });
 */
export type FerrorModule = {
  [domain: string]: {
    [layer: string]: BoundFerror;
  };
};
