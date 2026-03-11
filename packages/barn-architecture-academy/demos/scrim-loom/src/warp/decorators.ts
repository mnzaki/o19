/**
 * Scrim-Loom Decorator Creators 🦡
 *
 * These decorators use AAAArchi to collect AND validate metadata.
 * Unlike spire-loom's pure collection, we validate architectural rules
 * at decoration time.
 */

import { AAAArchi } from '@o19/aaaarchi';
import { ferroringModule } from '@o19/ferror';
import type { BaseAnnotation } from '@o19/aaaarchi';

// ============================================
// DECORATOR METADATA TYPES
// ============================================

export interface ScrimStructConfig {
  layer?: string;
  useResult?: boolean;
  description?: string;
}

export interface ScrimFieldConfig {
  wrappers?: string[];
  type?: string;
  optional?: boolean;
}

export interface ScrimLinkConfig {
  target: string;
  description?: string;
}

export interface ScrimServiceConfig {
  layer: string;
  domain?: string;
  description?: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================

const VALID_LAYERS = ['domain', 'infrastructure', 'repository', 'service', 'controller', 'application'];

function validateLayer(layer: string, decoratorName: string): void {
  if (!VALID_LAYERS.includes(layer)) {
    const ferror = ferroringModule().scrim.warp;
    throw ferror(
      new Error('Invalid layer'),
      {
        function: decoratorName,
        stance: 'authoritative',
        summary: `Invalid layer: "${layer}"`,
        explanation: `Layer must be one of: ${VALID_LAYERS.join(', ')}`,
        suggestions: [
          { action: 'fix-layer', message: `Change layer to one of the valid options` },
          { action: 'add-layer', message: `Register custom layer with AAAArchi if needed` }
        ],
        context: { providedLayer: layer, validLayers: VALID_LAYERS },
        tags: ['validation-error', 'invalid-layer']
      }
    );
  }
}

function validateLayerTransition(fromLayer: string, toLayer: string, context: string): void {
  const scope = AAAArchi.forFile(import.meta.url);
  
  if (!scope.canCall(toLayer)) {
    const violations = AAAArchi.validatePath([fromLayer, toLayer]);
    
    if (violations.length > 0) {
      const ferror = ferroringModule().scrim.warp;
      throw ferror(
        new Error('Layer transition violation'),
        {
          function: context,
          stance: 'authoritative',
          summary: `Invalid transition: ${fromLayer} → ${toLayer}`,
          explanation: violations[0].explanation,
          suggestions: [
            { action: violations[0].fix, message: violations[0].fix }
          ],
          context: { fromLayer, toLayer, violations },
          tags: ['architectural-violation', 'layer-skip']
        }
      );
    }
  }
}

// ============================================
// DECORATOR CREATORS
// ============================================

/**
 * @scrim.Struct decorator
 *
 * Marks a class as a scrim struct and validates its layer placement.
 *
 * Usage:
 *   @scrim.Struct({ layer: 'infrastructure', useResult: true })
 *   class Foundframe { ... }
 */
export function Struct(config: ScrimStructConfig = {}) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    const scope = AAAArchi.forFile(import.meta.url);
    const ctx = scope.getContext();
    
    // Determine layer (explicit config > inferred from file path)
    const layer = config.layer || ctx.layer;
    
    // Validate layer
    validateLayer(layer, target.name);
    
    // Register with AAAArchi
    const annotation: BaseAnnotation = {
      function: target.name,
      context: {
        type: 'struct',
        layer,
        useResult: config.useResult || false,
        description: config.description
      },
      tags: ['struct', layer, config.useResult ? 'use-result' : ''].filter(Boolean)
    };
    
    scope.annotate(target, annotation);
    
    // Mark the class
    Reflect.defineMetadata('scrim:struct', config, target);
    
    return target;
  };
}

/**
 * @scrim.Field decorator
 *
 * Marks a field with metadata about wrappers and type.
 *
 * Usage:
 *   @scrim.Field({ wrappers: ['Mutex', 'Option'] })
 *   thestream = TheStream;
 */
