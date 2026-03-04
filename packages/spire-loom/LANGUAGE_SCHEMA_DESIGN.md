# Two-Layer Language Definition System

> "Declare structure, generate execution, weave code."

## Core Philosophy

Separate **semantic type** (what it means) from **syntax declaration** (how it looks).

```typescript
// SEMANTIC TYPE - what the system understands
type WellKnownKeywordType = 'function' | 'mutableVariable' | 'class' | ...

// KEYWORD DECLARATION - object describing the syntax
interface KeywordDeclaration {
  keyword: string        // The actual text: 'fn', 'function', 'def'
  isReserved: boolean    // Can it be an identifier?
  category: KeywordCategory
}

// USAGE: Core types required, can add extensions
type Keywords = {
  [K in CoreKeywordType]: KeywordDeclaration | null  // Required
} & Record<string, KeywordDeclaration | null>         // Extensions
```

---

## Core vs Extensions

### Core Keyword Types (Universal)

```typescript
type CoreKeywordType =
  // Declarations
  | 'function'           // Defines a function
  | 'variable'           // Immutable variable declaration
  | 'mutableVariable'    // Mutable variable declaration  
  | 'constant'           // Compile-time constant
  | 'type'               // Type alias/definition
  | 'class'              // Class definition
  | 'interface'          // Interface/trait/protocol
  | 'enum'               // Enumeration
  | 'namespace'          // Module/namespace
  
  // Visibility
  | 'public'             // Public access
  | 'private'            // Private access
  | 'protected'          // Protected access
  | 'internal'           // Package/module access
  
  // Modifiers
  | 'static'             // Static/class-level
  | 'abstract'           // Abstract/incomplete
  | 'final'              // Final/sealed/readonly
  | 'override'           // Override base
  
  // Control Flow
  | 'if' | 'else'
  | 'for' | 'while' | 'do'
  | 'break' | 'continue'
  | 'return'
  | 'switch' | 'case' | 'default'
  
  // Modules
  | 'import' | 'export' | 'from'
  
  // Special
  | 'async' | 'await'
  | 'try' | 'catch' | 'finally' | 'throw'
  | 'new' | 'delete' | 'this' | 'super'
  | 'null' | 'true' | 'false' | 'undefined'
```

---

## KeywordDeclaration Interface

```typescript
interface KeywordDeclaration {
  keyword: string
  isReserved: boolean
  category: 'declaration' | 'statement' | 'expression' | 'visibility' | 'modifier' | 'control' | 'module' | 'literal'
  position: 'prefix' | 'suffix' | 'standalone'
  modifies?: 'function' | 'variable' | 'class' | 'field' | 'method'
}
```

---

## Type Constructor Declarations

```typescript
type CoreTypeConstructor =
  | 'optional' | 'array' | 'map' | 'set' | 'function'
  | 'tuple' | 'union' | 'intersection' | 'reference' | 'promise'

interface TypeConstructorDeclaration {
  strategy: 'wrapper' | 'suffix' | 'prefix' | 'union' | 'intersection' | 'function' | 'tuple'
  template: string
  importPath: string | null
  requiresImport: boolean
}

type TypeConstructors = {
  [K in CoreTypeConstructor]: TypeConstructorDeclaration | null
} & Record<string, TypeConstructorDeclaration | null>
```

---

## Complete Type Definitions

