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
  LanguageDefinitionConfig,
  NamingConventionConfig,
  LanguageRenderingConfig,
} from './executive.js';

// ============================================================================
// Core Keyword Types (Well-Known)
// ============================================================================

export const CORE_KEYWORD_TYPES = [
  // Declarations
  'function', 'variable', 'mutableVariable', 'constant',
  'type', 'class', 'interface', 'enum', 'namespace',
  // Visibility
  'public', 'private', 'protected', 'internal',
  // Modifiers
  'static', 'abstract', 'final', 'override',
  // Control Flow
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return',
  'switch', 'case', 'default',
  // Modules
  'import', 'export', 'from',
  // Special
  'async', 'await', 'try', 'catch', 'finally', 'throw',
  'new', 'delete', 'this', 'super',
  'null', 'true', 'false', 'undefined',
] as const;

export type CoreKeywordType = typeof CORE_KEYWORD_TYPES[number];

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
  category: 'declaration' | 'statement' | 'expression' | 'visibility' | 'modifier' | 'control' | 'module' | 'literal';
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
  'optional', 'array', 'map', 'set', 'function', 'tuple',
  'union', 'intersection', 'reference', 'promise',
] as const;

export type CoreTypeConstructor = typeof CORE_TYPE_CONSTRUCTORS[number];

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
// Naming Conventions
// ============================================================================

export type NamingCase = 'snake' | 'camel' | 'pascal' | 'screaming_snake' | 'kebab';

export type CoreConvention = 
  | 'function' | 'type' | 'variable' | 'const' | 'module'
  | 'field' | 'method' | 'parameter' | 'generic';

export type NamingConventions = {
  [K in CoreConvention]: NamingCase | null;
} & Record<string, NamingCase | null>;

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
// Compilation Interface
// ============================================================================

/**
 * Compiles a declarative language definition to an executive language definition.
 * 
 * This is the bridge from Layer 1 (Declarative) to Layer 2 (Executive).
 */
export function compileToExecutive(
  declaration: LanguageDeclaration
): LanguageDefinitionConfig {
  // Transform declarative naming conventions to executive format
  const naming: NamingConventionConfig = {
    function: declaration.conventions.naming.function ?? 'snake',
    type: declaration.conventions.naming.type ?? 'pascal',
    variable: declaration.conventions.naming.variable ?? 'snake',
    const: declaration.conventions.naming.const ?? 'screaming_snake',
    module: declaration.conventions.naming.module ?? 'snake',
  };

  // Build rendering config from composition templates
  const render: LanguageRenderingConfig = {
    formatParamName: (name: string) => name, // TODO: apply naming conventions
    functionSignature: () => '', // TODO: compile from template
    formatType: () => '', // TODO: compile from type constructors
    formatReturnType: () => '', // TODO: compile from type constructors
    renderParams: () => '', // TODO: compile from parameter template
  };

  return {
    name: declaration.identity.name,
    naming,
    render,
    stubs: { enabled: false },
  };
}

// ============================================================================
// Well-Known Core Types
// ============================================================================

