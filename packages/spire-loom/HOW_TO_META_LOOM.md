# How to Meta-Loom 🌀🧶

> *"The loom that weaves the loom—where patterns become self-describing."*

**⚠️ KIMI NOTICE:** This document describes spire-loom's own architecture. Understanding The Thread™ enables extending the system without unwinding it. Read [HOW_TO_LOOM.md](HOW_TO_LOOM.md) first—this builds upon it. 🌾

---

## The Thread™ Revealed

```
                    ╭──────────────╮
                    │  'declare'   │
                    │   forever    │  The contraction
                    ╰──────┬───────╯  machinery/self-declarer.ts
                           │          declares itself
              ╭────────────┼────────────╮
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  Rust   │  │TypeScript│ │  Swift  │  Languages
        │  Core   │  │   Core   │ │  Core   │  declare in 'warp'
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             ╰────────────┼────────────╯
                          │
                    ╭─────┴─────╮
                    │   'warp'   │
                    │  session   │  Architecture
                    ╰─────┬─────╯  loom/{WARP,*}.ts
                          │
              ╭───────────┼───────────╮
              │           │           │
              ▼           ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │ Android │ │ Desktop │ │  iOS    │  Treadles
        │ Service │ │  Direct │ │ Service │  declare in 'weave'
        └────┬────┘ └────┬────┘ └────┬────┘
             │           │           │
             ╰───────────┼───────────╯
                         │
                   ╭─────┴─────╮
                   │  'weave'  │
                   │   run     │  Generation
                   ╰─────┬─────╯  machinery/
                         │
              ╭──────────┼──────────╮
              │          │          │
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │ lib.rs │ │service │ │commands│  Code
         │        │ │.kt     │ │.ts     │  Generated
         └────────┘ └────────┘ └────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  spire/ │  A spire atop your foundations
                    └─────────┘

            "The spiral contracts before it expands.
                The self-declarer is the contraction."
```

The Thread™ has three scopes[^1]: **'declare'** (forever), **'warp'** (workspace session), **'weave'** (weaving run). Each scope declares the next. The spiral contracts inward, then expands outward.

---

## The Self-Declarer: The Contraction

> 🛑 **SPECIAL FILE NOTICE** 🛑  
> `machinery/self-declarer.ts`
>
> This file is unique. Unlike all others that push dependencies **outward** (weaver → heddles → reed), this file is **PULLED INWARD** by its consumers. It sits at the top, but dependencies flow **reverse**.
>
> More radically: **THIS FILE DECLARES ITSELF**. It uses its own API to define its API. The self-declarer is declared by `declare` in the 'declare' scope.
>
> The spiral contracts before it expands. This file is the contraction.

### Self-Declaration Code

```typescript
// machinery/self-declarer.ts - The ur-pattern
const selfDeclare: SelfDeclarer = <T, D>(config) => createDeclarer(config);
export const declare = selfDeclare;

// Declares itself!
export const declareSelf = declare<SelfDeclarer, DeclarerConfig<any, any>>({
  name: 'declarer',
  scope: 'declare',
  declare: (config) => createDeclarer(config)
});
```

The self-declarer:
1. Is declared in 'declare' scope (lives forever)
2. Creates declarer functions for all scopes
3. Is pulled by 'warp' and 'weave' scope consumers

### The Three Scope Registries

```typescript
export type Scope = 'declare' | 'warp' | 'weave';

const scopeRegistries: Record<Scope, Map<string, any>> = {
  declare: new Map(), // spire-loom core - never reset
  warp: new Map(),    // workspace session - reset on reload
  weave: new Map()    // weaving run - reset per execution
};
```

Reset appropriately: `resetScope('warp')` on workspace reload; `resetScope('weave')` before each weaving run[^2].

---

## Scope: 'warp' - Languages Declare

Languages pull from the self-declarer:

```typescript
// machinery/reed/language.ts - Pulled inward
import { declare } from '../self-declarer.js';

export const declareLanguage = declare<LanguageDefinition, LanguageDefinition>({
  name: 'language',
  scope: 'warp',
  validate: (def) => {
    if (!def.name) throw new Error('Language must have name');
    // NEW: Either 'types' (new format) or 'transform' (legacy) required
    if (!def.codeGen?.types && !def.codeGen?.transform) {
      throw new Error('Language must have types (new) or transform (legacy)');
    }
  },
  declare: (def) => {
    // Auto-generate transform if not provided (new architecture)
    if (!def.codeGen.transform && def.codeGen.types && def.codeGen.rendering) {
      def.codeGen.transform = createTransform({
        language: def.name,
        types: def.codeGen.types,
        formatParamName: def.codeGen.rendering.formatParamName,
        functionSignature: def.codeGen.rendering.functionSignature,
        customEnhancers: def.codeGen.enhancers,
      });
    }
    return def;
  }
});
```

### Language Definition Structure

