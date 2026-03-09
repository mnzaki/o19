/**
 * Declarative Language Schema 🌾
 *
 * Layer 1: Declarative language definition system.
 * Describes what a language IS, not how to generate code.
 *
 * The declarative layer compiles to the executive layer (executive.ts),
 * which handles actual code generation.
 *
 * @module machinery/reed/language/declarative
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
  'promise'
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

    //entity(name: string): LanguageType {
    //  return new LanguageType(name, `Default::default()`, false, true);
    //},

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
            throw new Error('wtf');
          //return this.entity(normalizedType);
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
export function compileToExecutive<T extends LanguageDeclaration = LanguageDeclaration>(
  declaration: T
): Partial<LanguageDefinitionImperative> {
  // Merge with defaults to fill in any missing conventions
  const naming: NamingConventions = {
    ...DEFAULT_NAMING_CONVENTIONS,
    ...declaration.conventions.naming
  };

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
  return {
    name: declaration.name,
    extensions: declaration.extensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)),
    codeGen
  };
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
  promise: null
};

export const commonLanguageDeclaration: LanguageDeclaration = {
  name: 'common',
  extensions: [],
  conventions: {
    naming: {
      function: 'snake_case',
      type: 'PascalCase',
      variable: 'snake_case',
      const: 'SCREAMING_SNAKE',
      module: 'snake_case',
      field: 'snake_case',
      method: 'snake_case',
      parameter: 'snake_case',
      generic: 'PascalCase'
    }
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
        source: '{{ paramsOpen }}{{ params.join(paramSeparator) }}{{ paramsClose }}'
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

/**
 * C-Family language declaration.
 * Base for Rust, TypeScript, C++, Java, etc.
 */
export const cFamilyLanguageDeclaration: LanguageDeclaration = {
  ...commonLanguageDeclaration,
  name: 'c_family',
  extends: 'common',
  extensions: ['.c', '.h'],
  conventions: {
    naming: {
      ...commonLanguageDeclaration.conventions.naming
    }
  },
  syntax: {
    ...commonLanguageDeclaration.syntax
  }
};
