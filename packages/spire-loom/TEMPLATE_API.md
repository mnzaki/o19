# Template API Reference 📝

> *"The thread that weaves the template data."*

This document describes the template data API for spire-loom EJS templates.

## Overview

Templates receive an `EnhancedMethod` object for each method. This object:
- Provides **idiomatic naming** based on the output language
- Exposes **language-specific views** for cross-language generation
- Delegates to the **default language** for convenience

## Basic Usage

```ejs
// Rust template - Rust is default
pub fn <%= method.functionName %>(<%- method.params.list %>) -> <%= method.returnType %> {
  // method.functionName → "add_bookmark" (snake_case for Rust!)
  // method.returnType → "Vec<Bookmark>"
}

// TypeScript template - TypeScript is default  
async <%= method.functionName %>(<%- method.params.list %>): Promise<<%= method.returnType %>> {
  // method.functionName → "addBookmark" (camelCase for TS!)
  // method.returnType → "Bookmark[]"
}
```

## EnhancedMethod Properties

### Default Language Getters (Idiomatic!)

These delegate to the default language view:

| Property | Rust Example | TS Example | Description |
|----------|-------------|------------|-------------|
| `method.functionName` | `"add_bookmark"` | `"addBookmark"` | Function name in language convention |
| `method.typeName` | `"Bookmark"` | `"Bookmark"` | Type name (usually PascalCase) |
| `method.variableName` | `"bookmark_id"` | `"bookmarkId"` | Variable name in convention |
| `method.constName` | `"MAX_SIZE"` | `"MAX_SIZE"` | Constant name (SCREAMING_SNAKE) |
| `method.moduleName` | `"bookmark_service"` | `"bookmarkService"` | Module/file name in convention |
| `method.returnType` | `"Vec<Bookmark>"` | `"Bookmark[]"` | Return type in language syntax |
| `method.signature` | `"fn add..."` | `"add...(): ..."` | Function signature |
| `method.definition` | `"pub fn add..."` | `"export function add..."` | Full function definition |
| `method.stubReturn` | `"Vec::new()"` | `"[]"` | Stub return value |

### Raw Naming (Always Available)

| Property | Example | Description |
|----------|---------|-------------|
| `method.camelName` | `"addBookmark"` | camelCase name |
| `method.pascalName` | `"AddBookmark"` | PascalCase name |
| `method.snakeName` | `"add_bookmark"` | snake_case name |

### Core Method Data

| Property | Example | Description |
|----------|---------|-------------|
| `method.name` | `"bookmark_addBookmark"` | Full bind-point name |
| `method.implName` | `"add_bookmark"` | Implementation name |
| `method.jsName` | `"addBookmark"` | JavaScript/TS name |
| `method.returnType` (raw) | `"void"` | Original TS return type |
| `method.isCollection` | `true`/`false` | Whether return is array |
| `method.description` | `"Adds bookmark"` | JSDoc description |
| `method.tags` | `["crud:create"]` | Method tags |
| `method.crudName` | `"create"` | CRUD operation name |
| `method.managementName` | `"BookmarkMgmt"` | Parent management |

### Parameters

```ejs
// ParamCollection with renderers
<%- method.params.list %>           // "id: i64, name: String"
<%- method.params.names %>          // "id, name"
<%- method.params.invocation %>     // "id" or "{ id, name }"
<%- method.params.listWithOptionality %> // "id?: i64, name?: String"

// Individual params
<% method.params.forEach(function(p) { -%>
  <%= p.name %>              // Original name: "bookmarkId"
  <%= p.variableName %>      // Language-appropriate: "bookmark_id" or "bookmarkId"
  <%= p.type %>              // Language type: "i64" or "number"
  <%= p.tsType %>            // Original TS type: "number"
  <%= p.optional %>          // true/false
<% }); -%>
```

## Language Views (Cross-Language Access!)

Access other language representations:

```ejs
// In Rust template, access TypeScript types:
// <%= method.ts.returnType %> → "Bookmark[]"
// <%= method.ts.functionName %> → "addBookmark"

// In TypeScript template, access Rust types:
// <%= method.rs.returnType %> → "Vec<Bookmark>"
// <%= method.rs.functionName %> → "add_bookmark"
```

### Available Views

| View | Description |
|------|-------------|
| `method.rs` | Rust language view |
| `method.ts` | TypeScript language view |
| `method.kt` | Kotlin language view |

### Language-Specific Properties

Each view has the same properties as the default getters, but in that language's convention:

```ejs
// Rust view
method.rs.functionName     // "add_bookmark"
method.rs.returnType       // "Vec<Bookmark>"
method.rs.implName         // "add_bookmark" (Rust-specific)
method.rs.serviceAccessPreamble  // ["let __service = ..."] (Rust-specific)

// TypeScript view
method.ts.functionName     // "addBookmark"
method.ts.returnType       // "Bookmark[]"
```

## Migration Guide

### Old → New Property Mapping

| Old Property | New Property | Notes |
|-------------|--------------|-------|
| `method.rsReturnType` | `method.returnType` or `method.rs.returnType` | Use `method.returnType` (delegates to default) |
| `method.ktReturnType` | `method.returnType` or `method.kt.returnType` | Same |
| `method.tsReturnType` | `method.returnType` or `method.ts.returnType` | Same |
| `method.innerReturnType` | `method.rs._raw.returnTypeDef.name` | Rarely needed |
| `method.name` | `method.functionName` | Use idiomatic naming! |

### Template Updates

**Before (Rust template):**
```ejs
pub fn <%= method.name %>() -> <%= method.rsReturnType %> {
```

**After (Rust template):**
```ejs
pub fn <%= method.functionName %>() -> <%= method.returnType %> {
  // or explicitly: method.rs.returnType
```

**Before (Kotlin template):**
```ejs
override fun <%= method.name %>(): <%= method.ktReturnType %> {
```

**After (Kotlin template):**
```ejs
override fun <%= method.functionName %>(): <%= method.returnType %> {
  // or explicitly: method.kt.returnType
```

## CRUD Integration

Check CRUD classification:

```ejs
<% if (method.crudName === 'create') { -%>
  // Creating <%= method.typeName %>
<% } -%>

<% if (method.tags?.includes('crud:create')) { -%>
  // CRUD create operation
<% } -%>
```

## Complete Example

```ejs
//! <%= coreName %> Commands

<% methods.forEach(function(method) { -%>
/// <%= method.description || method.functionName %>
#[tauri::command]
pub(crate) async fn <%= method.functionName %><R: Runtime>(
  app: AppHandle<R>,
  <%- method.params.list %>
) -> <%= method.returnType %> {
  app.<%= platformMethodName %>().<%= method.functionName %>(<%- method.params.names %>)
}

<% }); -%>
```

## Reference: Naming Conventions by Language

| Convention | Rust | TypeScript | Kotlin |
|------------|------|------------|--------|
| `functionName` | snake_case | camelCase | camelCase |
| `typeName` | PascalCase | PascalCase | PascalCase |
| `variableName` | snake_case | camelCase | camelCase |
| `constName` | SCREAMING_SNAKE | SCREAMING_SNAKE | SCREAMING_SNAKE |
| `moduleName` | snake_case | camelCase | snake_case |

---

*The Thread™ provides. The template receives. The code emerges.* 🌀