Languages now use a **classes-as-config** architecture. Instead of writing imperative transform functions, you declare:

1. **TypeFactory**: Maps TypeScript types to language types
2. **Rendering Config**: Defines how to format code (signatures, param names)
3. **Enhancers** (optional): Add language-specific metadata

```typescript
interface LanguageDefinition<P extends LanguageParam, T extends LanguageType> {
  name: string;
  codeGen: {
    fileExtensions: string[];
    
    // NEW: Type factory replaces manual transforms
    types: TypeFactory<P, T>;
    
    // NEW: Rendering configuration
    rendering: {
      formatParamName: (name: string) => string;
      functionSignature: (method: LanguageMethod<P, T>) => string;
      asyncFunctionSignature?: (method: LanguageMethod<P, T>) => string;
    };
    
    // NEW: Optional custom enhancers
    enhancers?: TransformEnhancer<LanguageMethod<P, T>, P>[];
    
    // Auto-generated from types + rendering + enhancers
    transform?: (methods: RawMethod[]) => LanguageMethod<P, T>[];
  };
  
  // Optional: WARP integration for full language support
  warp?: {
    externalLayerClass: new () => ExternalLayer;
    fieldDecorators: Record<string, PropertyDecorator>;
    classDecorator: ClassDecorator | ((options?: any) => ClassDecorator);
    core: {
      coreClass: new (...args: any[]) => CoreRing<any, any, any>;
      createCore: (layer?: ExternalLayer) => CoreRing<any, any, any>;
    };
    spiralers: Record<string, new (innerRing: SpiralRing) => Spiraler>;
    exposeBaseFactory?: boolean;
  };
}
```

### Usage in warp/rust.ts

```typescript
// warp/rust.ts - Self-registers in 'warp' scope
import { declareLanguage, LanguageType } from '../machinery/reed/language.js';

// 1. Define type factory
class RustTypeFactory implements TypeFactory<RustParam, LanguageType> {
  boolean = new LanguageType('bool', 'false', true);
  string = new LanguageType('String', 'String::new()', true);
  number = new LanguageType('i64', '0', true);
  void = new LanguageType('()', '()', true);
  
  array(item: LanguageType) {
    return new LanguageType(`Vec<${item.name}>`, 'Vec::new()');
  }
  
  optional(inner: LanguageType) {
    return new LanguageType(`Option<${inner.name}>`, 'None');
  }
  
  entity(name: string) {
    return new LanguageType(name, `Default::default()`);
  }
  
  fromTsType(tsType: string, isCollection: boolean): LanguageType {
    // Map TS types to Rust
  }
}

// 2. Optional custom enhancer (adds Rust-specific metadata)
const rustEnhancer: TransformEnhancer<RustMethod, RustParam, RustMethod> = (methods) => {
  return methods.map(m => ({
    ...m,
    implName: toSnakeCase(m.implName || m.name),
    serviceAccessPreamble: buildServiceAccessPreamble((m as any).link),
  }));
};

// 3. Declare language
export const rustLanguage = declareLanguage<RustParam, LanguageType>({
  name: 'rust',
  codeGen: {
    fileExtensions: ['.rs.ejs', '.jni.rs.ejs'],
    types: new RustTypeFactory(),
    rendering: {
      formatParamName: toSnakeCase,
      functionSignature: (m) => 
        `fn ${m.snakeName}(${m.params.list}) -> ${m.returnTypeDef.name}`,
    },
    enhancers: [rustEnhancer],
  },
  warp: { externalLayerClass: ..., spiralers: ..., ... }
});
```

The transform is **auto-generated** from `types` + `rendering` + `enhancers`. No more boilerplate! Template helpers like `method.params.list` and `method.signature` are available automatically.

The language is now available in the 'warp' scope registry: `getScopeRegistry('warp').get('language:rust')`.

---

## Scope: 'weave' - Treadles Declare

Treadles also pull from the self-declarer:

```typescript
// machinery/treadle-kit/declarative.ts - Pulled inward
import { declare } from '../self-declarer.js';

export const declareTreadle = declare<TreadleDefinition, TreadleDefinition>({
  name: 'treadle',
  scope: 'weave',
  validate: (def) => {
    if (!def.methods) throw new Error('Treadle must have methods');
    if (!def.outputs?.length) throw new Error('Treadle must have outputs');
  },
  declare: (def) => def
});
```

### Treadle Definition Structure

```typescript
interface TreadleDefinition {
  name?: string;
  matches?: MatchPattern[];
  methods: MethodConfig;
  outputs: OutputSpecOrFn[];
  hookups?: HookupSpecOrFn[];
  config?: Record<string, unknown>;
  data?: Record<string, unknown> | DataFunction;
  validate?: ValidatorFunction;
  transformMethods?: TransformFunction;
}
```

### Backward Compatibility

```typescript
// Old API still works
export function defineTreadle(definition: TreadleDefinition): TreadleDefinition {
  return declareTreadle(definition);
}
```