```typescript
export const CORE_KEYWORD_TYPES = [
  'function', 'variable', 'mutableVariable', 'constant',
  'type', 'class', 'interface', 'enum', 'namespace',
  'public', 'private', 'protected', 'internal',
  'static', 'abstract', 'final', 'override',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return',
  'switch', 'case', 'default',
  'import', 'export', 'from',
  'async', 'await', 'try', 'catch', 'finally', 'throw',
  'new', 'delete', 'this', 'super',
  'null', 'true', 'false', 'undefined',
] as const

export type CoreKeywordType = typeof CORE_KEYWORD_TYPES[number]

type WellKnownKeywordType = CoreKeywordType
  | 'unsafe' | 'generator' | 'yield' | 'match' | 'guard' | 'defer' | 'where'

export type KeywordType = WellKnownKeywordType | string

interface KeywordDeclaration {
  keyword: string
  isReserved: boolean
  category: 'declaration' | 'statement' | 'expression' | 'visibility' | 'modifier' | 'control' | 'module' | 'literal'
  position: 'prefix' | 'suffix' | 'standalone'
  modifies?: 'function' | 'variable' | 'class' | 'field' | 'method'
}

type Keywords = {
  [K in CoreKeywordType]: KeywordDeclaration | null
} & Record<string, KeywordDeclaration | null>

export const CORE_TYPE_CONSTRUCTORS = [
  'optional', 'array', 'map', 'set', 'function', 'tuple',
  'union', 'intersection', 'reference', 'promise',
] as const

export type CoreTypeConstructor = typeof CORE_TYPE_CONSTRUCTORS[number]

type WellKnownTypeConstructor = CoreTypeConstructor
  | 'result' | 'box' | 'rc' | 'arc' | 'slice' | 'string' | 'stringSlice'

export type TypeConstructorType = WellKnownTypeConstructor | string

interface TypeConstructorDeclaration {
  strategy: 'wrapper' | 'suffix' | 'prefix' | 'union' | 'intersection' | 'function' | 'tuple'
  template: string
  importPath: string | null
  requiresImport: boolean
}

type TypeConstructors = {
  [K in CoreTypeConstructor]: TypeConstructorDeclaration | null
} & Record<string, TypeConstructorDeclaration | null>

interface FunctionVariantDeclaration {
  transform: VariantTransform[]
}

type VariantTransform =
  | { type: 'prefix_keyword'; keyword: string; position?: 'outermost' | 'before_fn_keyword' | 'after_fn_keyword' }
  | { type: 'suffix_keyword'; keyword: string }
  | { type: 'return_type_wrapper'; template: string }
  | { type: 'annotation'; syntax: string; position: 'before' | 'after' }
  | { type: 'modifier'; keyword: string }

export const CORE_VARIANTS = [
  'public', 'private', 'protected', 'internal',
  'static', 'abstract', 'final', 'override',
  'async'
] as const

export type CoreVariant = typeof CORE_VARIANTS[number]

type FunctionVariants = {
  [K in CoreVariant]: FunctionVariantDeclaration
} & Record<string, FunctionVariantDeclaration>

type NamingConvention = 
  | 'snake_case' | 'camelCase' | 'PascalCase' | 'SCREAMING_SNAKE'
  | 'kebab-case' | 'Train-Case' | 'flatcase' | 'MACRO_CASE'

interface NamingConventions {
  function: NamingConvention
  type: NamingConvention
  variable: NamingConvention
  const: NamingConvention
  module: NamingConvention
  interface: NamingConvention
  enum: NamingConvention
  enumMember: NamingConvention
  genericParam: NamingConvention
  privateMember: NamingConvention
}

interface Delimiters {
  paramOpen: string
  paramClose: string
  paramSeparator: string
  typeAnnotation: string
  returnIndicator: string | null
  genericOpen: string
  genericClose: string
  genericSeparator: string
  constraintSeparator: string
  unionSeparator: string
  intersectionSeparator: string
  arrayOpen: string
  arrayClose: string
  tupleOpen: string
  tupleClose: string
  objectOpen: string
  objectClose: string
  blockOpen: string
  blockClose: string
  blockContinuation: string | null
  memberAccess: string
  optionalAccess: string | null
  pointerDeref: string | null
  namespaceSeparator: string
  optionalIndicator: string | null
  slice: string | null
  statementTerminator: string | null
  lineComment: string | null
  blockCommentOpen: string | null
  blockCommentClose: string | null
}

interface Position {
  type: 'prefix' | 'postfix'
  returnType: 'prefix' | 'suffix' | 'none'
  visibility: 'prefix' | 'suffix'
  generics: 'before_name' | 'after_name' | 'after_params'
  constness: 'prefix_type' | 'suffix_type' | 'keyword'
  mutability: 'prefix_type' | 'suffix_type' | 'keyword'
  optional: 'suffix_name' | 'wrapper'
  variadic: 'prefix' | 'suffix'
}

interface SyntaxElements {
  keywords: Keywords
  delimiters: Delimiters
  position: Position
}

interface BlockStructure {
  style: 'braces' | 'indentation' | 'keywords' | 'offside_rule'
  braces: { opening: string; closing: string; placement: 'same_line' | 'new_line' } | null
  indentation: { char: 'space' | 'tab'; size: number; opening: string; continuation: string | null } | null
  keywords: { open: string; close: string } | null
  implicitReturn: boolean
  statementTerminator: string | null
  statementSeparator: string | null
  emptyBlock: 'pass_through' | 'keyword' | 'comment'
  emptyBlockKeyword: string | null
}

interface SelfParameter {
  instanceMethods: string | null
  classMethods: string | null
  staticMethods: null
}

interface Template {
  source: string
  whitespace: 'preserve' | 'trim' | 'dedent'
}

interface CompositionTemplates {
  functionSignature: Template
  parameter: Template
  functionDefinition: Template
  typeDefinition: Template
  interfaceDefinition: Template
  enumDefinition: Template
  importStatement: Template
}

interface LanguageIdentity {
  name: string
  extends: string | null
  extensions: string[]
  family: 'c_style' | 'lisp' | 'ml' | 'pythonic' | 'curly_brace' | null
}

interface LanguageDeclaration {
  identity: LanguageIdentity
  conventions: {
    naming: NamingConventions
  }
  syntax: {
    elements: SyntaxElements
    types: TypeConstructors
    variants: FunctionVariants
    blocks: BlockStructure
    selfParameter: SelfParameter
    composition: CompositionTemplates
  }
}
```

