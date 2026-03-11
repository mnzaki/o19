/**
 * Declarative Language Schema 🌾
 *
 * LAYER 1: DECLARATIVE LANGUAGE DEFINITION
 *
 * Users define languages using templates and declarations.
 * This layer describes WHAT the language looks like.
 *
 * ⚠️ ARCHITECTURAL BOUNDARY ⚠️
 * Code at runtime should NEVER access these templates directly.
 * Instead, use the compiled methods from LanguageDefinitionImperative.
 *
 * The compilation bridge: compileToImperative() transforms templates into
 * executable rendering methods in the imperative layer.
 *
 * To add a new feature:
 * 1. Add template to LanguageDeclaration.syntax.composition.*
 * 2. Add method signature to LanguageRenderingConfig (imperative.ts)
 * 3. Implement compilation in compileToImperative() below
 * 4. Use the compiled method in your runtime code
 *
 * @module machinery/reed/language/declarative
 * @see imperative.ts for the runtime layer
 * @see DEV.md "The Two-Layer Language Architecture" for full guide
 */

import type {
  LanguageRenderingConfig,
  LanguageCodeGenConfig,
  LanguageDefinitionImperative
} from './imperative.js';
import { DEFAULT_NAMING_CONVENTIONS, LanguageType } from './types.js';
import type { TypeFactory, NamingConventions, LanguageIdentity } from './types.js';
import { formatName } from '../../stringing.js';

// ============================================================================
// Core Keyword Types (Well-Known)
// ============================================================================

export const CORE_KEYWORD_TYPES = [
  // Declarations
  'function',
  'variable',
  'constant',
  'type',
  'class',
  'interface',
  'enum',
  'namespace',
  // Visibility
  'public',
  'private',
  'protected',
  'internal',
  // Modifiers
  'static',
  'abstract',
  'final',
  'override',
  // Control Flow
  'if',
  'else',
  'for',
  'while',
  'do',
  'break',
  'continue',
  'return',
  'switch',
  'case',
  'default',
  // Modules
  'import',
  'export',
  'from',
  // Special
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'delete',
  'this',
  'super',
  'null',
  'true',
  'false',
  'undefined'
] as const;

export type CoreKeywordType = (typeof CORE_KEYWORD_TYPES)[number];

export type KeywordType = CoreKeywordType | string;

// ============================================================================
// Keyword Declaration
// ============================================================================

//export interface KeywordDeclaration {
//  /** The actual keyword text (e.g., 'fn', 'function', 'def') */
//  keyword: string;
//  /** Whether this keyword is reserved and cannot be used as an identifier */
//  isReserved: boolean;
//  /** Category of keyword */
//  category:
//    | 'declaration'
//    | 'statement'
//    | 'expression'
//    | 'visibility'
//    | 'modifier'
//    | 'control'
//    | 'module'
//    | 'literal';
//  /** Position in syntax */
//  position: 'prefix' | 'suffix' | 'standalone';
//  /** What this keyword modifies, if applicable */
//  modifies?: 'function' | 'variable' | 'class' | 'field' | 'method';
//}

export type Keywords = {
  [K in CoreKeywordType]: string | null;
} & Record<string, string | null>;

// ============================================================================
// Type Constructor Declarations
// ============================================================================

export const CORE_TYPE_CONSTRUCTORS = [
  'boolean',
  'string',
  'signed',
  'unsigned',
  'option',
  'list',
  'map',
  'set',
  'function',
  'tuple',
  'union',
  'intersection',
  'reference',
  'promise',
  'entity'
] as const;

export type CoreTypeConstructor = (typeof CORE_TYPE_CONSTRUCTORS)[number];

export interface TypeConstructorDeclaration {
  /** Template function to render this type given inner types */
  template: string | ((...innerTypes: LanguageType[]) => string);
  /** Stub (example/temporary/default) value for this type */
  stub: string | ((...innerTypes: LanguageType[]) => string);
  /** Import path if this type requires an import */
  importPath?: string;
}

