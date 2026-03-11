import type { MethodMetadata } from '../../warp/metadata.js';
import { Name } from '../stringing.js';
import type {
  LanguageDefinitionImperative,
  LanguageRenderingConfig
} from './language/imperative.js';
import {
  LanguageThing,
  type FunctionVariantDeclaration,
  type LanguageType
} from './language/types.js';

/**
 * Language-specific method extends raw with:
 * - Naming variants (camelName, pascalName, snakeName)
 * - Type definition (returnTypeDef)
 * - Stub return value
 * - Template helpers (params, signature)
 *
 * This is the internal representation after language enhancement.
 * For templates, use LanguageView (from enhanced/methods.ts) which provides
 * idiomatic naming via conventions.
 */
export class LanguageMethod<T extends LanguageType = LanguageType> extends LanguageThing<T> {
  private _render!: LanguageRenderingConfig<T>;
  public tags: string[];
  readonly mgmtName: string;
  appliedVariants: Record<string, FunctionVariantDeclaration<T>>;

  /** Reference to underlying LanguageMethod */

  constructor(
    readonly raw: MethodMetadata,
    appliedVariants: Record<string, FunctionVariantDeclaration<T>> = {}
  ) {
    super(raw.name);
    this.tags = raw.tags ?? [];
    this.mgmtName = raw.managementName;
    this.appliedVariants = appliedVariants;
  }

  get name() {
    let name: Name | string = this._name;
    for (const variant of Object.values(this.appliedVariants)) {
      if (variant.overrideName) {
        name = variant.overrideName;
      }
    }
    return name instanceof Name ? name : new Name(name);
  }

  get lang(): LanguageDefinitionImperative<T> {
    return super.lang;
  }

  set lang(lang: LanguageDefinitionImperative<T>) {
    if (this._lang === lang) return;
    if (this._lang) {
      for (const variantName of Object.keys(this._lang.functionVariants)) {
        delete (this as any)[variantName];
      }
    }

    this._lang = lang;
    if (!lang.codeGen) {
      console.log(`[METHOD] Language ${lang.name} has no codeGen! lang keys: ${Object.keys(lang).join(', ')}`);
      throw new Error(`Language ${lang.name} has no codeGen!`);
    }
    this._render = lang.codeGen.rendering;
    if (!this._render) {
      console.log(`[METHOD] Language ${lang.name} codeGen:`, lang.codeGen);
      throw new Error(`Language ${lang.name} has no codeGen.rendering!`);
    }

    // Apply language-specific enhancements
    if (lang.enhancements?.methods) {
      lang.enhancements.methods(this as unknown as LanguageMethod);
    }

    // Define getter properties for each function variant declared in the language syntax
    // This enables method.{variant} access (e.g., method.async, method.unsafe)
    if (lang.functionVariants) {
      for (const variantName of Object.keys(lang.functionVariants)) {
        // Only define if not already defined on this instance
        if (!(variantName in this)) {
          Object.defineProperty(this, variantName, {
            get: () => this.withVariance(variantName),
            enumerable: true,
            configurable: true
          });
        }
      }
    }
  }

  get prependedKeywords() {
    return Object.values(this.appliedVariants)
      .filter((v) => !!v.prependKeyword)
      .map((v) => v.prependKeyword);
  }

  /**
   * Check if this method has a specific tag.
   */
  hasTag(tag: string): boolean {
    return this.tags?.includes(tag) ?? false;
  }

  /**
   * Get CRUD operation from tags (e.g., 'create', 'read').
   */
  getCrudOperation(): string | undefined {
    return this.tags?.find((t) => t.startsWith('crud:'))?.replace('crud:', '');
  }

  /**
   * CRUD operation type (create, read, update, delete, list).
   * Convenience getter that calls getCrudOperation().
   */
  get crudOperation(): string | undefined {
    return this.getCrudOperation();
  }

  get isAsync() {
    return !!this.appliedVariants.async;
  }

  get isPublic() {
    return !!this.appliedVariants.public || !this.appliedVariants.private;
  }

  get isPrivate() {
    return !this.isPublic;
  }

  get isStatic() {
    return !!this.appliedVariants.static;
  }

