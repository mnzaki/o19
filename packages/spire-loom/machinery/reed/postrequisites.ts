/**
 * Postrequisites 🌀
 *
 * "From the future, we divine what we need from the past."
 *
 * Multi-stage diviners that collect during Phase 1 and render during Phase 2.
 *
 * Usage:
 * ```typescript
 * const importsDiviner = declareDiviner([
 *   {
 *     init: (items, ctx, args) => new ImportsAccumulator(...),
 *     wrapProperty: { returnType: (desc, acc) => ({...}) }
 *   },
 *   {
 *     imports: (acc, ctx, args) => () => 'rendered imports'
 *   }
 * ]);
 *
 * const methods = createQueryAPI(items, 'methods', {
 *   imports: importsDiviner({ entityPath: './entities' })
 * });
 * ```
 */

import { declare, type Scope } from '../self-declarer.js';
import type { LanguageDefinitionImperative } from './language/imperative.js';
import type { LanguageType } from './language/types.js';
import { LanguageThing } from './language/types.js';
import type { GeneratorContext } from '../../weaver/plan-builder.js';
import type { BoundQuery } from '../sley/query.js';

// ============================================================================
// Types
// ============================================================================

/** Property descriptor transformer */
export type PropertyWrapper = (
  descriptor: PropertyDescriptor,
  accumulator: PostrequisiteAccumulator
) => PropertyDescriptor;

/** Accumulator base class - implements toString for Phase 1/2 switching */
export abstract class PostrequisiteAccumulator extends LanguageThing {
  /** Current divining stage: 'collecting' | 'rendering' */
  _stage: 'collecting' | 'rendering' = 'collecting';
  
  /** The finish functions by name, set during init */
  _finishers: Record<string, () => string> = {};
  
  /** Context name for template placeholder */
  _contextName: string = '';

  abstract toString(): string;
  
  /** Optional add method for tracking items */
  add?(name: string, path: string, isEntity?: boolean, sourceMethod?: string): void;

  constructor(name: string) {
    super(name);
  }

  /**
   * Phase 1: Returns placeholder for Phase 2
   * Phase 2: Calls the finisher function
   */
  protected render(finisherName: string): string {
    if (this._stage === 'collecting') {
      return `{{ ${this._contextName}.${this.name}.render('${finisherName}') }}`;
    }
    const finisher = this._finishers[finisherName];
    return finisher ? finisher() : '';
  }
}

/** Collection stage - gathers data via property wrapping */
export interface DivinerCollectionStage<T, A extends PostrequisiteAccumulator, Args> {
  /** Create accumulator with access to items and context */
  init: (items: BoundQuery<any>, ctx: GeneratorContext, args: Args) => A;
  
  /** Property wrappers to intercept access */
  wrapProperty?: Record<string, PropertyWrapper>;
}

/** Rendering stage - provides toString implementations */
export type DivinerRenderingStage<A extends PostrequisiteAccumulator, Args> = 
  Record<string, (acc: A, ctx: GeneratorContext, args: Args) => () => string>;

/** Diviner definition as stages */
export type DivinerDefinition<T, A extends PostrequisiteAccumulator, Args> = [
  DivinerCollectionStage<T, A, Args>,
  DivinerRenderingStage<A, Args>
];

/** Instantiated diviner ready to apply */
export interface InstantiatedDiviner<A extends PostrequisiteAccumulator> {
  /** The accumulator instance */
  accumulator: A;
  
  /** Apply property wrappers to items */
  applyToItems(items: BoundQuery<any>): void;
}

// ============================================================================
// Diviner Factory
// ============================================================================

/**
 * Declare a multi-stage diviner.
 * Returns a factory function that takes args and returns an instantiated diviner.
 */
export function declareDiviner<T, A extends PostrequisiteAccumulator, Args = any>(
  stages: DivinerDefinition<T, A, Args>
): (args: Args) => InstantiatedDiviner<A> {
  const [collectionStage, renderingStage] = stages;
  
  return (args: Args): InstantiatedDiviner<A> => {
    // These will be set when applied to items
    let items: BoundQuery<any> | null = null;
    let ctx: GeneratorContext | null = null;
    let accumulator: A | null = null;
    
    return {
      get accumulator(): A {
        if (!accumulator) {
          throw new Error('Diviner not initialized - call applyToItems first');
        }
        return accumulator;
      },
      
      applyToItems(boundItems: BoundQuery<any>): void {
        items = boundItems;
        ctx = boundItems as any; // BoundQuery carries context
        
        // Create accumulator via init
        accumulator = collectionStage.init(items, ctx!, args);
        accumulator._contextName = (boundItems as any).contextName || 'ctx';
        
        // Store args on accumulator for access in wrappers
        (accumulator as any)._args = args;
        
        // Set up finishers from rendering stage
        for (const [name, finisherFn] of Object.entries(renderingStage)) {
          accumulator._finishers[name] = finisherFn(accumulator, ctx!, args);
        }
        
        // Apply property wrappers to each item
        if (collectionStage.wrapProperty) {
          for (const item of items.all) {
            for (const [propName, wrapper] of Object.entries(collectionStage.wrapProperty)) {
              const descriptor = Object.getOwnPropertyDescriptor(item, propName) 
                || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(item), propName);
              if (descriptor) {
                Object.defineProperty(item, propName, wrapper(descriptor, accumulator));
              }
            }
          }
        }
      }
    };
  };
}