export type TypeConstructors = {
  [K in CoreTypeConstructor]: TypeConstructorDeclaration | null;
} & Record<string, TypeConstructorDeclaration | null>;

// ============================================================================
// Block Syntax Declaration
// ============================================================================

export interface BlockSyntaxDeclaration {
  /** Opening delimiter for blocks */
  blockOpen: string;
  /** Closing delimiter for blocks */
  blockClose: string;
  /** Whether the language uses implicit return (expression-based) */
  blockImplicitReturn: boolean;
  /** Separator between statements */
  blockStatementSeparator: string;
}

// ============================================================================
// Composition Templates
// ============================================================================

export interface CompositionTemplate {
  /** Template source using preprocessed EJS syntax */
  source: string;
  /** Whitespace handling: 'preserve', 'trim', 'compact' */
  whitespace?: 'preserve' | 'trim' | 'compact';
}

export interface CompositionTemplates {
  functionSignature: CompositionTemplate;
  functionParams: CompositionTemplate;
  parameter: CompositionTemplate;
  functionDefinition: CompositionTemplate;
  typeDefinition: CompositionTemplate;
  interfaceDefinition: CompositionTemplate;
  enumDefinition: CompositionTemplate;
  importStatement: CompositionTemplate;
  /** Template for wrapping parameters in an object (e.g., `data: { name: string }`) */
  objectWrappedParams: CompositionTemplate;
}

// ============================================================================
// Complete Language Declaration
// ============================================================================

/**
 * Layer 1: Declarative Language Declaration
 *
 * This is what users write. It describes the language structure
 * without specifying how to generate code.
 */
export interface LanguageDeclaration extends LanguageIdentity {
  /** Syntax definitions */
  syntax: BlockSyntaxDeclaration & {
    paramsOpen: string;
    paramsSeparator: string;
    paramsClose: string;
    propertyNameSeparator: string;
    functionReturnTypeSeparator: string;
    /** Keyword mappings (null means unsupported) */
    keywords: Keywords;
    /** Type constructor templates */
    types: TypeConstructors;
    /** Function variants (async, unsafe, etc.) */
    /** Composition templates for code generation */
    composition: CompositionTemplates;
  };
}

// ============================================================================
// Template Rendering (Runtime)
// ============================================================================

import { mejs } from '../../bobbin/index.js';
import type { LanguageMethod } from '../method.js';
import deepmerge from 'deepmerge';

// ============================================================================
// Type Factory Generation
// ============================================================================

/**
 * Applies a type constructor template.
 *
 * For simple string templates, does variable substitution.
 * For function templates (advanced constructors), calls the function.
 */
function applyTypeTemplate(
  template: string | ((...args: LanguageType[]) => string),
  args: LanguageType[] = []
): string {
  if (typeof template === 'function') {
    // Advanced constructor with function template
    return template(...args);
  }

  // Simple string template with {{var}} substitution
  return template;
}

/**
 * Creates a TypeFactory from type constructor declarations.
 *
 * This generates a class that implements TypeFactory by interpreting
 * the type constructor templates (e.g., `Vec<{{T}}>`).
 */