---

## C-Family Language Declaration

This is the base declaration that C-family languages (Rust, TypeScript, Java, Go, etc.) can extend.

```typescript
export const cFamilyLanguageDeclaration: LanguageDeclaration = {
  identity: {
    name: '',
    extends: null,
    extensions: ['.txt'],
    family: 'c_style',
  },
  
  conventions: {
    naming: {
      function: 'snake_case',
      type: 'PascalCase',
      variable: 'snake_case',
      const: 'SCREAMING_SNAKE',
      module: 'snake_case',
      interface: 'PascalCase',
      enum: 'PascalCase',
      enumMember: 'PascalCase',
      genericParam: 'PascalCase',
      privateMember: '_snake_case',
    },
  },
  
  syntax: {
    elements: {
      keywords: {
        function: { keyword: 'function', isReserved: true, category: 'declaration', position: 'prefix' },
        variable: { keyword: 'let', isReserved: true, category: 'declaration', position: 'prefix' },
        mutableVariable: null,
        constant: { keyword: 'const', isReserved: true, category: 'declaration', position: 'prefix' },
        type: { keyword: 'type', isReserved: true, category: 'declaration', position: 'prefix' },
        class: { keyword: 'class', isReserved: true, category: 'declaration', position: 'prefix' },
        interface: { keyword: 'interface', isReserved: true, category: 'declaration', position: 'prefix' },
        enum: { keyword: 'enum', isReserved: true, category: 'declaration', position: 'prefix' },
        namespace: { keyword: 'namespace', isReserved: true, category: 'declaration', position: 'prefix' },
        
        public: { keyword: 'public', isReserved: true, category: 'visibility', position: 'prefix' },
        private: { keyword: 'private', isReserved: true, category: 'visibility', position: 'prefix' },
        protected: { keyword: 'protected', isReserved: true, category: 'visibility', position: 'prefix' },
        internal: null,
        
        static: { keyword: 'static', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
        abstract: { keyword: 'abstract', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
        final: { keyword: 'final', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
        override: { keyword: 'override', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
        
        if: { keyword: 'if', isReserved: true, category: 'control', position: 'standalone' },
        else: { keyword: 'else', isReserved: true, category: 'control', position: 'standalone' },
        for: { keyword: 'for', isReserved: true, category: 'control', position: 'standalone' },
        while: { keyword: 'while', isReserved: true, category: 'control', position: 'standalone' },
        do: { keyword: 'do', isReserved: true, category: 'control', position: 'standalone' },
        break: { keyword: 'break', isReserved: true, category: 'control', position: 'standalone' },
        continue: { keyword: 'continue', isReserved: true, category: 'control', position: 'standalone' },
        return: { keyword: 'return', isReserved: true, category: 'control', position: 'standalone' },
        switch: { keyword: 'switch', isReserved: true, category: 'control', position: 'standalone' },
        case: { keyword: 'case', isReserved: true, category: 'control', position: 'standalone' },
        default: { keyword: 'default', isReserved: true, category: 'control', position: 'standalone' },
        
        import: { keyword: 'import', isReserved: true, category: 'module', position: 'standalone' },
        export: { keyword: 'export', isReserved: true, category: 'module', position: 'standalone' },
        from: { keyword: 'from', isReserved: true, category: 'module', position: 'standalone' },
        
        async: { keyword: 'async', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'function' },
        await: { keyword: 'await', isReserved: true, category: 'expression', position: 'prefix' },
        try: { keyword: 'try', isReserved: true, category: 'control', position: 'standalone' },
        catch: { keyword: 'catch', isReserved: true, category: 'control', position: 'standalone' },
        finally: { keyword: 'finally', isReserved: true, category: 'control', position: 'standalone' },
        throw: { keyword: 'throw', isReserved: true, category: 'control', position: 'standalone' },
        new: { keyword: 'new', isReserved: true, category: 'expression', position: 'prefix' },
        delete: { keyword: 'delete', isReserved: true, category: 'expression', position: 'prefix' },
        this: { keyword: 'this', isReserved: true, category: 'expression', position: 'standalone' },
        super: { keyword: 'super', isReserved: true, category: 'expression', position: 'standalone' },
        null: { keyword: 'null', isReserved: true, category: 'literal', position: 'standalone' },
        true: { keyword: 'true', isReserved: true, category: 'literal', position: 'standalone' },
        false: { keyword: 'false', isReserved: true, category: 'literal', position: 'standalone' },
        undefined: { keyword: 'undefined', isReserved: true, category: 'literal', position: 'standalone' },
      },
      delimiters: {
        paramOpen: '(',
        paramClose: ')',
        paramSeparator: ', ',
        typeAnnotation: ': ',
        returnIndicator: ': ',
        genericOpen: '<',
        genericClose: '>',
        genericSeparator: ', ',
        constraintSeparator: ' extends ',
        unionSeparator: ' | ',
        intersectionSeparator: ' & ',
        arrayOpen: '[',
        arrayClose: ']',
        tupleOpen: '[',
        tupleClose: ']',
        objectOpen: '{',
        objectClose: '}',
        blockOpen: ' {',
        blockClose: '}',
        blockContinuation: null,
        memberAccess: '.',
        optionalAccess: '?.',
        pointerDeref: null,
        namespaceSeparator: '.',
        optionalIndicator: '?',
        slice: ':',
        statementTerminator: ';',
        lineComment: '//',
        blockCommentOpen: '/*',
        blockCommentClose: '*/',
      },
      position: {
        type: 'postfix',
        returnType: 'suffix',
        visibility: 'prefix',
        generics: 'after_name',
        constness: 'keyword',
        mutability: 'keyword',
        optional: 'suffix_name',
        variadic: 'prefix',
      },
    },
    
    types: {
      optional: {
        strategy: 'union',
        template: '{{T}} | undefined',
        importPath: null,
        requiresImport: false,
      },
      array: {
        strategy: 'suffix',
        template: '{{T}}[]',
        importPath: null,
        requiresImport: false,
      },
      map: {
        strategy: 'wrapper',
        template: 'Map<{{K}}, {{V}}>',
        importPath: null,
        requiresImport: false,
      },
      set: {
        strategy: 'wrapper',
        template: 'Set<{{T}}>',
        importPath: null,
        requiresImport: false,
      },
      function: {
        strategy: 'function',
        template: '({{Params}}) => {{Return}}',
        importPath: null,
        requiresImport: false,
      },
      tuple: {
        strategy: 'tuple',
        template: '[{{Items}}]',
        importPath: null,
        requiresImport: false,
      },
      union: {
        strategy: 'union',
        template: '{{T1}} | {{T2}}',
        importPath: null,
        requiresImport: false,
      },
      intersection: {
        strategy: 'intersection',
        template: '{{T1}} & {{T2}}',
        importPath: null,
        requiresImport: false,
      },
      reference: null,
      promise: {
        strategy: 'wrapper',
        template: 'Promise<{{T}}>',
        importPath: null,
        requiresImport: false,
      },
    },
    
    variants: {
      public: {
        transform: [{ type: 'prefix_keyword', keyword: 'public' }],
      },
      private: {
        transform: [{ type: 'prefix_keyword', keyword: 'private' }],
      },
      protected: {
        transform: [{ type: 'prefix_keyword', keyword: 'protected' }],
      },
      internal: {
        transform: [],
      },
      static: {
        transform: [{ type: 'modifier', keyword: 'static' }],
      },
      abstract: {
        transform: [{ type: 'modifier', keyword: 'abstract' }],
      },
      final: {
        transform: [{ type: 'modifier', keyword: 'final' }],
      },
      override: {
        transform: [{ type: 'modifier', keyword: 'override' }],
      },
      async: {
        transform: [
          { type: 'prefix_keyword', keyword: 'async' },
          { type: 'return_type_wrapper', template: 'Promise<{{T}}>' },
        ],
      },
    },
    
    blocks: {
      style: 'braces',
      braces: {
        opening: ' {',
        closing: '}',
        placement: 'same_line',
      },
      indentation: null,
      keywords: null,
      implicitReturn: false,
      statementTerminator: ';',
      statementSeparator: null,
      emptyBlock: 'pass_through',
      emptyBlockKeyword: null,
    },
    
    selfParameter: {
      instanceMethods: null,
      classMethods: null,
      staticMethods: null,
    },
    
    composition: {
      functionSignature: {
        source: '{% if isExport %}export {% endif %}{% if isDefault %}default {% endif %}{% if isAsync %}async {% endif %}function {{name}}{{generics}}{{params}}{% if returnType %}: {{returnType}}{% endif %}',
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
        source: '{% if isExport %}export {% endif %}class {{name}}{% if generics %}{{generics}}{% endif %}{% if base %} extends {{base}}{% endif %} {{blockOpen}}{{members}}{{blockClose}}',
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
}
```