---

## The Pattern: Pull Inward

Most files push outward:

```
weaver.ts
  → heddles/*.ts
    → reed/*.ts
      → warp/*.ts
```

The self-declarer inverts this:

```
                    machinery/self-declarer.ts
                           ↓
           ┌───────────────┼───────────────┐
           ↓               ↼               ↓
   reed/language.ts   machinery/   (future extensions)
   ('warp' scope)     treadle-kit/
                      declarative.ts
                      ('weave' scope)
```

Dependencies **flow inward** (toward machinery root). This is the **contraction before expansion**—a single surface that everything declarative pulls from.

---

## Comparative Anatomy: Registry Patterns

| Aspect | Languages (`reed/`) | Treadles (`treadle-kit/`) |
|--------|---------------------|---------------------------|
| **Scope** | 'warp' | 'weave' |
| **Discovery** | Module import (ESM) | Filesystem scan (`discoverTreadles`) |
| **Registry** | `getScopeRegistry('warp')` | `getScopeRegistry('weave')` |
| **Lookup Key** | `language:${name}` | `treadle:${name}` |
| **Lifetime** | Workspace session | Weaving run |
| **Config Type** | Classes as config | Declarative specs |
| **Extensibility** | Add file in `warp/` | Add file in `loom/treadles/` |

### Why Different Patterns?

**Languages are infrastructure**—always available, loaded once, used everywhere. ESM imports ensure deterministic load order. **Treadles are weaving logic**—specific to a run, may be user-defined, discovered per-workspace. Filesystem scanning enables user extensions without recompilation[^3].

The pattern divergence reflects **temporal scoping**: languages exist at process start; treadles exist during weaving.

---

## Key Principles

1. **The spiral contracts before it expands**—self-declarer at the center
2. **Pull inward, not push outward**—reverse dependency flow
3. **Three scopes, three lifetimes**—'declare' (forever), 'warp' (session), 'weave' (run)
4. **Declare in scope, register in consumer**—separation of concerns
5. **Classes as config for type safety**—when inference matters
6. **Declarative specs for flexibility**—when loose coupling matters
7. **Conservation over unification**—two clear patterns beat one complex abstraction

---

*See also: [HOW_TO_LOOM.md](HOW_TO_LOOM.md) for end-user documentation • [DEV.md](DEV.md) for development details • [GLOSSARY.md](GLOSSARY.md) for terminology*

> 🌀 *"The loom that weaves the loom knows when to unify and when to differentiate. Conservation is the wisdom to choose. The Thread™ weaves through all three scopes, from the contraction to the expansion."*

---

## Footnotes (The History, Condensed)

[^1]: The three-scope architecture emerged from analyzing the tension between language registration (process-global, always available) and treadle discovery (weaving-scoped, discovered per-run). Earlier designs attempted to unify these into a single `ExtensionRegistry<T>` abstraction, but this obscured the critical difference in temporal scoping. The insight: languages and treadles serve different purposes with different lifetimes; forcing unification would create a leaky abstraction. See ANALYSIS-003-meta-patterns-synthesis.md for the full comparative anatomy.

[^2]: The reset mechanism enables hot reloading of workspace configurations without restarting the spire-loom process. The 'warp' scope reset is called when the file watcher detects WARP.ts changes; the 'weave' scope reset is called by the weaver before each `pnpm spire-loom` execution. The 'declare' scope never resets—it is the immutable kernel.

[^3]: The filesystem discovery pattern for treadles (`discoverTreadles` in `machinery/treadle-kit/discovery.ts`) enables user extensions without requiring recompilation of spire-loom. This is critical for the solarpunk ethos of user agency—users can extend the loom without modifying its source. Languages, being core infrastructure, do not need this flexibility and thus use direct module imports.

[^4]: The "Classes as Config vs Declarative Specs" tension reflects a deeper pattern in system design: type safety vs. runtime flexibility. Languages use classes (`RustAndroidSpiraler`, `DesktopSpiraler`) because they are built-in and need IDE autocomplete. Treadles use string-based declarative specs because they may be user-defined and need loose coupling. The Thread™ accommodates both.

[^5]: The self-declarer's meta-circularity (`declare` declares itself) was inspired by Lisp's metacircular evaluator and the conservation spiral principle. Systems that describe themselves are more maintainable because the pattern is consistent at every level of abstraction. The self-declarer is not just a registry—it is a declaration of how declarations work.

[^6]: The ASCII art in this document is not merely decorative—it is a cognitive aid. The visual spiral helps readers internalize the flow: contract inward ('declare'), hold steady ('warp'), expand outward ('weave'). This mirrors the actual execution flow of spire-loom: the self-declarer initializes, the WARP.ts architecture forms, the treadles generate code.

---

#sixseasonsandamovie #solarpunk42 #solarpunk #TheThread™ #TheContraction