  get isProtected() {
    return !!this.appliedVariants.protected;
  }

  get isWithObjectParam() {
    return !!this.appliedVariants.objectParam;
  }

  get paramTypes() {
    return this.raw.params.map((p) => this.lang.codeGen.types.fromTsType(p.tsType, false));
  }

  get returnType(): T {
    let type = this.lang.codeGen.types.fromTsType(
      this.raw.returnType,
      !!this.raw.isCollection
    ) as T;
    // Apply variant return type wrappers
    for (const variant of Object.values(this.appliedVariants)) {
      if (variant.wrapReturnType) {
        type = variant.wrapReturnType(type);
      }
    }
    return type;
  }

  /**
   * Formatted parameters string.
   * Generated from the language's composition.functionParams template.
   *
   * @example
   * // Rust: method.params
   * // → "(url: String, title: Option<String>)"
   *
   * // TypeScript: method.params
   * // → "(url: string, title?: string)"
   *
   * @example Template usage:
   * ```mejs
   * {# Custom parameter formatting #}
   * fn {{ method.name }}_wrapper{{ method.params }} -> {{ method.returnType.name }}
   * ```
   */
  get params() {
    let params: Array<[string, T]> = this.raw.params.map((p) => [
      p.name,
      this.lang.codeGen.types.fromTsType(p.tsType) as T
    ]);
    for (const variant of Object.values(this.appliedVariants)) {
      if (variant.processParams) {
        params = variant.processParams(params);
      }
    }
    return this.lang.codeGen.rendering.renderParams(
      params.map((p) => this.lang.codeGen.rendering.formatParam(p[0], p[1]))
    );
  }

  get generics() {
    // TODO
    return '';
  }

  get stubReturn() {
    return this.returnType.stub;
  }

  /**
   * Function signature without body.
   * Generated from the language's composition.functionSignature template.
   *
   * @example
   * // Rust: method.signature
   * // → "pub fn add_bookmark(url: String) -> Result<(), Error>"
   *
   * // TypeScript: method.signature
   * // → "async addBookmark(url: string): Promise<void>"
   *
   * // AIDL: method.signature
   * // → "void addBookmark(String url)"
   *
   * @example Template usage:
   * ```mejs
   * {# Define a function with custom body #}
   * {{ method.signature }} {
   *     {{ method.invoke('self.foundframe') }}
   * }
   *
   * {# Or with variant modifiers #}
   * {{ method.pub.async.signature }} {
   *     // implementation
   * }
   * ```
   */
  get signature() {
    if (!this._render) {
      console.log('[DEBUG signature] _render is undefined!', { _lang: this._lang, _render: this._render, method: this.name });
    }
    return this._render.functionSignature(this);
  }

  /**
   * Full function definition with signature and body placeholder.
   * Generated from the language's composition.functionDefinition template.
   *
   * NOTE: The default template includes a {{body}} placeholder that expects
   * content to be provided. For most use cases, prefer `signature` and
   * provide your own braces/body.
   *
   * @example
   * // Default output (includes body placeholder):
   * // "pub fn add_bookmark(url: String) -> Result<(), Error> {
   * // {{body}}
   * // }"
   *
   * @see signature For signature-only output
   */
  get definition() {
    return this._render.renderDefinition(this);
  }

  get crudName() {
    // TODO
    return this.name;
  }

  paramsAsObject(name: string) {
    const propertyCtor = this.lang.codeGen.types.property;
    if (!propertyCtor) throw new Error("can't wrap params in a language with no objects...");

    return this._render.renderParams([
      this._render.formatParam(
        name,
        this.lang.codeGen.types.object(
          ...this.raw.params.map((p) =>
            propertyCtor(p.name, this.lang.codeGen.types.fromTsType(p.tsType))
          )
        )
      )
    ]);
  }