---

## Example: Rust (Extends C-Family)

```typescript
export const rustLanguage = declareLanguage({
  identity: {
    name: 'rust',
    extends: 'c_family',  // Inherits from cFamilyLanguageDeclaration
    extensions: ['.rs', '.rs.ejs'],
    family: 'c_style',
  },
  
  conventions: {
    naming: {
      function: 'snake_case',
      type: 'PascalCase',
      variable: 'snake_case',
      const: 'SCREAMING_SNAKE',
      module: 'snake_case',
      interface: 'PascalCase',
      enum: 'PascalCase',
      enumMember: 'PascalCase',
      genericParam: 'PascalCase',
      privateMember: '_snake_case',
    },
  },
  
  syntax: {
    elements: {
      keywords: {
        // Override C-family defaults
        function: { keyword: 'fn', isReserved: true, category: 'declaration', position: 'prefix' },
        variable: { keyword: 'let', isReserved: true, category: 'declaration', position: 'prefix' },
        mutableVariable: { keyword: 'mut', isReserved: true, category: 'modifier', position: 'prefix', modifies: 'variable' },
        class: null,  // Rust uses struct (extension)
        interface: null,  // Rust uses trait (extension)
        namespace: { keyword: 'mod', isReserved: true, category: 'declaration', position: 'prefix' },
        
        public: { keyword: 'pub', isReserved: true, category: 'visibility', position: 'prefix' },
        private: null,  // Default is private
        internal: { keyword: 'pub(crate)', isReserved: true, category: 'visibility', position: 'prefix' },
        
        abstract: null,
        final: null,
        override: null,
        
        switch: null,  // Rust uses match
        case: null,
        default: null,
        
        async: null,  // Rust async is return-type based
        await: null,
        try: null,
        catch: null,
        finally: null,
        throw: null,
        new: null,
        delete: null,
        this: null,
        super: null,
        undefined: null,
        
        // Extensions (Rust-specific)
        trait: { keyword: 'trait', isReserved: true, category: 'declaration', position: 'prefix' },
        impl: { keyword: 'impl', isReserved: true, category: 'declaration', position: 'prefix' },
        struct: { keyword: 'struct', isReserved: true, category: 'declaration', position: 'prefix' },
        where: { keyword: 'where', isReserved: true, category: 'declaration', position: 'suffix' },
        dyn: { keyword: 'dyn', isReserved: true, category: 'modifier', position: 'prefix' },
        move: { keyword: 'move', isReserved: true, category: 'modifier', position: 'prefix' },
        match: { keyword: 'match', isReserved: true, category: 'control', position: 'standalone' },
        unsafe: { keyword: 'unsafe', isReserved: true, category: 'modifier', position: 'prefix' },
      },
      
      delimiters: {
        returnIndicator: ' -> ',
        constraintSeparator: ' + ',
        intersectionSeparator: ' + ',
        memberAccess: '.',
        optionalAccess: null,
        pointerDeref: null,
        namespaceSeparator: '::',
        optionalIndicator: null,
        slice: '..',
      },
      
      position: {
        optional: 'wrapper',
      },
    },
    
    types: {
      // Override C-family
      array: null,  // Rust uses Vec
      map: null,  // Rust has specific map types
      set: null,
      reference: {
        strategy: 'prefix',
        template: '&{{T}}',
        importPath: null,
        requiresImport: false,
      },
      promise: null,  // Rust uses Future (extension)
      
      // Extensions
      Vec: {
        strategy: 'wrapper',
        template: 'Vec<{{T}}>',
        importPath: null,
        requiresImport: false,
      },
      Slice: {
        strategy: 'wrapper',
        template: '&[{{T}}]',
        importPath: null,
        requiresImport: false,
      },
      MutSlice: {
        strategy: 'wrapper',
        template: '&mut [{{T}}]',
        importPath: null,
        requiresImport: false,
      },
      MutReference: {
        strategy: 'prefix',
        template: '&mut {{T}}',
        importPath: null,
        requiresImport: false,
      },
      Box: {
        strategy: 'wrapper',
        template: 'Box<{{T}}>',
        importPath: null,
        requiresImport: false,
      },
      Result: {
        strategy: 'wrapper',
        template: 'Result<{{T}}, {{E}}>',
        importPath: null,
        requiresImport: false,
      },
      Future: {
        strategy: 'wrapper',
        template: 'impl Future<Output = {{T}}>',
        importPath: null,
        requiresImport: false,
      },
      HashMap: {
        strategy: 'wrapper',
        template: 'HashMap<{{K}}, {{V}}>',
        importPath: 'std::collections::HashMap',
        requiresImport: true,
      },
    },
    
    variants: {
      // Override C-family
      public: {
        transform: [{ type: 'prefix_keyword', keyword: 'pub' }],
      },
      private: {
        transform: [],
      },
      abstract: {
        transform: [],
      },
      final: {
        transform: [],
      },
      override: {
        transform: [],
      },
      async: {
        transform: [
          { type: 'return_type_wrapper', template: 'impl Future<Output = {{T}}>' },
        ],
      },
      
      // Extensions
      unsafe: {
        transform: [{ type: 'prefix_keyword', keyword: 'unsafe', position: 'before_fn_keyword' }],
      },
      const_fn: {
        transform: [{ type: 'prefix_keyword', keyword: 'const', position: 'before_fn_keyword' }],
      },
    },
    
    blocks: {
      implicitReturn: true,
    },
    
    composition: {
      functionSignature: {
        source: '{% if visibility %}{{visibility}} {% endif %}{% if isUnsafe %}unsafe {% endif %}{% if isConst %}const {% endif %}fn {{name}}{{generics}}{{params}}{% if returnType %} -> {{returnType}}{% endif %}',
        whitespace: 'trim',
      },
      parameter: {
        source: '{{name}}: {{type}}',
        whitespace: 'trim',
      },
      typeDefinition: {
        source: '{% if isPub %}pub {% endif %}struct {{name}}{% if generics %}{{generics}}{% endif %} {{blockOpen}}{% for field in fields %}{{field.name}}: {{field.type}},{% endfor %}{{blockClose}}',
        whitespace: 'trim',
      },
      interfaceDefinition: {
        source: '{% if isPub %}pub {% endif %}trait {{name}} {{blockOpen}}{% for method in methods %}{{method.signature}};{% endfor %}{{blockClose}}',
        whitespace: 'trim',
      },
      importStatement: {
        source: 'use {{path}};',
        whitespace: 'trim',
      },
    },
  },
})
```