export const commonLanguageDeclaration: LanguageDeclaration = {
  identity: {
    name: 'common',
    extensions: [],
  },
  conventions: {
    naming: {
      function: 'snake',
      type: 'pascal',
      variable: 'snake',
      const: 'screaming_snake',
      module: 'snake',
      field: 'snake',
      method: 'snake',
      parameter: 'snake',
      generic: 'pascal',
    },
  },
  syntax: {
    keywords: {
      function: { keyword: 'function', isReserved: true, category: 'declaration', position: 'prefix' },
      variable: { keyword: 'const', isReserved: true, category: 'declaration', position: 'prefix' },
      mutableVariable: { keyword: 'let', isReserved: true, category: 'declaration', position: 'prefix' },
      constant: { keyword: 'const', isReserved: true, category: 'declaration', position: 'prefix' },
      type: { keyword: 'type', isReserved: true, category: 'declaration', position: 'prefix' },
      class: { keyword: 'class', isReserved: true, category: 'declaration', position: 'prefix' },
      interface: { keyword: 'interface', isReserved: true, category: 'declaration', position: 'prefix' },
      enum: { keyword: 'enum', isReserved: true, category: 'declaration', position: 'prefix' },
      namespace: { keyword: 'namespace', isReserved: true, category: 'declaration', position: 'prefix' },
      public: { keyword: 'public', isReserved: true, category: 'visibility', position: 'prefix' },
      private: { keyword: 'private', isReserved: true, category: 'visibility', position: 'prefix' },
      protected: { keyword: 'protected', isReserved: true, category: 'visibility', position: 'prefix' },
      internal: { keyword: 'internal', isReserved: true, category: 'visibility', position: 'prefix' },
      static: { keyword: 'static', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
      abstract: { keyword: 'abstract', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'class' },
      final: { keyword: 'final', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'class' },
      override: { keyword: 'override', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'method' },
      if: { keyword: 'if', isReserved: true, category: 'control', position: 'prefix' },
      else: { keyword: 'else', isReserved: true, category: 'control', position: 'prefix' },
      for: { keyword: 'for', isReserved: true, category: 'control', position: 'prefix' },
      while: { keyword: 'while', isReserved: true, category: 'control', position: 'prefix' },
      do: { keyword: 'do', isReserved: true, category: 'control', position: 'prefix' },
      break: { keyword: 'break', isReserved: true, category: 'control', position: 'standalone' },
      continue: { keyword: 'continue', isReserved: true, category: 'control', position: 'standalone' },
      return: { keyword: 'return', isReserved: true, category: 'control', position: 'standalone' },
      switch: { keyword: 'switch', isReserved: true, category: 'control', position: 'prefix' },
      case: { keyword: 'case', isReserved: true, category: 'control', position: 'prefix' },
      default: { keyword: 'default', isReserved: true, category: 'control', position: 'prefix' },
      import: { keyword: 'import', isReserved: true, category: 'module', position: 'prefix' },
      export: { keyword: 'export', isReserved: true, category: 'module', position: 'prefix' },
      from: { keyword: 'from', isReserved: true, category: 'module', position: 'standalone' },
      async: { keyword: 'async', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
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
      undefined: { keyword: 'undefined', isReserved: true, category: 'literal', position: 'standalone' },
    },
    types: {
      optional: { strategy: 'suffix', template: '{{T}} | null', importPath: null, requiresImport: false },
      array: { strategy: 'wrapper', template: 'Array<{{T}}>', importPath: null, requiresImport: false },
      map: { strategy: 'wrapper', template: 'Map<{{K}}, {{V}}>', importPath: null, requiresImport: false },
      set: { strategy: 'wrapper', template: 'Set<{{T}}>', importPath: null, requiresImport: false },
      function: { strategy: 'function', template: '({{Params}}) => {{Return}}', importPath: null, requiresImport: false },
      tuple: { strategy: 'tuple', template: '[{{Items}}]', importPath: null, requiresImport: false },
      union: { strategy: 'union', template: '{{T1}} | {{T2}}', importPath: null, requiresImport: false },
      intersection: { strategy: 'intersection', template: '{{T1}} & {{T2}}', importPath: null, requiresImport: false },
      reference: { strategy: 'prefix', template: 'typeof {{T}}', importPath: null, requiresImport: false },
      promise: { strategy: 'wrapper', template: 'Promise<{{T}}>', importPath: null, requiresImport: false },
    },
    variants: {
      async: { supported: true, keyword: 'async', position: 'before' },
      unsafe: { supported: false, position: 'before' },
      const: { supported: false, position: 'before' },
    },
    blocks: {
      open: '{',
      close: '}',
      implicitReturn: false,
      statementSeparator: ';',
    },
    composition: {
      functionSignature: {
        source: '{% if visibility %}{{visibility}} {% endif %}function {{name}}{{generics}}{{params}}{% if returnType %}: {{returnType}}{% endif %}',
        whitespace: 'trim',
      },
      parameter: {
        source: '{% if isOptional %}{{name}}?{% else %}{{name}}{% endif %}: {{type}}',
        whitespace: 'trim',
      },
      functionDefinition: {
        source: '{{signature}} {{blockOpen}}{{body}}{{blockClose}}',
        whitespace: 'trim',
      },
      typeDefinition: {
        source: '{% if isExport %}export {% endif %}{% if isAbstract %}abstract {% endif %}class {{name}}{% if generics %}{{generics}}{% endif %}{% if base %} extends {{base}}{% endif %} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim',
      },
      interfaceDefinition: {
        source: '{% if isExport %}export {% endif %}interface {{name}}{{generics}} {{blockOpen}}{{members}}{{blockClose}}',
        whitespace: 'trim',
      },
      enumDefinition: {
        source: '{% if isExport %}export {% endif %}enum {{name}} {{blockOpen}}{{variants}}{{blockClose}}',
        whitespace: 'trim',
      },
      importStatement: {
        source: 'import {{importSpec}} from {{modulePath}};',
        whitespace: 'trim',
      },
    },
  },
};
