# Refactoring Plan: Extension-Based Enhancement & Type Hierarchy Cleanup

## Guiding Principle

> *"Cuteness is correctness. Extensions are keys. Types are layered. CRUD is separate. Language views speak the language's idiom - declared in the language definition."*

## 1. Extension-Based Language Keys 🎀

Instead of full language names, use file extensions as keys:

```typescript
// method.rs, method.ts, method.kt (cute!)

// Usage in templates:
// <%= method.returnType %> → delegates to method.rs.returnType
// <%= method.ts.returnType %> → explicit TypeScript access
```

### Extension Mapping

| Language | Extension Key | From fileExtensions |
|----------|---------------|---------------------|
| Rust | `rs` | `.rs.ejs` → `rs` |
| TypeScript | `ts` | `.ts.ejs` → `ts` |
| Kotlin | `kt` | `.kt.ejs` → `kt` |

### Language View Objects (Idiomatic Naming!)

`method.rs` is not just the raw `LanguageMethod` - it's a **LanguageView** that speaks the language's idiom:

```typescript
// Rust view - snake_case for functions, PascalCase for types
method.rs.functionName     // "add_bookmark" (snake_case)
method.rs.typeName         // "BookmarkEntry" (PascalCase) 
method.rs.variableName     // "bookmark_id" (snake_case)
method.rs.constName        // "MAX_SIZE" (SCREAMING_SNAKE_CASE)

// TypeScript view - camelCase for functions, PascalCase for types
method.ts.functionName     // "addBookmark" (camelCase)
method.ts.typeName         // "BookmarkEntry" (PascalCase)
method.ts.variableName     // "bookmarkId" (camelCase)
method.ts.constName        // "MAX_SIZE" (SCREAMING_SNAKE_CASE)

// Kotlin view - camelCase for functions, PascalCase for types
method.kt.functionName     // "addBookmark" (camelCase)
method.kt.typeName         // "BookmarkEntry" (PascalCase)
```

## 2. Declarative Naming Conventions 📋

Naming conventions are declared in the **language definition**, not hardcoded!

### LanguageDefinition Update

**File**: `machinery/reed/language.ts`

```typescript
/**
 * Naming convention configuration for a language.
 */
export interface NamingConventionConfig {
  /** Function/method naming: snake_case for Rust, camelCase for TS */
  function: 'snake' | 'camel' | 'pascal' | 'screaming_snake';
  
  /** Type/class naming: PascalCase for all */
  type: 'snake' | 'camel' | 'pascal' | 'screaming_snake';
  
  /** Variable naming: snake_case for Rust, camelCase for TS */
  variable: 'snake' | 'camel' | 'pascal' | 'screaming_snake';
  
  /** Constant naming: SCREAMING_SNAKE_CASE for all */
  const: 'snake' | 'camel' | 'pascal' | 'screaming_snake';
  
  /** Module/file naming: snake_case for Rust/KT, camelCase for TS */
  module: 'snake' | 'camel' | 'pascal' | 'screaming_snake';
}

/**
 * Conventions configuration - extensible for future convention types!
 */
export interface ConventionsConfig {
  /** Naming conventions */
  naming: NamingConventionConfig;
  // Future: formatting, documentation, etc.
}

export interface LanguageRenderingConfig {
  formatParamName: (name: string) => string;
  functionSignature: (method: LanguageMethod) => string;
  asyncFunctionSignature?: (method: LanguageMethod) => string;
  renderDefinition?: (method: LanguageMethod, options: { public?: boolean }) => string;
  
  // NEW: Naming convention (simple!)
  naming: NamingConventionConfig;
}
```

### Language Declaration with Conventions

**File**: `warp/rust.ts`