function createTypeFactoryFromConstructors<T extends LanguageType>(
  syntax: LanguageDeclaration['syntax']
): TypeFactory<T> {
  const ctors = syntax.types;
  function createPrimitive(raw: TypeConstructorDeclaration | null): T {
    if (!raw) throw new Error('Invalid type constructor');
    const name = applyTypeTemplate(raw.template, []);
    const stub = applyTypeTemplate(raw.stub, []);
    return new LanguageType(name, stub, true) as T;
  }
  function createWrapper(raw: TypeConstructorDeclaration, ...innerTypes: LanguageType[]): T {
    const name = applyTypeTemplate(raw.template, innerTypes);
    const stub = applyTypeTemplate(raw.stub, innerTypes);
    return new LanguageType(name, stub, true) as T;
  }
  // Build primitive types - these could also come from declarations
  // For now, use defaults (these are primitive and don't vary much by language)
  const boolean = createPrimitive(ctors.boolean);
  const string = createPrimitive(ctors.string);
  const signed = ctors.signed && createPrimitive(ctors.signed);
  const unsigned = ctors.unsigned && createPrimitive(ctors.unsigned);
  const number = createPrimitive(ctors.number ?? ctors.signed ?? ctors.unsigned);
  const void_ = ctors.void && createPrimitive(ctors.void);

  if (!ctors.array || !boolean || !string || !void_ || !(signed || number || unsigned)) {
    throw new Error(`Invalid type constructors: ${JSON.stringify(ctors)}`);
  }

  return {
    boolean,
    string,
    signed,
    unsigned,
    number,
    void: void_,

    property: function (name: string, innerType: T): T {
      const stub = (innerType: LanguageType) =>
        `${name}${syntax.propertyNameSeparator}${innerType.stub}`;
      return new LanguageType(name, stub, false, [innerType]) as T;
    },

    class: function (name: string, propertiesMap: Record<string, T>): T {
      const propertyCtor = this.property?.bind(this);
      if (!ctors.class || !propertyCtor)
        throw new Error('No class type constructor in this language!');
      const properties: LanguageType[] = Object.entries(propertiesMap).map(([k, t]) =>
        propertyCtor(k, t)
      );
      const classType: LanguageType = new LanguageType(
        name,
        () => classType.name.toString(),
        false,
        properties
      );
      return classType as T;
    },

    object: function (...innerProperties: T[]): T {
      if (!ctors.object) throw new Error('No object type constructor in this language!');
      return createWrapper(ctors.object, ...innerProperties);
    },

    // THIS DOESN'T MAKE THEORETICAL SENSE
    //function: function (name: string, params: T[], returnType: T): T {
    //  if (!ctors.function) throw new Error('No function type constructor in this language!');
    //  const fnType: LanguageType = new LanguageType(
    //    name,
    //    () => fnType.name.toString(),
    //    false,
    //    [...params, returnType]
    //  );
    //  return fnType as T;
    //},

    array: createWrapper.bind(null, ctors.array),

    optional: ctors.optional && createWrapper.bind(null, ctors.optional),

    promise: ctors.promise && createWrapper.bind(null, ctors.promise),

    result: ctors.result && createWrapper.bind(null, ctors.result),

    entity(name: string, importPath?: string): T {
      // Create entity type with isEntity flag and import path
      const stub = ctors.entity?.stub ?? 'Default::default()';
      const stubValue = typeof stub === 'function' ? stub() : stub;
      return new LanguageType(
        name,
        stubValue,
        false,      // not primitive
        [],         // no inner types
        true,       // isEntity
        importPath  // may be undefined, resolved later
      ) as T;
    },

    fromTsType(tsType: string, isCollection: boolean): T {
      // Handle TypeScript array syntax: T[]
      let normalizedType = tsType.trim();
      let isArraySyntax = false;

      if (normalizedType.endsWith('[]')) {
        normalizedType = normalizedType.slice(0, -2).trim();
        isArraySyntax = true;
      }

      const finalIsCollection = isCollection || isArraySyntax;

      const baseType = (() => {
        switch (normalizedType.toLowerCase()) {
          case 'string':
            return this.string;
          case 'number':
            return this.number;
          case 'boolean':
          case 'bool':
            return this.boolean;
          case 'void':
            return this.void;
          default:
            // Treat unknown types as entity references
            // Import path will be resolved during import collection
            return this.entity(normalizedType);
        }
      })();

      return finalIsCollection ? this.array(baseType) : baseType;
    }
  };
}

// ============================================================================
// Compilation Interface
// ============================================================================

/**
 * Compiles a declarative language definition to an executive language definition.
 *
 * This is the bridge from Layer 1 (Declarative) to Layer 2 (Executive).
 *
 * @param declaration - The declarative language definition
 * @returns Executive language definition compatible with declareLanguage
 */