export function Field(config: ScrimFieldConfig = {}) {
  return function (target: any, propertyKey: string) {
    const scope = AAAArchi.forFile(import.meta.url);
    
    scope.annotate(target.constructor, {
      function: `${target.constructor.name}.${propertyKey}`,
      context: {
        type: 'field',
        fieldName: propertyKey,
        wrappers: config.wrappers || [],
        fieldType: config.type,
        optional: config.optional
      },
      tags: ['field', ...(config.wrappers || [])]
    });
    
    Reflect.defineMetadata('scrim:field', config, target, propertyKey);
  };
}

/**
 * @scrim.Link decorator
 *
 * Establishes a link to another struct/target.
 *
 * Usage:
 *   @scrim.Link({ target: foundframe.inner.core.thestream })
 *   class BookmarkService { ... }
 */
export function Link(config: ScrimLinkConfig) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    const scope = AAAArchi.forFile(import.meta.url);
    const ctx = scope.getContext();
    
    // Validate link target doesn't violate layer rules
    // This is a simplified check - real implementation would parse the target path
    const targetLayer = config.target.includes('infrastructure') 
      ? 'infrastructure' 
      : config.target.includes('service') 
        ? 'service' 
        : 'unknown';
    
    if (targetLayer !== 'unknown') {
      validateLayerTransition(ctx.layer, targetLayer, target.name);
    }
    
    scope.annotate(target, {
      function: target.name,
      context: {
        type: 'link',
        target: config.target,
        description: config.description
      },
      tags: ['link', targetLayer]
    });
    
    Reflect.defineMetadata('scrim:link', config, target);
    
    return target;
  };
}

/**
 * @scrim.Service decorator
 *
 * Marks a class as a service with layer validation.
 *
 * Usage:
 *   @scrim.Service({ layer: 'service', domain: 'bookmark' })
 *   class BookmarkService { ... }
 */
export function Service(config: ScrimServiceConfig) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    const scope = AAAArchi.forFile(import.meta.url);
    
    // Validate layer
    validateLayer(config.layer, target.name);
    
    scope.annotate(target, {
      function: target.name,
      context: {
        type: 'service',
        layer: config.layer,
        domain: config.domain,
        description: config.description
      },
      tags: ['service', config.layer, config.domain].filter((t): t is string => Boolean(t))
    });
    
    Reflect.defineMetadata('scrim:service', config, target);
    
    return target;
  };
}

/**
 * @scrim.crud.* decorators
 *
 * Marks methods with CRUD operations.
 */
export const crud = {
  create: methodDecorator('create'),
  read: methodDecorator('read'),
  update: methodDecorator('update'),
  delete: methodDecorator('delete'),
  list: methodDecorator('list'),
  query: methodDecorator('query')
};

function methodDecorator(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const scope = AAAArchi.forFile(import.meta.url);
    
    scope.annotate(target.constructor, {
      function: `${target.constructor.name}.${propertyKey}`,
      context: {
        type: 'method',
        operation,
        methodName: propertyKey
      },
      tags: ['method', operation]
    });
    
    Reflect.defineMetadata('scrim:crud', { operation }, target, propertyKey);
    
    return descriptor;
  };
}

// ============================================
// REFLECT METADATA SHIM
// ============================================

// Simple reflect-metadata shim if not available
declare let Reflect: any;
if (typeof Reflect === 'undefined' || !Reflect.defineMetadata) {
  (globalThis as any).Reflect = {
    ...((globalThis as any).Reflect || {}),
    defineMetadata: (key: string, value: any, target: any, propertyKey?: string) => {
      const metadataKey = `__scrim_${key}`;
      if (propertyKey) {
        target[metadataKey] = target[metadataKey] || {};
        target[metadataKey][propertyKey] = value;
      } else {
        target[metadataKey] = value;
      }
    },
    getMetadata: (key: string, target: any, propertyKey?: string) => {
      const metadataKey = `__scrim_${key}`;
      if (propertyKey) {
        return target[metadataKey]?.[propertyKey];
      }
      return target[metadataKey];
    }
  };
}
