/**
 * Postrequisites 🌀
 *
 * "From the future, we divine what we need from the past."
 *
 * Multi-stage diviners that collect during Phase 1 and render during Phase 2.
 * PostrequisiteAccumulators extend BoundQuery, making them both accumulators
 * AND queryable collections.
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
 *
 * // In templates:
 * {{ methods.imports }}  // Phase 1: placeholder, Phase 2: rendered imports
 * {{ methods.imports.entries.filter(e => e.isEntity).all }}
 * ```
 */

import { declare, type Scope } from '../self-declarer.js';
import type { LanguageDefinitionImperative } from './language/imperative.js';
import type { LanguageType } from './language/types.js';
import { LanguageThing } from './language/types.js';
import type { GeneratorContext } from '../../weaver/plan-builder.js';
import { BoundQuery, createQueryAPI } from '../sley/query.js';
import type { Name } from '../stringing.js';

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

  /** Original name string (preserved case for template placeholders) */
  protected _nameString: string = '';

  abstract toString(): string;

  /** Optional add method for tracking items */
  add?(name: string, path: string, isEntity?: boolean, sourceMethod?: string): void;

  constructor(name: string) {
    super(name);
    this._nameString = name;
  }

  /**
   * Phase 1: Returns placeholder for Phase 2
   * Phase 2: Calls the finisher function
   */
  protected render(finisherName: string): string {
    if (this._stage === 'collecting') {
      return `{{ ${this._contextName}.${this._nameString}.render('${finisherName}') }}`;
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
export type DivinerRenderingStage<A extends PostrequisiteAccumulator, Args> = Record<
  string,
  (acc: A, ctx: GeneratorContext, args: Args) => () => string
>;

/** Diviner definition as stages */
export type DivinerDefinition<T, A extends PostrequisiteAccumulator, Args> = [
  DivinerCollectionStage<T, A, Args>,
  DivinerRenderingStage<A, Args>
];

/** Instantiated diviner ready to apply */
export interface InstantiatedDiviner<A extends PostrequisiteAccumulator> {
  /** The accumulator instance (available after initAccumulator) */
  accumulator: A;

  /**
   * Phase 1: Initialize accumulator with language.
   * Can be called immediately when language is available.
   * Creates the accumulator and sets up finishers.
   */
  initAccumulator(items: BoundQuery<any>, lang: LanguageDefinitionImperative): void;

  /**
   * Phase 2: Apply property wrappers to items.
   * Called lazily during first evaluation when items are accessed.
   */
  applyWrappers(items: T[]): void;
}

// ============================================================================
// Diviner Factory
// ============================================================================

/**
 * Declare a multi-stage diviner.
 * Returns a factory function that takes args and returns an instantiated diviner.
 *
 * Two-phase lifecycle:
 * 1. initAccumulator() - Creates accumulator, sets up finishers (can be immediate)
 * 2. applyWrappers() - Applies property wrappers (lazy, during first evaluation)
 */
export function declareDiviner<T, A extends PostrequisiteAccumulator, Args = any>(
  stages: DivinerDefinition<T, A, Args>
): (args: Args) => InstantiatedDiviner<A> {
  const [collectionStage, renderingStage] = stages;

  return (args: Args): InstantiatedDiviner<A> => {
    // Phase 1 state (available immediately)
    let accumulator: A | null = null;
    let ctx: GeneratorContext | null = null;

    // Phase 2 state (set during wrapper application)
    let wrappersApplied = false;

    return {
      get accumulator(): A {
        if (!accumulator) {
          throw new Error('Diviner not initialized - call initAccumulator first');
        }
        return accumulator;
      },

      initAccumulator(boundItems: BoundQuery<any>, lang: LanguageDefinitionImperative): void {
        ctx = boundItems as any; // BoundQuery carries context

        // Create accumulator via init - now with explicit language
        accumulator = collectionStage.init(boundItems, ctx!, args);
        accumulator._contextName = (boundItems as any).contextName || 'ctx';
        accumulator.lang = lang; // Set language explicitly

        // Store args on accumulator for access in wrappers
        (accumulator as any)._args = args;

        // Set up finishers from rendering stage
        for (const [name, finisherFn] of Object.entries(renderingStage)) {
          accumulator._finishers[name] = finisherFn(accumulator, ctx!, args);
        }
      },

      applyWrappers(itemList: T[]): void {
        if (wrappersApplied || !collectionStage.wrapProperty) return;

        if (!accumulator) {
          throw new Error('Cannot apply wrappers before initAccumulator');
        }

        // Apply property wrappers to each item
        for (const item of itemList) {
          for (const [propName, wrapper] of Object.entries(collectionStage.wrapProperty)) {
            const descriptor =
              Object.getOwnPropertyDescriptor(item, propName) ||
              Object.getOwnPropertyDescriptor(Object.getPrototypeOf(item), propName);
            if (descriptor) {
              Object.defineProperty(item, propName, wrapper(descriptor, accumulator));
            }
          }
        }

        wrappersApplied = true;
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

  constructor(lang: LanguageDefinitionImperative, contextName: string) {
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
      return new ImportsAccumulator(items.primaryLang!, (items as any).contextName || 'ctx');
    },
    wrapProperty: {
      returnType: (desc, acc) => ({
        get: function () {
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

      return entries
        .map((entry) => {
          const modulePath = entry.path.startsWith('"') ? entry.path : `"${entry.path}"`;
          return renderImport
            ? renderImport(entry.name, modulePath)
            : `import { ${entry.name} } from ${modulePath};`;
        })
        .join('\n');
    }
  }
]);

// ============================================================================
// Files Accumulator
// ============================================================================

import type { LanguageDefinitionImperative } from './language/imperative.js';

/**
 * File specification for generated entity files.
 * Extends LanguageThing for language-aware naming and BoundQuery compatibility.
 */
export class LanguageFile extends LanguageThing {
  /** Context for template rendering */
  context: Record<string, any>;
  
  /** Path template with placeholders (e.g., './entities/{{name}}') */
  private pathTemplate: string;
  
  /** Template path (e.g., 'entity.ts.mejs') */
  template: string;

  constructor(
    name: string | Name,
    template: string,
    pathTemplate: string,
    context: Record<string, any> = {}
  ) {
    super(typeof name === 'string' ? name : name.toString());
    this.template = template;
    this.pathTemplate = pathTemplate;
    this.context = context;
  }

  /**
   * Resolved output path.
   * Computed lazily using name.toString() so case transformations
   * are applied at template render time, not accumulation time.
   */
  get path(): string {
    return this.pathTemplate.replace(/\{\{name\}\}/g, this.name.toString());
  }

  /**
   * Path template for reference (e.g., './entities/{{name}}')
   */
  get pathPattern(): string {
    return this.pathTemplate;
  }

  // Queryable interface compliance for BoundQuery
  get tags(): string[] { return []; }
  get crudOperation(): string | undefined { return undefined; }
  get managementName(): string | undefined { return undefined; }

  /**
   * Clone with a different language.
   * Required for BoundQuery multi-language support (rs, ts, kt properties).
   */
  cloneWithLang(lang: LanguageDefinitionImperative): LanguageFile {
    const clone = new LanguageFile(
      this.name,
      this.template,
      this.pathTemplate,
      { ...this.context }
    );
    clone.lang = lang;
    return clone;
  }
}

/**
 * FilesAccumulator transforms import entries into file specifications.
 * Used for entities.newFiles to generate entity files from collected imports.
 */
export class FilesAccumulator extends PostrequisiteAccumulator {
  private sourceQuery?: BoundQuery<any>;
  private pathTemplate: string;
  private filesCache?: LanguageFile[];

  constructor(
    sourceQuery: BoundQuery<any>,
    pathTemplate: string = './entities/{{name}}',
    contextName: string = 'ctx'
  ) {
    super('newFiles');
    this.sourceQuery = sourceQuery;
    this.pathTemplate = pathTemplate;
    this._contextName = contextName;
  }

  /**
   * Get files as array of LanguageFile specs.
   * Transforms source query entries into file specifications.
   */
  get all(): LanguageFile[] {
    if (this.filesCache) return this.filesCache;

    // Source query might be an imports accumulator's entries
    const entries = this.sourceQuery?.all || [];

    this.filesCache = entries.map((entry: ImportEntry) => {
      return new LanguageFile(
        entry.name,              // Name instance (converted in constructor)
        'entity.ts.mejs',        // Default template
        this.pathTemplate,       // Template with {{name}} placeholder
        {
          entity: entry,
          imports: this // Reference to accumulator for template access
        }
      );
    });

    // Propagate current language to all files for case transformation
    // Use _lang directly to avoid throwing when no language is set
    if ((this as any)._lang) {
      this.filesCache.forEach((file) => {
        file.lang = this.lang;
      });
    }

    return this.filesCache;
  }

  /**
   * Get files as BoundQuery for chaining/filtering.
   */
  get files(): BoundQuery<any> {
    return createQueryAPI(this.all, `${this._contextName}.newFiles.files`);
  }

  /** toString uses the 'files' finisher */
  toString(): string {
    return this.render('files');
  }

  cloneWithLang(lang: LanguageDefinitionImperative): typeof this {
    const clone = new FilesAccumulator(this.sourceQuery!, this.pathTemplate, this._contextName);
    clone._stage = this._stage;
    clone._finishers = this._finishers;
    return clone as typeof this;
  }
}

// ============================================================================
// Diviner Sets
// ============================================================================

/** Set of instantiated diviners by name */
export type DivinerSet = Record<string, InstantiatedDiviner<any>>;

/** Apply a set of diviners to a BoundQuery's items */
export function applyDivinerSet(diviners: DivinerSet, items: BoundQuery<any>): void {
  for (const [, diviner] of Object.entries(diviners)) {
    diviner.applyToItems(items);
  }
}
