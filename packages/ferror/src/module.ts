/**
 * Ferror Module - builds BoundFerror instances with AAAArchi integration
 * 
 * Usage:
 *   const ferrorMod = ferroringModule();
 *   const ferror = ferrorMod.user.service;
 *   throw ferror(error, { stance: 'authoritative', summary: '...' });
 */

import type { 
  BoundFerror,
  AnnotateRecipe,
  WrapRecipe,
  InterceptRecipe,
  GuardRecipe,
  RecipeContext,
  ErrorAnnotation,
} from './types.js';
import { Ferror } from './Ferror.js';
import { AAAArchi } from '@o19/aaaarchi';

const cache = new Map<string, BoundFerror>();

function createBoundFerror(domain: string, layer: string): BoundFerror {
  const cacheKey = `${domain}:${layer}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // The callable: throw ferror(error, annotation)
  const ferror = function(
    error: Error, 
    annotation: Omit<ErrorAnnotation, 'domain' | 'layer'>
  ): Ferror {
    const root = isFerror(error) ? error.root : error;
    
    // Build full annotation with domain and layer from AAAArchi context
    const fullAnnotation: ErrorAnnotation = {
      ...annotation,
      domain,
      layer,
    };
    
    return new Ferror({
      domain,
      layer,
      annotation: fullAnnotation,
      cause: error,
      root,
    });
  };

  // Attach decorator methods
  ferror.annotate = (recipe: AnnotateRecipe): MethodDecorator => {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      
      descriptor.value = async function(...args: unknown[]) {
        try {
          return await original.apply(this, args);
        } catch (e) {
          // Get current architectural context from AAAArchi
          const archContext = AAAArchi.getCurrentContext() || {
            domain,
            layer,
            function: propertyKey as string,
            file: 'unknown',
            canDependOn: [],
          };
          
          const ctx: RecipeContext = {
            error: e as Error,
            args,
            archContext,
          };
          
          if (e instanceof Ferror) {
            const partialAnnotation = recipe.build(ctx);
            e.annotate(partialAnnotation);
            throw e;
          }
          
          // Raw error - wrap it
          const partialAnnotation = recipe.build(ctx);
          throw ferror(e as Error, partialAnnotation);
        }
      };
      
      return descriptor;
    };
  };

  ferror.wrap = (recipe: WrapRecipe): MethodDecorator => {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      
      descriptor.value = async function(...args: unknown[]) {
        try {
          return await original.apply(this, args);
        } catch (e) {
          const archContext = AAAArchi.getCurrentContext() || {
            domain,
            layer,
            function: propertyKey as string,
            file: 'unknown',
            canDependOn: [],
          };
          
          const ctx: RecipeContext = {
            error: e as Error,
            args,
            archContext,
          };
          
          // Always wrap, even if already ferror
          const partialAnnotation = recipe.build(ctx);
          throw ferror(e as Error, partialAnnotation);
        }
      };
      
      return descriptor;
    };
  };

  ferror.intercept = (recipe: InterceptRecipe): MethodDecorator => {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      
      descriptor.value = async function(...args: unknown[]) {
        try {
          return await original.apply(this, args);
        } catch (e) {
          if (!recipe.when(e as Error)) {
            throw e; // Not our error, pass through
          }
          
          const archContext = AAAArchi.getCurrentContext() || {
            domain,
            layer,
            function: propertyKey as string,
            file: 'unknown',
            canDependOn: [],
          };
          
          const ctx: RecipeContext = {
            error: e as Error,
            args,
            archContext,
          };
          
          const partialAnnotation = recipe.build(ctx);
          throw ferror(e as Error, partialAnnotation);
        }
      };
      
      return descriptor;
    };
  };

  ferror.guard = (recipe: GuardRecipe): MethodDecorator => {
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
      const original = descriptor.value;
      
      descriptor.value = async function(...args: unknown[]) {
        if (!recipe.validate(...args)) {
          const partialAnnotation = recipe.onFail(...args);
          throw ferror(new Error('Guard failed'), partialAnnotation);
        }
        return await original.apply(this, args);
      };
      
      return descriptor;
    };
  };

  // Introspection properties
  Object.defineProperty(ferror, 'domain', { value: domain, writable: false });
  Object.defineProperty(ferror, 'layer', { value: layer, writable: false });

  const boundFerror = ferror as unknown as BoundFerror;
  cache.set(cacheKey, boundFerror);
  return boundFerror;
}

function isFerror(error: unknown): error is Ferror {
  return error instanceof Ferror;
}

/**
 * Create the Ferror module with magic getters.
 * 
 * Usage:
 *   const ferrorMod = ferroringModule();
 *   const ferror = ferrorMod.user.service;
 */
export function ferroringModule(): {
  [domain: string]: {
    [layer: string]: BoundFerror;
  };
} {
  return new Proxy({} as { [domain: string]: { [layer: string]: BoundFerror } }, {
    get(_target, domainKey: string) {
      // Return layer proxy for this domain
      return new Proxy({} as { [layer: string]: BoundFerror }, {
        get(_, layerKey: string) {
          return createBoundFerror(domainKey, layerKey);
        }
      });
    }
  });
}

export { AAAArchi };