Notice how Rust only specifies:
- **Overridden values**: What differs from `cFamilyLanguageDeclaration` (e.g., `function: 'fn'`)
- **Nulls for explicit removal**: Things in c-family that Rust doesn't have (e.g., `class: null`)
- **Extensions**: Rust-specific additions (e.g., `trait`, `Vec`, `unsafe` variant)

The inheritance system handles the rest!

---

## Summary

**The Pattern**:

1. **Semantic Types**: Core + Well-known + Extensions
2. **Declaration Objects**: Rich metadata about syntax
3. **Inheritance**: `extends: 'c_family'` for easy forking
4. **Minimal Declarations**: Only specify what differs

The Thread weaves through C-family branches.

---

## Templates

Composition templates use **preprocessed EJS** syntax:

| Syntax | Meaning |
|--------|---------|
| `{{ expr }}` | Output expression (unescaped) |
| `{% if condition %}` | If statement (no braces needed) |
| `{% elif condition %}` | Else-if branch |
| `{% else %}` | Else branch |
| `{% endif %}` | End if block |
| `{% for item in items %}` | For-of loop |
| `{% endfor %}` | End for block |

The preprocessor (in `machinery/shuttle/template-preprocessor.ts`) converts this readable syntax to standard EJS before rendering.

**Two-stage processing**:
1. If a `{% %}` block contains `{` or `}` → treated as raw JavaScript (pass-through)
2. Otherwise → simplified syntax transformation applied

This lets you write clean `{% if isExport %}export{% endif %}` while still supporting raw `{% if (x) { %}` when needed.
