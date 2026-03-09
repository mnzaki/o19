import type { MethodMetadata } from '../../../warp/metadata.js';
import { Name } from '../../stringing.js';
import type { FunctionVariantDeclaration } from './declarative.js';
import type { LanguageDefinitionImperative, LanguageRenderingConfig } from './imperative.js';
import { LanguageThing, LanguageValue, type LanguageParam, type LanguageType } from './types.js';

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

  set lang(lang: LanguageDefinitionImperative<T>) {
    (this as any)._lang = lang;
    this._render = lang.codeGen.rendering;

    // Apply language-specific enhancements
    if (lang.enhancements?.methods) {
      lang.enhancements.methods(this);
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
    return this.raw.params.map((p) => this.lang.types.fromTsType(p.tsType, false));
  }

  get returnType(): T {
    let type = this.lang.types.fromTsType(this.raw.returnType, !!this.raw.isCollection) as T;
    // Apply variant return type wrappers
    for (const variant of Object.values(this.appliedVariants)) {
      if (variant.wrapReturnType) {
        type = variant.wrapReturnType(type);
      }
    }
    return type;
  }

  get params() {
    let params: Array<[string, T]> = this.raw.params.map((p) => [
      p.name,
      this.lang.types.fromTsType(p.tsType) as T
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

  get signature() {
    return this._render.functionSignature(this);
  }

  get definition() {
    return this._render.renderDefinition(this);
  }

  get crudName() {
    // TODO
    return this.name;
  }

  paramsAsObject(name: string) {
    const propertyCtor = this.lang.types.property;
    if (!propertyCtor) throw new Error("can't wrap params in a language with no objects...");

    return this._render.renderParams([
      this._render.formatParam(
        name,
        this.lang.types.object(
          ...this.raw.params.map((p) => propertyCtor(p.name, this.lang.types.fromTsType(p.tsType)))
        )
      )
    ]);
  }

  // ============================================================================
  // Variant Views - chainable function modifiers
  // ============================================================================

  /**
   * Create a variant view with accumulated modifiers.
   * Calls into lang.codeGen.rendering functions generated by compileToExecutive.
   * Max 3 levels of nesting (e.g., view.pub.static.async).
   *
   * @param variants - Array of variant names (async, pub, etc.)
   * @param depth - Current nesting depth (max 3)
   * @param nameOverride - Optional name to use instead of method.name (for crudDefinition)
   * @param objectParamName - Optional name to wrap params in an object
   */
  /**
   * Add a variant to this method instance (mutating).
   * Used by language enhancements to add variants after construction.
   */
  addVariant(variantName: string, variant: FunctionVariantDeclaration<T>): void {
    this.appliedVariants[variantName] = variant;
  }

  createVariant(variantName: string, variant: FunctionVariantDeclaration<T>): LanguageMethod<T> {
    const variants = {
      ...this.appliedVariants,
      [variantName]: variant
    };
    const newMethod = new LanguageMethod(this.raw, variants);
    // Propagate language if set
    if (this._lang) {
      newMethod.lang = this._lang;
    }
    return newMethod;
  }

  withNewName(overrideName: Name | string, variantName = 'rename'): LanguageMethod<T> {
    return this.createVariant(variantName, {
      overrideName
    });
  }

  withObjectParams(objectParamName: string): LanguageMethod<T> {
    const propertyCtor = this.lang.types.property;
    if (!propertyCtor) throw new Error("can't wrap params in a language with no objects...");
    return this.createVariant('objectParam', {
      processParams: (params: Array<[string, T]>) => [
        [
          objectParamName,
          this.lang.types.object(...params.map(([name, type]) => propertyCtor(name, type))) as T
        ]
      ]
    });
  }

  get crud(): LanguageMethod<T> {
    return this.crudName ? this.withNewName(this.crudName) : this;
  }

  /**
   * Override to clear appliedVariants when cloning to a different language.
   * Variants are language-specific and should be re-applied by the new language's enhancements.
   */
  copyOwnProperties(clone: LanguageMethod<T>): void {
    // Copy all properties from this instance
    for (const key of Object.getOwnPropertyNames(this)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, key);
      if (descriptor) {
        Object.defineProperty(clone, key, descriptor);
      }
    }
    // Clear variants for the clone - new language will apply its own
    clone.appliedVariants = {};
  }
}