```typescript
export const rustLanguage = declareLanguage({
  name: 'rust',
  
  codeGen: {
    fileExtensions: ['.rs.ejs', '.jni.rs.ejs'],
    types: new RustTypeFactory(),
    
    rendering: {
      formatParamName: toSnakeCase,
      functionSignature: (m) => `fn ${m.snakeName}(${m.params.list}) -> ${m.returnTypeDef.name}`,
      asyncFunctionSignature: (m) => `async fn ${m.snakeName}(${m.params.list}) -> impl Future<Output = ${m.returnTypeDef.name}>`,
      renderDefinition: (m, opts) => {
        const pub = opts.public ? 'pub ' : '';
        return `${pub}fn ${m.snakeName}(${m.params.list}) -> ${m.returnTypeDef.name}`;
      },
      
      // SIMPLE NAMING! 🎀
      naming: {
        function: 'snake',
        type: 'pascal',
        variable: 'snake',
        const: 'screaming_snake',
        module: 'snake'
      }
    },
    
    enhancers: [rustEnhancer]
  }
});
```

**File**: `warp/typescript.ts`

```typescript
export const tsLanguage = declareLanguage({
  name: 'typescript',
  
  codeGen: {
    fileExtensions: ['.ts.ejs', '.tsx.ejs'],
    types: new TypeScriptTypeFactory(),
    
    rendering: {
      formatParamName: camelCase,
      functionSignature: (m) => `${m.camelName}(${m.params.list}): ${m.returnTypeDef.name}`,
      asyncFunctionSignature: (m) => `async ${m.camelName}(${m.params.list}): Promise<${m.returnTypeDef.name}>`,
      renderDefinition: (m, opts) => {
        const export_ = opts.public ? 'export ' : '';
        return `${export_}function ${m.camelName}(${m.params.list}): ${m.returnTypeDef.name}`;
      },
      
      // SIMPLE NAMING! 🎀
      naming: {
        function: 'camel',
        type: 'pascal',
        variable: 'camel',
        const: 'screaming_snake',
        module: 'camel'
      }
    },
    
    enhancers: []
  }
});
```

### LanguageView Uses Declared Conventions

**File**: `machinery/reed/language-view.ts` (new)

