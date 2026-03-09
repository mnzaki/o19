# Language System 🌾

> *"Every thread speaks in its own tongue; the loom must learn them all."*

The language system provides a **two-layer architecture** for defining programming languages in spire-loom:

1. **Layer 1: Declarative** - Describe what the language IS
2. **Layer 2: Executive** - Define how to generate code

## Quick Example

```typescript
import { declareLanguage } from './index.js';

export const myLanguage = declareLanguage({
  // Identity (required)
  name: 'myLang',
  extensions: ['.my'],
  
  // Conventions (declarative)
  conventions: {
    naming: {
      function: 'snake_case',
      type: 'PascalCase'
    }
  },
  
  // Syntax (declarative - generates TypeFactory + Rendering)
  syntax: {
    keywords: {
      function: 'fn',
      public: 'pub'
    },
    types: {
      boolean: { template: 'bool', stub: 'false' },
      string: { template: 'String', stub: '""' },
      array: {
        template: (T) => `Vec<${T}>`,
        stub: 'Vec::new()'
      }
    },
    composition: {
      functionSignature: {
        source: 'fn {{name}}({{params}}) -> {{returnType}}'
      }
    }
  }
  
  // Optional: Override with imperative config
  // codeGen: { types: customTypeFactory }
});
```

## The Two-Layer Architecture

### Layer 1: Declarative (The "What")

Declare your language using familiar concepts:

```typescript
{
  // What types does this language have?
  syntax: {
    types: {
      boolean: { template: 'bool', stub: 'false' },
      string: { template: 'String', stub: '""' }
    }
  },
  
  // How are functions written?
  composition: {
    functionSignature: {
      source: '{{keywords.function}} {{name}}{{params}}'
    }
  },
  
  // What modifiers exist?
  functionVariants: {
    async: { prependKeyword: 'async' }
  }
}
```

**The declarative syntax automatically generates:**
- `TypeFactory` - Maps TS types to your language's types
- `RenderingConfig` - Renders code from templates

### Layer 2: Executive (The "How")

Override or extend with imperative code when needed:

```typescript
{
  // Custom type factory (overrides generated one)
  codeGen: {
    types: new MyCustomTypeFactory(),
    rendering: {
      functionSignature: (method) => `custom ${method.name}()`
    }
  }
}
```

## How It Works

### 1. Compilation Flow

```
User Input (mixed declarative + imperative)
         ↓
[Has 'syntax'?]
    ├─ Yes → compileToExecutive() generates codeGen
    └─ No  → use imperative codeGen directly
         ↓
deepmerge(compiled, explicitOverrides)
         ↓
declareLanguageImperatively(registers language)
```

### 2. Type Factory Generation

The `syntax.types` declaration generates a `TypeFactory`:

| Declarative | Generated Factory Method |
|-------------|-------------------------|
| `boolean: { template: 'bool' }` | `types.boolean` → `LanguageType('bool')` |
| `array: { template: (T) => Vec<T> }` | `types.array(inner)` → wrapped type |
| `fromTsType(tsType)` | Auto-generated switch on primitives |

### 3. Rendering Generation

The `syntax.composition` generates rendering functions:

| Template | Generated Function |
|----------|-------------------|
| `functionSignature: { source: 'fn {{name}}()' }` | Renders function signatures |
| `functionParams: { source: '({{params.join(", ")}})' }` | Renders parameter lists |

## Field Reference

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Language identifier (e.g., 'rust') |
| `extensions` | `string[]` | File extensions (e.g., ['.rs']) |
| `conventions` | `object` | Naming conventions |
| `syntax` | `object` | **Declarative**: types, keywords, composition |
| `functionVariants` | `object` | Method modifiers (async, public, etc.) |
| `codeGen` | `object` | **Imperative**: Override generated config |
| `enhancements` | `object` | Language-specific enhancements |
| `warp` | `object` | WARP integration (spiralers, decorators) |

### Syntax Fields