export function compileToImperative<T extends LanguageDeclaration = LanguageDeclaration>(
  declarationInput: T
): Partial<LanguageDefinitionImperative> {
  let declaration = deepmerge({}, commonLanguageDeclaration);
  declaration = deepmerge(declaration, declarationInput);
  // Merge with defaults to fill in any missing conventions
  const naming: NamingConventions = declaration.conventions.naming;

  // Create type factory from constructors
  const types = createTypeFactoryFromConstructors(declaration.syntax);

  // Build rendering config from composition templates
  const composition = declaration.syntax.composition;

  // Build language context (available in all template renders)
  const languageContext = {
    ...declaration.syntax,
    // Naming conventions - full config available for contextual usage
    naming,
    types,

    // Template helpers - use appropriate convention based on context
    formatName
  };

  const rendering: LanguageRenderingConfig = {
    // Parameters use parameter naming convention (falls back to variable, then snake)
    formatParam: (name: string, type: LanguageType) => {
      const formattedName = formatName(name, naming.parameter);
      return mejs.renderTemplate(composition.parameter.source, {
        ...languageContext,
        name: formattedName,
        type
      });
    },

    renderParams: (params: string[]) => {
      return mejs.renderTemplate(composition.functionParams.source, { ...languageContext, params });
    },

    functionSignature: (method: LanguageMethod) => {
      return mejs.renderTemplate(
        composition.functionSignature.source,
        method.asContextWith(languageContext)
      );
    },

    renderDefinition: (method: LanguageMethod) => {
      return mejs.renderTemplate(
        composition.functionDefinition.source,
        method.asContextWith(languageContext)
      );
    },

    renderImportStatement: (importSpec: string, modulePath: string) => {
      return mejs.renderTemplate(
        composition.importStatement.source,
        { importSpec, modulePath }
      );
    }

    //renderObjectWrappedParams: (method: LanguageMethod, objectParamName: string) => {
    //  // Build inner param list (the object type contents)
    //  const innerParamList = method.params
    //    .map((p: LanguageParam) => {
    //      const optMarker = p.optional ? '?' : '';
    //      return `${p.formattedName}${optMarker}: ${p.langType}`;
    //    })
    //    .join(', ');

    //  const context = {
    //    ...languageContext,
    //    objectParamName,
    //    innerParamList,
    //    params: method.params
    //  };

    //  return mejs.renderTemplate(composition.objectWrappedParams.source, context);
    //}
  };

  // Build code generation config
  const codeGen: LanguageCodeGenConfig<LanguageType> = {
    types,
    rendering
  };

  // Build partial language definition
  // Note: warp config must be provided by the caller as it requires
  // runtime classes (ExternalLayer, CoreRing, Spiraler)
  const imperativeConfig: Partial<LanguageDefinitionImperative> = {
    name: declaration.name,
    extensions: declaration.extensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)),
    codeGen
  };

  // 🌀 ARCHITECTURAL GUARDRAIL 🌀
  // Prevent direct access to syntax from imperative layer.
  // This enforces the two-layer architecture where syntax templates
  // are compiled into rendering methods, not accessed directly.
  Object.defineProperty(imperativeConfig, 'syntax', {
    get: () => {
      throw new Error(
        '\n🌀 ARCHITECTURAL VIOLATION 🌀\n\n' +
        'Attempted to access "lang.syntax" from the imperative layer.\n\n' +
        'The imperative layer (LanguageDefinitionImperative) does NOT have\n' +
        'direct access to syntax templates. Templates are compiled into\n' +
        'rendering methods at build time.\n\n' +
        '❌ WRONG:\n' +
        '  lang.syntax.composition.importStatement.source\n\n' +
        '✅ CORRECT:\n' +
        '  lang.codeGen.rendering.renderImportStatement(spec, path)\n\n' +
        'To add a new feature:\n' +
        '1. Add template to LanguageDeclaration.syntax.composition.*\n' +
        '2. Add method to LanguageRenderingConfig\n' +
        '3. Compile in compileToImperative()\n' +
        '4. Use rendering method at runtime\n\n' +
        'See: machinery/reed/language/README.md\n'
      );
    },
    enumerable: false,
    configurable: false
  });

  return imperativeConfig;
}