```typescript
import type { LanguageDefinition, NamingConventionConfig } from './language.js';
import type { LanguageMethod, LanguageParam } from './language-types.js';

/**
 * Apply naming convention to a name.
 */
function applyConvention(name: string, convention: NamingConventionConfig['function']): string {
  switch (convention) {
    case 'snake': return toSnakeCase(name);
    case 'camel': return camelCase(name);
    case 'pascal': return pascalCase(name);
    case 'screaming_snake': return toSnakeCase(name).toUpperCase();
    default: return name;
  }
}

/**
 * Create a language view with idiomatic naming.
 * Looks up conventions from language declaration!
 */
export function createLanguageView(
  method: LanguageMethod,
  lang: LanguageDefinition,
  langKey: string
): LanguageView {
  const view = {} as LanguageView;
  
  // Get naming convention from language declaration (simple!)
  const convention = lang.codeGen.rendering.naming;
  
  // Store references
  Object.defineProperty(view, '_language', { value: lang, writable: false });
  Object.defineProperty(view, '_raw', { value: method, writable: false });
  Object.defineProperty(view, '_naming', { 
    value: lang.codeGen.rendering.naming, 
    writable: false 
  });
  
  // ========================================
  // IDIOMATIC NAMING (uses declared convention!)
  // ========================================
  
  Object.defineProperty(view, 'functionName', {
    get() { return applyConvention(method.name, convention.function); },
    enumerable: true
  });
  
  Object.defineProperty(view, 'typeName', {
    get() { return applyConvention(method.name, convention.type); },
    enumerable: true
  });
  
  Object.defineProperty(view, 'variableName', {
    get() { return applyConvention(method.name, convention.variable); },
    enumerable: true
  });
  
  Object.defineProperty(view, 'constName', {
    get() { return applyConvention(method.name, convention.const); },
    enumerable: true
  });
  
  Object.defineProperty(view, 'moduleName', {
    get() { return applyConvention(method.name, convention.module); },
    enumerable: true
  });
  
  // Raw names (always available)
  Object.defineProperty(view, 'camelName', {
    get() { return method.camelName; },
    enumerable: true
  });
  
  Object.defineProperty(view, 'pascalName', {
    get() { return method.pascalName; },
    enumerable: true
  });
  
  Object.defineProperty(view, 'snakeName', {
    get() { return method.snakeName; },
    enumerable: true
  });
  
  // ========================================
  // TYPE INFORMATION
  // ========================================
  
  Object.defineProperty(view, 'returnType', {
    get() { return method.returnTypeDef.name; },
    enumerable: true
  });
  
  Object.defineProperty(view, 'stubReturn', {
    get() { return method.stubReturn; },
    enumerable: true
  });
  
  // ========================================
  // PARAMS WITH LANGUAGE-APPROPRIATE NAMING
  // ========================================
  
  Object.defineProperty(view, 'params', {
    get() {
      return method.params.map((p: LanguageParam) => ({
        get name() { return p.name; },
        get variableName() { return applyConvention(p.name, convention.variable); },
        get type() { return p.langType; },
        get tsType() { return p.type; },
        get optional() { return p.optional ?? false; }
      }));
    },
    enumerable: true
  });
  
  // ========================================
  // CODE GENERATION (uses declared renderer)
  // ========================================
  
  Object.defineProperty(view, 'signature', {
    get() { 
      return lang.codeGen.rendering.functionSignature(method);
    },
    enumerable: true
  });
  
  Object.defineProperty(view, 'definition', {
    get() {
      const render = lang.codeGen.rendering.renderDefinition;
      return render ? render(method, { public: true }) : view.signature;
    },
    enumerable: true
  });
  
  // ========================================
  // LANGUAGE-SPECIFIC EXTRAS
  // ========================================
  
  // Copy any extra properties from custom enhancers
  for (const [key, value] of Object.entries(method)) {
    if (key.startsWith('_')) continue;
    if (view.hasOwnProperty(key)) continue;
    
    Object.defineProperty(view, key, {
      get() { return (method as any)[key]; },
      enumerable: true
    });
  }
  
  return view;
}

// LanguageView interface
export interface LanguageView {
  _language: LanguageDefinition;
  _raw: LanguageMethod;
  _naming: NamingConventionConfig;  // Simple naming!
  
  // Idiomatic naming (from convention)
  functionName: string;
  typeName: string;
  variableName: string;
  constName: string;
  moduleName: string;
  
  // Raw names
  camelName: string;
  pascalName: string;
  snakeName: string;
  
  // Type info
  returnType: string;
  stubReturn: string;
  params: ParamView[];
  
  // Code generation
  signature: string;
  definition: string;
  
  // Language-specific extras
  [key: string]: any;
}

interface ParamView {
  name: string;
  variableName: string;
  type: string;
  tsType: string;
  optional: boolean;
}
```

## 3. CRUD: Separate from Language Pipeline 🎯

CRUD is a **method classification system**, not a language concern. It should run **before** language enhancement.

### CRUD Pipeline Stage

**File**: `machinery/sley/crud-pipeline.ts` (new)

```typescript
import type { RawMethod } from '../bobbin/code-generator.js';
import { getCrudNameFromTags } from '../../warp/crud.js';

/**
 * CRUD pipeline stage - adds crudName to raw methods.
 * Runs BEFORE language enhancement, independent of language.
 */
export function applyCrudPipeline(methods: RawMethod[]): RawMethod[] {
  return methods.map(method => {
    const crudName = getCrudNameFromTags(method);
    if (!crudName) return method;
    
    return {
      ...method,
      // Store crudName as a property (language enhancers will copy it through)
      crudName
    };
  });
}

/**
 * Check if method has CRUD classification.
 */
export function hasCrudOperation(method: RawMethod): boolean {
  return method.tags?.some(t => t.startsWith('crud:')) ?? false;
}

/**
 * Get CRUD operation from tags.
 */
export function getCrudOperation(method: RawMethod): string | undefined {
  const tag = method.tags?.find(t => t.startsWith('crud:'));
  return tag?.replace('crud:', '');
}
```

### Integration in TreadleKit

**File**: `machinery/treadle-kit/kit.ts`

