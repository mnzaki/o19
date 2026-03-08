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

### File Extension
MEJS templates use `.mejs` extension and live in `machinery/bobbin/{target}/`.

## The Bobbin's Secret

The bobbin doesn't just *store*—it *prepares*. Thread wound on a bobbin is ready to fly through the warp without tangling. Similarly, our templates are pre-compiled, cached, and ready for rapid generation.

---

*Part of the [machinery](../). Preceded by [heddles](../heddles/) (pattern matching), followed by the [shuttle](../shuttle/) which carries this thread to the warp.*
