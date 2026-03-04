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
  LanguageDefinition,
  LanguageRenderingConfig,
  LanguageCodeGenConfig,
  NamingConventions,
  NamingCase,
  LanguageMethod,
  TransformEnhancer
} from './imperative.js';
import { DEFAULT_NAMING_CONVENTIONS } from './imperative.js';
import { LanguageType } from './types.js';
import type { LanguageParam, TypeFactory } from './types.js';
import { toSnakeCase, camelCase, pascalCase } from '../../stringing.js';

// ============================================================================
// Core Keyword Types (Well-Known)
// ============================================================================

export const CORE_KEYWORD_TYPES = [
  // Declarations
  'function',
  'variable',
  'mutableVariable',
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

export interface KeywordDeclaration {
  /** The actual keyword text (e.g., 'fn', 'function', 'def') */
  keyword: string;
  /** Whether this keyword is reserved and cannot be used as an identifier */
  isReserved: boolean;
  /** Category of keyword */
  category:
    | 'declaration'
    | 'statement'
    | 'expression'
    | 'visibility'
    | 'modifier'
    | 'control'
    | 'module'
    | 'literal';
  /** Position in syntax */
  position: 'prefix' | 'suffix' | 'standalone';
  /** What this keyword modifies, if applicable */
  modifies?: 'function' | 'variable' | 'class' | 'field' | 'method';
}

export type Keywords = {
  [K in CoreKeywordType]: KeywordDeclaration | null;
} & Record<string, KeywordDeclaration | null>;

// ============================================================================
// Type Constructor Declarations
// ============================================================================

export const CORE_TYPE_CONSTRUCTORS = [
  'optional',
  'array',
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
  /** Strategy for constructing the type */
  strategy: 'wrapper' | 'suffix' | 'prefix' | 'union' | 'intersection' | 'function' | 'tuple';
  /** Template string with placeholders like {{T}}, {{K}}, {{V}} */
  template: string;
  /** Import path if this type requires an import */
  importPath: string | null;
  /** Whether this type always requires an import */
  requiresImport: boolean;
}

export type TypeConstructors = {
  [K in CoreTypeConstructor]: TypeConstructorDeclaration | null;
} & Record<string, TypeConstructorDeclaration | null>;

// ============================================================================
// Function Variant Declarations
// ============================================================================

export interface FunctionVariantDeclaration {
  /** Whether this variant is supported */
  supported: boolean;
  /** Keyword used for this variant (e.g., 'async', 'unsafe') */
  keyword?: string;
  /** Position of the keyword relative to function */
  position: 'before' | 'after' | 'around';
  /** Additional syntax required */
  syntax?: string;
}

// ============================================================================
// Block Syntax Declaration
// ============================================================================

export interface BlockSyntaxDeclaration {
  /** Opening delimiter for blocks */
  open: string;
  /** Closing delimiter for blocks */
  close: string;
  /** Whether the language uses implicit return (expression-based) */
  implicitReturn: boolean;
  /** Separator between statements */
  statementSeparator: string;
}

// ============================================================================
// Composition Templates
// ============================================================================

export interface CompositionTemplate {
  /** Template source using preprocessed EJS syntax */
  source: string;
  /** Whitespace handling: 'preserve', 'trim', 'compact' */
  whitespace: 'preserve' | 'trim' | 'compact';
}

export interface CompositionTemplates {
  functionSignature: CompositionTemplate;
  parameter: CompositionTemplate;
  functionDefinition: CompositionTemplate;
  typeDefinition: CompositionTemplate;
  interfaceDefinition: CompositionTemplate;
  enumDefinition: CompositionTemplate;
  importStatement: CompositionTemplate;
}

// ============================================================================
// Language Identity
// ============================================================================

export interface LanguageIdentity {
  /** Language name (e.g., 'typescript', 'rust', 'kotlin') */
  name: string;
  /** Parent language to inherit from (e.g., 'c_family') */
  extends?: string;
  /** File extensions associated with this language */
  extensions: string[];
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
export interface LanguageDeclaration {
  /** Language identity and inheritance */
  identity: LanguageIdentity;

  /** Naming conventions for the language */
  conventions: {
    naming: NamingConventions;
  };

  /** Syntax definitions */
  syntax: {
    /** Keyword mappings (null means unsupported) */
    keywords: Keywords;
    /** Type constructor templates */
    types: TypeConstructors;
    /** Function variants (async, unsafe, etc.) */
    variants: Record<string, FunctionVariantDeclaration>;
    /** Block syntax configuration */
    blocks: BlockSyntaxDeclaration;
    /** Composition templates for code generation */
    composition: CompositionTemplates;
  };

  /**
   * Optional custom transform enhancers.
   * These are passed through to the executive layer's transform pipeline.
   */
  enhancers?: TransformEnhancer[];
}

/**
 * Input for declaring a language. Allows partial declarations
 * when extending an existing language.
 */
export interface LanguageDeclarationInput {
  identity: LanguageIdentity;
  conventions?: Partial<LanguageDeclaration['conventions']>;
  syntax?: Partial<LanguageDeclaration['syntax']>;
}

// ============================================================================
// Template Rendering (Runtime)
// ============================================================================

import ejs from 'ejs';
import { preprocessTemplate } from '../../bobbin/mejs.js';

/**
 * Renders a template with data at runtime.
 *
 * This function:
 * 1. Preprocesses the template (custom syntax → EJS)
 * 2. Renders with EJS and data
 * 3. Returns the result
 *
 * Used by executive functions to render declarative templates.
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  // Import preprocessor and EJS at runtime

  // Preprocess: custom syntax → EJS
  const ejsTemplate = preprocessTemplate(template);

  // Render with EJS
  return ejs.render(ejsTemplate, data, {
    escape: (str: string) => str // No escaping for code generation
  });
}

/**
 * Formats a name according to naming convention.
 * Uses utilities from machinery/stringing.ts
 */
function formatName(name: string, convention: NamingCase | null | undefined): string {
  if (!convention) return name;

  switch (convention) {
    case 'snake_case':
      return toSnakeCase(name);
    case 'camelCase':
      return camelCase(name);
    case 'PascalCase':
      return pascalCase(name);
    case 'SCREAMING_SNAKE':
      return toSnakeCase(name).toUpperCase();
    case 'kebab-case':
      return toSnakeCase(name).replace(/_/g, '-');
    default:
      return name;
  }
}

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
  template: string | ((...args: string[]) => string),
  vars: Record<string, string>
): string {
  if (typeof template === 'function') {
    // Advanced constructor with function template
    const args = Object.values(vars);
    return template(...args);
  }

  // Simple string template with {{var}} substitution
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Creates a TypeFactory from type constructor declarations.
 *
 * This generates a class that implements TypeFactory by interpreting
 * the type constructor templates (e.g., `Vec<{{T}}>`).
 */
function createTypeFactoryFromConstructors(
  constructors: TypeConstructors
): TypeFactory<LanguageParam, LanguageType> {
  // Build primitive types - these could also come from declarations
  // For now, use defaults (these are primitive and don't vary much by language)
  const boolean = new LanguageType('bool', 'false', true);
  const string = new LanguageType('String', 'String::new()', true);
  const number = new LanguageType('i64', '0', true);
  const void_ = new LanguageType('()', '()', true);

  return {
    boolean,
    string,
    number,
    void: void_,

    array(itemType: LanguageType): LanguageType {
      const ctor = constructors.array;
      if (ctor?.template) {
        const name = applyTypeTemplate(ctor.template, { T: itemType.name });
        // Stub return uses the type's known values or a generic constructor
        const stub = name.includes('null') ? 'null' : `${name}::new()`;
        return new LanguageType(name, stub);
      }
      // Default: Array<T>
      return new LanguageType(`${itemType.name}[]`, '[]');
    },

    optional(innerType: LanguageType): LanguageType {
      const ctor = constructors.optional;
      if (ctor?.template) {
        const name = applyTypeTemplate(ctor.template, { T: innerType.name });
        const stub = name.includes('null') ? 'null' : `${name}::default()`;
        return new LanguageType(name, stub);
      }
      // Default: T | null
      return new LanguageType(`${innerType.name} | null`, 'null');
    },

    promise(innerType: LanguageType): LanguageType {
      const ctor = constructors.promise;
      if (ctor?.template) {
        const name = applyTypeTemplate(ctor.template, { T: innerType.name });
        return new LanguageType(name, 'Promise.resolve()');
      }
      // Default: Promise<T>
      return new LanguageType(`Promise<${innerType.name}>`, 'Promise.resolve()');
    },

    result(okType: LanguageType, errType?: string | LanguageType): LanguageType {
      const errName = typeof errType === 'string' ? errType : (errType?.name ?? 'Error');
      // TODO: Use result constructor when added to core
      return new LanguageType(`Result<${okType.name}, ${errName}>`, 'Ok(Default::default())');
    },

    entity(name: string): LanguageType {
      return new LanguageType(name, `Default::default()`, false, true);
    },

    fromTsType(tsType: string, isCollection: boolean): LanguageType {
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
export function compileToExecutive<T extends LanguageDeclaration = LanguageDeclaration>(
  declaration: T
): Partial<LanguageDefinition> {
  // Merge with defaults to fill in any missing conventions
  const naming: NamingConventions = {
    ...DEFAULT_NAMING_CONVENTIONS,
    ...declaration.conventions.naming
  };

  // Create type factory from constructors
  const types = createTypeFactoryFromConstructors(declaration.syntax.types);

  // Build rendering config from composition templates
  const composition = declaration.syntax.composition;

  // Build language context (available in all template renders)
  const languageContext = {
    // Naming conventions - full config available for contextual usage
    naming,

    // Block syntax
    blocks: declaration.syntax.blocks,

    // Keywords (for conditional logic in templates)
    keywords: declaration.syntax.keywords,

    // Template helpers - use appropriate convention based on context
    formatName: (name: string, convention?: NamingCase) => formatName(name, convention)
  };

  const rendering: LanguageRenderingConfig = {
    naming,
    // Parameters use parameter naming convention (falls back to variable, then snake)
    formatParamName: (name: string) =>
      formatName(name, naming.parameter ?? naming.variable ?? 'snake_case'),

    functionSignature: (method: LanguageMethod) => {
      // Build template context: language context + method data
      const context = {
        ...languageContext,
        method: {
          name: method.name,
          snakeName: method.snakeName,
          camelName: method.camelName,
          pascalName: pascalCase(method.name),
          // Naming helpers for templates
          get names() {
            return {
              snake: toSnakeCase(method.name),
              camel: camelCase(method.name),
              pascal: pascalCase(method.name),
              screaming: toSnakeCase(method.name).toUpperCase(),
              kebab: toSnakeCase(method.name).replace(/_/g, '-')
            };
          },
          params: method.params,
          paramList: method.params
            .map((p: LanguageParam) => `${p.formattedName}: ${p.langType}`)
            .join(', '),
          returnType: method.returnTypeDef?.name ?? 'void'
        },
        // Convenience accessors
        name: method.name,
        snakeName: method.snakeName,
        camelName: method.camelName,
        params: method.params
          .map((p: LanguageParam) => `${p.formattedName}: ${p.langType}`)
          .join(', '),
        returnType: method.returnTypeDef?.name ?? 'void'
      };

      return renderTemplate(composition.functionSignature.source, context);
    },

    asyncFunctionSignature: (method: LanguageMethod) => {
      // Check if async is supported
      const asyncVariant = declaration.syntax.variants.async;
      if (!asyncVariant?.supported) {
        // Fall back to regular signature
        return rendering.functionSignature!(method);
      }

      const context = {
        ...languageContext,
        method: {
          name: method.name,
          snakeName: method.snakeName,
          camelName: method.camelName,
          pascalName: pascalCase(method.name),
          // Naming helpers for templates
          get names() {
            return {
              snake: toSnakeCase(method.name),
              camel: camelCase(method.name),
              pascal: pascalCase(method.name),
              screaming: toSnakeCase(method.name).toUpperCase(),
              kebab: toSnakeCase(method.name).replace(/_/g, '-')
            };
          },
          params: method.params,
          paramList: method.params
            .map((p: LanguageParam) => `${p.formattedName}: ${p.langType}`)
            .join(', '),
          returnType: method.returnTypeDef?.name ?? 'void'
        },
        name: method.name,
        snakeName: method.snakeName,
        camelName: method.camelName,
        params: method.params
          .map((p: LanguageParam) => `${p.formattedName}: ${p.langType}`)
          .join(', '),
        returnType: method.returnTypeDef?.name ?? 'void',
        // Async variant flag for template conditional
        isAsync: true
      };

      return renderTemplate(composition.functionSignature.source, context);
    },

    renderDefinition: (
      method: LanguageMethod,
      opts: {
        public?: boolean;
        private?: boolean;
        protected?: boolean;
        static?: boolean;
        async?: boolean;
      }
    ) => {
      const signature = rendering.functionSignature!(method);

      const context = {
        ...languageContext,
        method: {
          name: method.name,
          snakeName: method.snakeName,
          camelName: method.camelName,
          pascalName: pascalCase(method.name),
          // Naming helpers for templates
          get names() {
            return {
              snake: toSnakeCase(method.name),
              camel: camelCase(method.name),
              pascal: pascalCase(method.name),
              screaming: toSnakeCase(method.name).toUpperCase(),
              kebab: toSnakeCase(method.name).replace(/_/g, '-')
            };
          },
          params: method.params,
          paramList: method.params
            .map((p: LanguageParam) => `${p.formattedName}: ${p.langType}`)
            .join(', '),
          returnType: method.returnTypeDef?.name ?? 'void'
        },
        signature,
        // Variant flags for template conditionals
        opts,
        isPublic: opts.public ?? false,
        isPrivate: opts.private ?? false,
        isProtected: opts.protected ?? false,
        isStatic: opts.static ?? false,
        isAsync: opts.async ?? false
      };

      return renderTemplate(composition.functionDefinition.source, context);
    }
  };

  // Build code generation config
  const codeGen: LanguageCodeGenConfig<LanguageParam, LanguageType> = {
    fileExtensions: declaration.identity.extensions.map((ext) =>
      ext.startsWith('.') ? `${ext}.ejs` : `.${ext}.ejs`
    ),
    types,
    rendering
  };

  // Build partial language definition
  // Note: warp config must be provided by the caller as it requires
  // runtime classes (ExternalLayer, CoreRing, Spiraler)
  return {
    name: declaration.identity.name,
    codeGen
  };
}

// ============================================================================
// Well-Known Core Types
// ============================================================================

export const commonLanguageDeclaration: LanguageDeclaration = {
  identity: {
    name: 'common',
    extensions: []
  },
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
      function: {
        keyword: 'function',
        isReserved: true,
        category: 'declaration',
        position: 'prefix'
      },
      variable: { keyword: 'const', isReserved: true, category: 'declaration', position: 'prefix' },
      mutableVariable: {
        keyword: 'let',
        isReserved: true,
        category: 'declaration',
        position: 'prefix'
      },
      constant: { keyword: 'const', isReserved: true, category: 'declaration', position: 'prefix' },
      type: { keyword: 'type', isReserved: true, category: 'declaration', position: 'prefix' },
      class: { keyword: 'class', isReserved: true, category: 'declaration', position: 'prefix' },
      interface: {
        keyword: 'interface',
        isReserved: true,
        category: 'declaration',
        position: 'prefix'
      },
      enum: { keyword: 'enum', isReserved: true, category: 'declaration', position: 'prefix' },
      namespace: {
        keyword: 'namespace',
        isReserved: true,
        category: 'declaration',
        position: 'prefix'
      },
      public: { keyword: 'public', isReserved: true, category: 'visibility', position: 'prefix' },
      private: { keyword: 'private', isReserved: true, category: 'visibility', position: 'prefix' },
      protected: {
        keyword: 'protected',
        isReserved: true,
        category: 'visibility',
        position: 'prefix'
      },
      internal: {
        keyword: 'internal',
        isReserved: true,
        category: 'visibility',
        position: 'prefix'
      },
      static: {
        keyword: 'static',
        isReserved: true,
        category: 'modifier',
        position: 'prefix',
        modifies: 'function'
      },
      abstract: {
        keyword: 'abstract',
        isReserved: true,
        category: 'modifier',
        position: 'prefix',
        modifies: 'class'
      },
      final: {
        keyword: 'final',
        isReserved: true,
        category: 'modifier',
        position: 'prefix',
        modifies: 'class'
      },
      override: {
        keyword: 'override',
        isReserved: true,
        category: 'modifier',
        position: 'prefix',
        modifies: 'method'
      },
      if: { keyword: 'if', isReserved: true, category: 'control', position: 'prefix' },
      else: { keyword: 'else', isReserved: true, category: 'control', position: 'prefix' },
      for: { keyword: 'for', isReserved: true, category: 'control', position: 'prefix' },
      while: { keyword: 'while', isReserved: true, category: 'control', position: 'prefix' },
      do: { keyword: 'do', isReserved: true, category: 'control', position: 'prefix' },
      break: { keyword: 'break', isReserved: true, category: 'control', position: 'standalone' },
      continue: {
        keyword: 'continue',
        isReserved: true,
        category: 'control',
        position: 'standalone'
      },
      return: { keyword: 'return', isReserved: true, category: 'control', position: 'standalone' },
      switch: { keyword: 'switch', isReserved: true, category: 'control', position: 'prefix' },
      case: { keyword: 'case', isReserved: true, category: 'control', position: 'prefix' },
      default: { keyword: 'default', isReserved: true, category: 'control', position: 'prefix' },
      import: { keyword: 'import', isReserved: true, category: 'module', position: 'prefix' },
      export: { keyword: 'export', isReserved: true, category: 'module', position: 'prefix' },
      from: { keyword: 'from', isReserved: true, category: 'module', position: 'standalone' },
      async: {
        keyword: 'async',
        isReserved: true,
        category: 'modifier',
        position: 'prefix',
        modifies: 'function'
      },
      await: { keyword: 'await', isReserved: true, category: 'expression', position: 'prefix' },
      try: { keyword: 'try', isReserved: true, category: 'control', position: 'prefix' },
      catch: { keyword: 'catch', isReserved: true, category: 'control', position: 'prefix' },
      finally: { keyword: 'finally', isReserved: true, category: 'control', position: 'prefix' },
      throw: { keyword: 'throw', isReserved: true, category: 'control', position: 'standalone' },
      new: { keyword: 'new', isReserved: true, category: 'expression', position: 'prefix' },
      delete: { keyword: 'delete', isReserved: true, category: 'expression', position: 'prefix' },
      this: { keyword: 'this', isReserved: true, category: 'literal', position: 'standalone' },
      super: { keyword: 'super', isReserved: true, category: 'literal', position: 'standalone' },
      null: { keyword: 'null', isReserved: true, category: 'literal', position: 'standalone' },
      true: { keyword: 'true', isReserved: true, category: 'literal', position: 'standalone' },
      false: { keyword: 'false', isReserved: true, category: 'literal', position: 'standalone' },
      undefined: {
        keyword: 'undefined',
        isReserved: true,
        category: 'literal',
        position: 'standalone'
      }
    },
    types: {
      optional: {
        strategy: 'suffix',
        template: '{{T}} | null',
        importPath: null,
        requiresImport: false
      },
      array: {
        strategy: 'wrapper',
        template: 'Array<{{T}}>',
        importPath: null,
        requiresImport: false
      },
      map: {
        strategy: 'wrapper',
        template: 'Map<{{K}}, {{V}}>',
        importPath: null,
        requiresImport: false
      },
      set: { strategy: 'wrapper', template: 'Set<{{T}}>', importPath: null, requiresImport: false },
      function: {
        strategy: 'function',
        template: '({{Params}}) => {{Return}}',
        importPath: null,
        requiresImport: false
      },
      tuple: {
        strategy: 'tuple',
        template: '[{{Items}}]',
        importPath: null,
        requiresImport: false
      },
      union: {
        strategy: 'union',
        template: '{{T1}} | {{T2}}',
        importPath: null,
        requiresImport: false
      },
      intersection: {
        strategy: 'intersection',
        template: '{{T1}} & {{T2}}',
        importPath: null,
        requiresImport: false
      },
      reference: {
        strategy: 'prefix',
        template: 'typeof {{T}}',
        importPath: null,
        requiresImport: false
      },
      promise: {
        strategy: 'wrapper',
        template: 'Promise<{{T}}>',
        importPath: null,
        requiresImport: false
      }
    },
    variants: {
      async: { supported: true, keyword: 'async', position: 'before' },
      unsafe: { supported: false, position: 'before' },
      const: { supported: false, position: 'before' }
    },
    blocks: {
      open: '{',
      close: '}',
      implicitReturn: false,
      statementSeparator: ';'
    },
    composition: {
      functionSignature: {
        source:
          '{% if visibility %}{{visibility}} {% endif %}function {{name}}{{generics}}{{params}}{% if returnType %}: {{returnType}}{% endif %}',
        whitespace: 'trim'
      },
      parameter: {
        source: '{% if isOptional %}{{name}}?{% else %}{{name}}{% endif %}: {{type}}',
        whitespace: 'trim'
      },
      functionDefinition: {
        source: '{{signature}} {{blockOpen}}{{body}}{{blockClose}}',
        whitespace: 'trim'
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
  identity: {
    name: 'c_family',
    extends: 'common',
    extensions: ['.c', '.cpp', '.h', '.hpp', '.cs', '.java', '.rs', '.ts', '.kt', '.swift']
  },
  conventions: {
    naming: {
      ...commonLanguageDeclaration.conventions.naming
    }
  },
  syntax: {
    ...commonLanguageDeclaration.syntax,
    blocks: {
      ...commonLanguageDeclaration.syntax.blocks,
      open: '{',
      close: '}'
    }
  }
};