// ============================================================================
// Well-Known Core Types
// ============================================================================

export const commonLanguageTypes: TypeConstructors = {
  boolean: {
    template: 'boolean',
    stub: 'false'
  },
  string: {
    template: 'string',
    stub: '""'
  },
  signed: {
    template: 'number',
    stub: '0'
  },
  unsigned: {
    template: 'number',
    stub: '0'
  },
  property: {
    template: (T: LanguageType) => `{{name}}{{propertyNameSeparator}}${T}`,
    stub: (T: LanguageType) => `{{name}}{{propertyNameSeparator}}${T.stub}`
  },
  option: null,
  list: null,
  map: null,
  set: null,
  function: null,
  tuple: null,
  union: null,
  intersection: null,
  reference: null,
  promise: null,
  entity: {
    template: (T: LanguageType) => T.name.toString(),
    stub: 'Default::default()'
  }
};

export const commonLanguageDeclaration: LanguageDeclaration = {
  name: 'common',
  extensions: [],
  conventions: {
    naming: DEFAULT_NAMING_CONVENTIONS
  },
  syntax: {
    keywords: {
      function: 'function',
      variable: 'var',
      constant: 'const',
      type: 'type',
      class: 'class',
      interface: 'interface',
      enum: 'enum',
      namespace: 'namespace',
      public: 'public',
      private: 'private',
      protected: 'protected',
      internal: 'internal',
      static: 'static',
      abstract: 'abstract',
      final: 'final',
      override: 'override',
      if: 'if',
      else: 'else',
      for: 'for',
      while: 'while',
      do: 'do',
      break: 'break',
      continue: 'continue',
      return: 'return',
      switch: 'switch',
      case: 'case',
      default: 'default',
      import: 'import',
      export: 'export',
      from: 'from',
      async: 'async',
      await: 'await',
      try: 'try',
      catch: 'catch',
      finally: 'finally',
      throw: 'throw',
      new: 'new',
      delete: 'delete',
      this: 'this',
      super: 'super',
      null: 'null',
      true: 'true',
      false: 'false',
      undefined: 'undefined'
    },
    types: commonLanguageTypes,
    blockOpen: '{',
    blockClose: '}',
    blockImplicitReturn: false,
    blockStatementSeparator: ';',
    paramsOpen: '(',
    paramsSeparator: ', ',
    paramsClose: ')',
    propertyNameSeparator: ': ',
    functionReturnTypeSeparator: ': ',
    composition: {
      functionSignature: {
        source:
          '{{ prependedKeywords }} {{keywords.function}} {{name}}{{generics}}{{params}}{% if returnType %}{{functionReturnTypeSeparator}}{{returnType}}{% endif %}'
      },
      parameter: {
        source: '{{name}}: {{type}}'
      },
      functionParams: {
        source: '{{ paramsOpen }}{{ params.join(paramsSeparator) }}{{ paramsClose }}'
      },
      functionDefinition: {
        source: '{{signature}} {{blockOpen}}\n{{body}}\n{{blockClose}}'
      },
      typeDefinition: {
        source:
          '{% if isExport %}export {% endif %}{% if isAbstract %}abstract {% endif %}class {{name}}{% if generics %}{{generics}}{% endif %}{% if base %} extends {{base}}{% endif %} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim'
      },
      interfaceDefinition: {
        source:
          '{% if isExport %}export {% endif %}interface {{name}}{{generics}} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim'
      },
      enumDefinition: {
        source:
          '{% if isExport %}export {% endif %}enum {{name}} {{blockOpen}}{{variants}}{{blockClose}}',
        whitespace: 'trim'
      },
      importStatement: {
        source: 'import {{importSpec}} from {{modulePath}};',
        whitespace: 'trim'
      },
      objectWrappedParams: {
        source: '{{objectParamName}}: { {{innerParamList}} }',
        whitespace: 'trim'
      }
    }
  }
};