```typescript
syntax: {
  // Keywords for the language
  keywords: {
    function: 'fn',
    public: 'pub',
    // ... any keywords
  },
  
  // Type constructors
  types: {
    boolean: { template: 'bool', stub: 'false' },
    string: { template: 'String', stub: '""' },
    array: {
      template: (T) => `Vec<${T}>`,  // Function template
      stub: 'Vec::new()'
    }
  },
  
  // Code composition templates
  composition: {
    functionSignature: { source: '...' },
    functionParams: { source: '...' },
    // ... see CompositionTemplates
  }
}
```

## Common Patterns

### Pure Declarative (Recommended)

Use when standard patterns work:

```typescript
declareLanguage({
  name: 'kotlin',
  extensions: ['.kt'],
  conventions: { ... },
  syntax: {
    keywords: { function: 'fun' },
    types: { ... },
    composition: { ... }
  }
});
```

### Declarative + Enhancements

Add language-specific behavior:

```typescript
declareLanguage({
  name: 'rust',
  syntax: { ... },
  enhancements: {
    methods: (method) => {
      if (method.hasTag('rust:result')) {
        method.addVariance('result');
      }
    }
  }
});
```

### Mixed (Declarative + Imperative Override)

Override specific parts:

```typescript
declareLanguage({
  name: 'typescript',
  syntax: { ... },  // Generates most things
  codeGen: {
    rendering: {
      // Override just this one function
      functionSignature: (method) => `custom ${method.name}()`
    }
  }
});
```

### Pure Imperative (Legacy)

Full control (not recommended for new languages):

```typescript
declareLanguage({
  name: 'custom',
  extensions: ['.cst'],
  codeGen: {
    types: new CustomTypeFactory(),
    rendering: new CustomRendering()
  }
  // No 'syntax' field
});
```

## Multi-Language Support

Languages can reference each other in templates:

```ejs
// In a JNI bridge template
<% methods.forEach(method => { %>
  // Rust side
  fn <%= method.rs.name %>() -> <%= method.rs.returnType.name %>
  
  // Kotlin side
  fun <%= method.kt.name %>(): <%= method.kt.returnType.name %>
<% }) %>
```

Add multiple languages via `kit.language.add('rust', 'kotlin')`.

## Template Helpers

Language methods provide convenient helpers for code generation templates:

### `method.signature`

The complete function signature (modifiers, name, params, return type) without body.
This helper works correctly across all languages, handling the syntax differences
automatically based on the language context.

```mejs
{# Rust: Generate a function with custom body #}
{{ method.signature }} {
    {{ method.invoke('self.foundframe') }}
}

{# Output:
pub fn add_bookmark(url: String) -> Result<(), Error> {
    self.foundframe.thestream.lock().unwrap().as_ref().map(|s| s.add_bookmark(url)).transpose()?
}
#}

{# With variant modifiers #}
{{ method.pub.async.signature }} {
    // async implementation
}

{# Output:
pub async fn add_bookmark(url: String) -> Result<(), Error> {
    // async implementation
}
#}
```

#### Cross-Language Signatures

`method.signature` adapts to the target language automatically:

```mejs
{# Rust - method.rs.signature #}
pub fn add_bookmark(url: String) -> Result<(), Error>

{# TypeScript - method.ts.signature #}
async addBookmark(url: string): Promise<void>

{# Kotlin - method.kt.signature #}
fun addBookmark(url: String): Result<Error>

{# AIDL - method.kt.signature (used for Android IPC) #}
void addBookmark(String url)
```

Use language variants when generating multi-language bindings:

```mejs
{# JNI Bridge - Kotlin side #}
{{ method.kt.signature }} {
    // Kotlin implementation
}

{# JNI Bridge - Rust side #}
{{ method.rs.signature }} {
    // Rust implementation
}
```

### `method.params`

Just the formatted parameter list.

```mejs
{# Rust #}
fn wrapper{{ method.params }} -> {{ method.returnType }}

{# Output: fn wrapper(url: String, title: Option<String>) -> Result<(), Error> #}
```

### `method.paramNames`

Array of parameter names (strings) for easy joining.

