# The Bobbin 🧵

> *"The thread must be held before it can be thrown."*

The [bobbin](../) is the spool inside the shuttle that holds the weft thread. In our loom, it stores the **templates and intermediate representations** that become code.

## What the Bobbin Holds

- **Templates**: MEJS templates for each language/target
- **Gradle Blocks**: Pre-wound Gradle configuration blocks (Rust build tasks, etc.)
- **IR Cache**: Intermediate representations of parsed WARP.ts
- **Transform Rules**: How to translate patterns to code

## MEJS Template Syntax

The Bobbin uses **MEJS** (Moustacheod-EJS) templates—moustache-style syntax that compiles to EJS.

### Comments
```mejs
{# This is a comment - won't appear in output #}
```

### Output
```mejs
{{ variable }}           {# Unescaped output (default for code gen) #}
{h variable }            {# HTML-escaped output #}
```

### Control Flow
```mejs
{% if condition %}
  {{ value }}
{% endif %}

{% for item in items %}
  {{ item.name }}
{% endfor %}

{% while condition %}
  {{ value }}
{% endwhile %}
```

### Helpers
```mejs
{{ h.pascalCase(name) }}     {# PascalCase conversion #}
{{ h.camelCase(name) }}      {# camelCase conversion #}
{{ h.snakeCase(name) }}      {# snake_case conversion #}
{{ h.kebabCase(name) }}      {# kebab-case conversion #}
{{ h.indent(code, 4) }}      {# Indent by N spaces #}
```

### Method Helpers

When iterating over `methods` from the treadle context, each method provides:

```mejs
{% for method in methods %}
  {# Function signature with modifiers - handles params, return type, everything! #}
  {{ method.signature }}
  
  {# With variant modifiers (pub, async, etc.) #}
  {{ method.pub.async.signature }}
  
  {# Just the parameters #}
  {{ method.params }}
  
  {# Parameter names as array - useful for invocation #}
  {{ method.paramNames.join(', ') }}
  
  {# Return type - LanguageType with smart toString() #}
  -> {{ method.returnType }}
  
  {# Stub value for mocks/tests #}
  {{ method.returnType.stub }}
  
  {# Language-specific variants (rs=Rust, kt=Kotlin, ts=TypeScript) #}
  {# method.name respects each language's naming conventions #}
  {{ method.rs.name }}      {# snake_case in Rust #}
  {{ method.ts.name }}      {# camelCase in TypeScript #}
  {{ method.kt.name }}      {# camelCase in Kotlin #}
{% endfor %}
```

#### The Power of `method.signature`

`method.signature` is the most powerful helper - it generates the complete function
signature including modifiers, name, parameters, and return type. It works correctly
across all target languages:

```mejs
{# Rust #}
{{ method.rs.signature }}
{# → pub fn add_bookmark(url: String) -> Result<(), Error> #}

{# TypeScript #}
{{ method.ts.signature }}
{# → async addBookmark(url: string): Promise<void> #}

{# Kotlin #}
{{ method.kt.signature }}
{# → fun addBookmark(url: String): Result<Error> #}

{# AIDL (Android IPC) #}
{{ method.kt.signature }}
{# → void addBookmark(String url) #}
```

**Best Practice**: Use `method.signature` instead of manually constructing signatures:

```mejs
{# DON'T do this - fragile and language-specific #}
fn {{ method.name }}({{ method.params }}) -> {{ method.returnType }}

{# DO this - robust and cross-language #}
{{ method.signature }}
```

### LanguageType Smart Rendering

`method.returnType` returns a `LanguageType` object that renders intelligently:

```mejs
{# All equivalent - the type name is printed #}
{{ method.returnType }}
{{ method.returnType.name }}

{# Access case variations via the Name object #}
{{ method.returnType.name.snakeCase }}
{{ method.returnType.name.pascalCase }}

{# Get a stub/default value for the type #}
{{ method.returnType.stub }}
{# Result<String, Error> → Ok("") #}
{# Option<i32> → None #}
```

### Name Class Case Accessors

The `Name` class (used for entities, services, methods) provides case variations:

```mejs
{% for mgmt in managements %}
  {{ mgmt.serviceName.pascalCase }}   {# BookmarkService #}
  {{ mgmt.entityName.camelCase }}     {# bookmark #}
  {{ mgmt.moduleName.snakeCase }}     {# bookmark #}
  {{ mgmt.portName.pascalCase }}      {# BookmarkPort #}
{% endfor %}
```

**Note**: For `method.name`, prefer using `method.rs.name`, `method.ts.name`, etc. which automatically apply the correct naming convention for each language. Only use explicit case accessors (`.pascalCase`, `.snakeCase`) when you need a specific case for file paths or special naming requirements.

### File Extension
MEJS templates use `.mejs` extension and live in `machinery/bobbin/{target}/`.

## The Bobbin's Secret

The bobbin doesn't just *store*—it *prepares*. Thread wound on a bobbin is ready to fly through the warp without tangling. Similarly, our templates are pre-compiled, cached, and ready for rapid generation.

---

*Part of the [machinery](../). Preceded by [heddles](../heddles/) (pattern matching), followed by the [shuttle](../shuttle/) which carries this thread to the warp.*