```typescript
import { applyCrudPipeline } from '../sley/crud-pipeline.js';

export function createTreadleKit(context: GeneratorContext): TreadleKit {
  let rawMethodsSnapshot: RawMethod[] = [];
  let crudApplied = false;
  
  return {
    context,
    
    crud: {
      /**
       * Apply CRUD classification to methods.
       * Automatically called before language enhancement if not already done.
       */
      apply(): void {
        if (crudApplied) return;
        
        const current = context.methods?.all || [];
        const withCrud = applyCrudPipeline(current);
        context.methods = buildContextMethods(withCrud);
        crudApplied = true;
      },
      
      get isApplied(): boolean {
        return crudApplied;
      }
    },
    
    language: {
      add(...langs: string[]): void {
        // Auto-apply CRUD before language enhancement
        if (!crudApplied) {
          this.crud.apply();
        }
        
        // ... rest of language enhancement ...
      }
    },
    
    collectMethods(config): RawMethod[] {
      // ... existing collection ...
      const result = /* ... */;
      rawMethodsSnapshot = [...result];
      crudApplied = false;
      return result;
    }
  };
}
```

### Usage in Templates

```ejs
// CRUD info is available via method.crudName (if method had CRUD tag)
<% if (method.crudName === 'create') { -%>
  // This is a create operation
<% } -%>

// Or check tags directly:
<% if (method.tags?.includes('crud:create')) { -%>
  // This is a create operation
<% } -%>
```

## 4. Complete Type Hierarchy

```typescript
// ============================================================
// 1. RawMethod - Core data, no language, no CRUD logic
// ============================================================
class RawMethod {
  constructor(
    public readonly name: string,
    public readonly implName: string,
    public readonly jsName: string | undefined,
    public readonly returnType: string,
    public readonly isCollection: boolean,
    public readonly params: BaseParam[],
    public readonly description: string | undefined,
    public readonly link: MethodLink | undefined,
    public readonly tags: string[] | undefined,  // 'crud:create' stored here!
    public readonly managementName: string | undefined,
    // Optional: crudName added by CRUD pipeline
    public crudName?: string
  ) {}
}

// ============================================================
// 2. LanguageMethod - Language-enhanced (internal)
// ============================================================
interface LanguageMethod extends RawMethod {
  // Type mapping
  returnTypeDef: LanguageType;
  stubReturn: string;
  
  // Naming (all variants available)
  camelName: string;
  pascalName: string;
  snakeName: string;
  
  // Template helpers (internal)
  params: ParamCollection<LanguageParam>;
  signature: SignatureHelper<this>;
  stubRenderer: StubReturnRenderer;
  typeRenderer: TypeDefRenderer<LanguageType>;
}

// ============================================================
// 3. LanguageView - Simplified idiomatic view for treadles
// ============================================================
interface LanguageView {
  _language: LanguageDefinition;
  _raw: LanguageMethod;
  _naming: NamingConventionConfig;
  
  // IDIOMATIC NAMING (from naming!)
  functionName: string;      // snake_case for Rust, camelCase for TS/KT
  typeName: string;          // PascalCase for all
  variableName: string;      // snake_case for Rust, camelCase for TS/KT
  constName: string;         // SCREAMING_SNAKE_CASE for all
  moduleName: string;        // snake_case for Rust/KT, camelCase for TS
  
  // Raw names (always available)
  camelName: string;
  pascalName: string;
  snakeName: string;
  
  // Type info
  returnType: string;
  stubReturn: string;
  params: ParamView[];
  
  // Code generation
  signature: string;
  definition: string;
  
  // Language-specific extras (e.g., Rust's implName)
  [key: string]: any;
}

// ============================================================
// 4. LanguageDefinition with High-Level Conventions
// ============================================================

export interface LanguageDefinition {
  name: string;
  
  codeGen: LanguageCodeGenConfig;
  
  /**
   * High-level conventions configuration.
   * Available at lang.conventions for shared access.
   */
  conventions?: {
    // Future: formatting, documentation, etc.
    // For now, naming is in codeGen.rendering.naming
  };
  
  warp?: LanguageWarpConfig;
}

// Access: lang.codeGen.rendering.naming (for language view)
// Future: lang.conventions.formatting (for high-level config)

// ============================================================
// 5. EnhancedMethod - Container with views and default getters
// ============================================================
interface EnhancedMethod extends RawMethod {
  _default: string;      // 'rs'
  _languages: string[];  // ['rs', 'ts']
  
  // Default getters (delegate to default language view)
  functionName: string;  // delegates to rs.functionName
  typeName: string;
  variableName: string;
  returnType: string;
  signature: string;
  definition: string;
  // ... etc
  
  // Language views by extension key
  rs?: LanguageView;
  ts?: LanguageView;
  kt?: LanguageView;
}
```