```mejs
{# Generate invocation with parameter names #}
{{ method.paramNames.join(', ') }}
{# → 'url, title, count' #}

{# Use in function calls #}
invoke('cmd', { {{ method.paramNames.join(', ') }} })
{# → invoke('cmd', { url, title, count }) #}

{# Check parameter count #}
{% if method.paramNames.length > 0 %}
  // Method has {{ method.paramNames.length }} parameters
{% endif %}
```

### `method.definition`

Full definition including body placeholder. Less commonly used since the template
provides the actual body.

### `method.invoke(variablePath)`

**Rust only**: Generate the full ExternalLayer invocation chain.

```mejs
{# Simple invocation #}
{{ method.invoke('self.foundframe') }}

{# Output:
self.foundframe.thestream.lock().unwrap().as_ref().map(|s| s.add_bookmark(url)).transpose()?
#}

{# With state access (Tauri) #}
{{ method.invoke('app_handle.state::<FoundframeState>().inner()') }}
```

### `method.returnType`

Returns a `LanguageType` object with intelligent string conversion.

```mejs
{# Just print the type - toString() returns the type name #}
{{ method.returnType }}

{# Equivalent explicit access #}
{{ method.returnType.name }}

{# Get a stub/default value for this type #}
{{ method.returnType.stub }}

{# Check type properties #}
{% if method.returnType.isPrimitive %}
  // Primitive type handling
{% endif %}

{# Example: Generate a stub implementation #}
fn {{ method.name }}_stub() -> {{ method.returnType }} {
    {{ method.returnType.stub }}
}

{# Output for Result<String, Error>:
fn some_method_stub() -> Result<String, Error> {
    Ok("")
}
#}
```

### `method.returnType.stub`

Each `LanguageType` carries a stub value suitable for mock implementations:

| Type | Stub Value |
|------|-----------|
| `String` | `""` |
| `i32` | `0` |
| `bool` | `false` |
| `Vec<T>` | `Vec::new()` |
| `Option<T>` | `None` |
| `Result<T, E>` | `Ok(T::default())` |

```mejs
{# Generate match arms with stub implementations #}
match self {
{% for method in methods %}
    Method::{{ method.name.pascalCase }} => {{ method.returnType.stub }},
{% endfor %}
}
```

### `method.name` - Language-Sensitive Naming

The `method.name` property automatically respects the language's naming conventions:

```mejs
{# In a Rust context - method.name returns snake_case #}
{{ method.rs.name }}
{# → 'add_bookmark' #}

{# In a TypeScript context - method.name returns camelCase #}
{{ method.ts.name }}
{# → 'addBookmark' #}

{# In a Kotlin context - method.name returns camelCase #}
{{ method.kt.name }}
{# → 'addBookmark' #}
```

**Best Practice**: Use `method.name` directly instead of manual case conversion:

```mejs
{# DON'T do this - manual case conversion is fragile #}
{{ method.name.snakeCase }}

{# DO this - trust the language conventions #}
{{ method.rs.name }}
```

Only use explicit case accessors (`.pascalCase`, `.snakeCase`) when you need a specific case for:
- File paths (usually `snake_case`)
- JNI function names (usually `PascalCase` for the method suffix)
- Special naming requirements

### Complete Template Example

```mejs
{# commands.rs.mejs - Tauri commands #}
{% for method in methods %}
#[tauri::command]
{{ method.pub.signature }} {
    {{ method.invoke('app_handle.state::<FoundframeState>().inner()') }}
}
{% endfor %}
```

## LanguageType in Templates

The `LanguageType` class provides intelligent rendering:

```mejs
{# These are equivalent - use whichever reads better #}
fn foo() -> {{ method.returnType }}
fn foo() -> {{ method.returnType.name }}
fn foo() -> {{ method.returnType.toString() }}

{# Access the raw Name object for case variations #}
fn {{ method.returnType.name.snakeCase }}_handler()

{# The stub value is useful for tests and mocks #}
#[cfg(test)]
mod tests {
    fn mock_{{ method.name }}() -> {{ method.returnType }} {
        {{ method.returnType.stub }}
    }
}
```

## See Also

- `declarative.ts` - Layer 1 compilation logic
- `imperative.ts` - Layer 2 registration
- `types.ts` - Core type definitions
- `method.ts` - LanguageMethod with variance support