// ============================================================================
// Imports Accumulator
// ============================================================================

export interface ImportEntry {
  name: string;
  path: string;
  isEntity: boolean;
  sourceMethod: string;
}

export class ImportsAccumulator extends PostrequisiteAccumulator {
  private imports = new Map<string, ImportEntry>();
  private entriesQuery?: BoundQuery<any>;

  constructor(
    lang: LanguageDefinitionImperative,
    contextName: string
  ) {
    super('imports');
    this.lang = lang;
    this._contextName = contextName;
  }

  add(name: string, path: string, isEntity: boolean = false, sourceMethod: string = ''): void {
    this.imports.set(name, { name, path, isEntity, sourceMethod });
  }

  /** Get entries as BoundQuery for chaining */
  get entries(): BoundQuery<any> {
    if (!this.entriesQuery) {
      this.entriesQuery = this.createBoundQuery();
    }
    return this.entriesQuery;
  }

  private createBoundQuery(): BoundQuery<any> {
    // Dynamic import to avoid circular dependency
    const { createQueryAPI } = require('../sley/query.js');
    return createQueryAPI(
      Array.from(this.imports.values()),
      `${this._contextName}.imports.entries`
    );
  }

  /** toString uses the 'imports' finisher */
  toString(): string {
    return this.render('imports');
  }

  cloneWithLang(lang: LanguageDefinitionImperative): typeof this {
    const clone = new ImportsAccumulator(lang, this._contextName);
    for (const [, entry] of this.imports) {
      clone.imports.set(entry.name, { ...entry });
    }
    clone._stage = this._stage;
    clone._finishers = this._finishers;
    return clone as typeof this;
  }
}

// ============================================================================
// Pre-defined Diviners
// ============================================================================

/** Arguments for imports diviner */
export interface ImportsDivinerArgs {
  /** Base path for entity imports (e.g., './entities') */
  entityPath?: string;
  
  /** Function to determine if a type name is an entity */
  isEntity?: (name: string) => boolean;
}

/**
 * Standard imports diviner - tracks entity imports from method return types
 */
export const importsDiviner = declareDiviner([
  {
    init: (items, ctx, args: ImportsDivinerArgs) => {
      return new ImportsAccumulator(
        items.primaryLang!,
        (items as any).contextName || 'ctx'
      );
    },
    wrapProperty: {
      returnType: (desc, acc) => ({
        get: function() {
          const type = desc.get!.call(this) as LanguageType;
          if (type?.isEntity) {
            const args = (acc as any)._args as ImportsDivinerArgs;
            const entityPath = args?.entityPath ?? '.';
            (acc as ImportsAccumulator).add(
              type.name.toString(),
              `${entityPath}/${type.name}`,
              true,
              (this as any).name
            );
          }
          return type;
        },
        enumerable: desc.enumerable,
        configurable: desc.configurable
      })
    }
  },
  {
    imports: (acc, ctx, args) => () => {
      const renderImport = acc.lang.codeGen.rendering.renderImportStatement;
      const entries = Array.from((acc as ImportsAccumulator).entries.all);
      
      return entries.map(entry => {
        const modulePath = entry.path.startsWith('"') 
          ? entry.path 
          : `"${entry.path}"`;
        return renderImport 
          ? renderImport(entry.name, modulePath)
          : `import { ${entry.name} } from ${modulePath};`;
      }).join('\n');
    }
  }
]);

// ============================================================================
// Diviner Sets
// ============================================================================

/** Set of instantiated diviners by name */
export type DivinerSet = Record<string, InstantiatedDiviner<any>>;

/** Apply a set of diviners to a BoundQuery's items */
export function applyDivinerSet(
  diviners: DivinerSet,
  items: BoundQuery<any>
): void {
  for (const [, diviner] of Object.entries(diviners)) {
    diviner.applyToItems(items);
  }
}