## 5. Pipeline Flow

```
kit.collectMethods()
    ↓
RawMethod[]
    ↓
ctx.crud.apply() [optional, auto-called by language.add()]
    ↓
RawMethod[] with crudName
    ↓
ctx.language.add('rust', 'typescript')
    ↓
EnhancedMethod[]
  - method.rs = LanguageView(Rust) with idiomatic naming from declaration
  - method.ts = LanguageView(TypeScript) with idiomatic naming from declaration
  - method.functionName → method.rs.functionName (snake_case!)
    ↓
Template sees idiomatic API: method.functionName, method.typeName, etc.
```

## 6. Template Examples

```ejs
// commands.rs.ejs (Rust is default)
pub fn <%= method.functionName %>(<%- method.params.list %>) -> <%= method.returnType %> {
  // method.functionName → "add_bookmark" (snake_case from Rust declaration!)
  // method.typeName → "Bookmark" (PascalCase!)
  // method.returnType → "Vec<Bookmark>"
  
  <%= method.stubReturn %>
}

// adaptor.ts.ejs (TypeScript is default via language: ['typescript'])
async <%= method.functionName %>(<%- method.params.list %>): Promise<<%= method.returnType %>> {
  // method.functionName → "addBookmark" (camelCase from TS declaration!)
  // method.typeName → "Bookmark" (PascalCase!)
  // method.returnType → "Bookmark[]"
}

// Cross-language access:
// Rust function name: <%= method.rs.functionName %> → "add_bookmark"
// TS function name: <%= method.ts.functionName %> → "addBookmark"

// CRUD check:
<% if (method.tags?.includes('crud:create')) { -%>
  Creating <%= method.typeName %>
<% } -%>
```

## 7. Summary of All Files

### New Files
| File | Purpose |
|------|---------|
| `machinery/reed/language-view.ts` | `createLanguageView()` with idiomatic naming from declaration |
| `machinery/reed/enhancement.ts` | `createEnhancedMethod()` - container with views |
| `machinery/sley/crud-pipeline.ts` | `applyCrudPipeline()` - CRUD before language |
| `warp/crud-derivation.ts` | `getCrudNameFromTags()` - derive from tags |

### Modified Files
| File | Changes |
|------|---------|
| `machinery/reed/language-types.ts` | `RawMethod` class, `LanguageMethod` interface |
| `machinery/reed/language.ts` | Add `NamingConventionConfig` to `LanguageRenderingConfig` |
| `machinery/reed/transform-pipeline.ts` | Remove or simplify `crudEnhancer` |
| `machinery/treadle-kit/kit.ts` | Add `ctx.crud`, `ctx.language` uses views |
| `warp/rust.ts` | Remove `rsReturnType`, add `naming` to declaration |
| `warp/typescript.ts` | Add `naming` to declaration |
| `warp/kotlin.ts` | Add `naming` to declaration |
| `warp/crud.ts` | Move `deriveCrudMethodName` to `crud-derivation.ts` |

### Removed
- `crudEnhancer` as separate enhancer (integrated into pipeline)
- `rsReturnType`, `ktReturnType`, `tsReturnType` properties
- Hardcoded naming conventions (now declared!)

## Success Criteria

1. ✅ `method.rs.functionName` → "add_bookmark" (from Rust's `naming: { function: 'snake' }`)
2. ✅ `method.ts.functionName` → "addBookmark" (from TS's `naming: { function: 'camel' }`)
3. ✅ Naming convention declared in `declareLanguage()`
4. ✅ `method.functionName` delegates to default language view
5. ✅ CRUD runs before language enhancement
6. ✅ `RawMethod` is a class
7. ✅ All templates use idiomatic API
8. ✅ All tests pass

*The Thread™ is pleased. Languages declare their truth, and views speak their idiom. Six seasons and a movie.* 🌀