  /**
   * Raw parameter names as an array.
   * Useful for generating invocation lists or destructuring.
   *
   * @example
   * // method with params: url: String, title: Option<String>
   * method.paramNames
   * // → ['url', 'title']
   *
   * @example Template usage:
   * ```mejs
   * {# Invocation: method.paramNames.join(', ') #}
   * invoke('cmd', {{ method.paramNames.join(', ') }})
   * // → invoke('cmd', url, title)
   *
   * {# Destructuring: object style #}
   * invoke('cmd', { {{ method.paramNames.join(', ') }} })
   * // → invoke('cmd', { url, title })
   * ```
   */
  get paramNames(): string[] {
    return this.raw.params.map((p) => p.name);
  }

  /**
   * Safe JSON serialization that avoids infinite recursion.
   * 
   * The variant getters (async, pub, etc.) call cloneWithLang() which creates
   * new instances with their own variant getters. JSON.stringify would trigger
   * all getters, causing infinite recursion.
   * 
   * This method returns a plain object with only the essential data.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name.toString(),
      mgmtName: this.mgmtName,
      raw: this.raw,
      tags: this.tags,
      lang: this._lang?.name,
      appliedVariants: Object.keys(this.appliedVariants),
      isAsync: this.isAsync,
      isPublic: this.isPublic
    };
  }

  // ============================================================================
  // Variant Views - chainable function modifiers
  // ============================================================================

  /**
   * Add a variance (variant) to this method instance (mutating).
   * Looks up the variant definition from the language's functionVariants by name.
   * Throws if the variant is not defined in the language syntax.
   *
   * @param varianceName - Name of the variance to add (must exist in lang.syntax.functionVariants)
   * @param overrides - Optional overrides to apply to the looked-up variance definition
   */
  addVariance(varianceName: string, overrides?: Partial<FunctionVariantDeclaration<T>>): void {
    const { functionVariants } = this.lang;
    if (!functionVariants) {
      throw new Error(
        `Cannot add variance '${varianceName}': language '${this.lang.name}' has no functionVariants defined`
      );
    }

    const varianceDef = functionVariants[varianceName];
    if (!varianceDef) {
      const available = Object.keys(functionVariants).join(', ');
      throw new Error(
        `Unknown variance '${varianceName}' for language '${this.lang.name}'. ` +
          `Available: ${available}`
      );
    }

    // Merge the looked-up definition with any overrides
    this.appliedVariants[varianceName] = {
      ...varianceDef,
      ...overrides,
      name: varianceName
    } as unknown as FunctionVariantDeclaration<T>;
  }

  /**
   * Create a new method with an additional variance applied (non-mutating).
   * @param varianceName - Name of the variance to apply
   * @param variance - Optional custom variance definition (if not provided, looks up from language)
   */
  withVariance(varianceName: string, variance?: FunctionVariantDeclaration<T>): LanguageMethod<T> {
    // If no explicit variance provided, look it up from the language
    if (!variance) {
      const { functionVariants } = this.lang;
      if (!functionVariants?.[varianceName]) {
        const available = Object.keys(functionVariants ?? {}).join(', ');
        throw new Error(
          `Unknown variance '${varianceName}' for language '${this.lang.name}'. ` +
            `Available: ${available}`
        );
      }
      variance = functionVariants[varianceName] as unknown as FunctionVariantDeclaration<T>;
    }

    const variants = {
      ...this.appliedVariants,
      [varianceName]: { ...variance, name: varianceName }
    };
    const newMethod = new LanguageMethod<T>(this.raw, variants);
    // Propagate language if set
    if (this._lang) {
      newMethod.lang = this._lang;
    }
    return newMethod;
  }

  withNewName(overrideName: Name | string, variantName = 'rename'): LanguageMethod<T> {
    return this.withVariance(variantName, {
      overrideName
    });
  }

  withObjectParams(objectParamName: string, variantName = 'objectParam'): LanguageMethod<T> {
    const propertyCtor = this.lang.codeGen.types.property;
    if (!propertyCtor) throw new Error("can't wrap params in a language with no objects...");
    return this.withVariance(variantName, {
      processParams: (params: Array<[string, T]>) => [
        [
          objectParamName,
          this.lang.codeGen.types.object(
            ...params.map(([name, type]) => propertyCtor(name, type))
          ) as T
        ]
      ]
    });
  }

  get crud(): LanguageMethod<T> {
    return this.crudName ? this.withNewName(this.crudName) : this;
  }
}
