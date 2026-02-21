# The Bobbin 🧵

> *"The thread must be held before it can be thrown."*

The [bobbin](../) is the spool inside the shuttle that holds the weft thread. In our loom, it stores the **templates and intermediate representations** that become code.

## What the Bobbin Holds

- **Templates**: EJS templates for each language/target
- **Gradle Blocks**: Pre-wound Gradle configuration blocks (Rust build tasks, etc.)
- **IR Cache**: Intermediate representations of parsed WARP.ts
- **Transform Rules**: How to translate patterns to code

## The Bobbin's Secret

The bobbin doesn't just *store*—it *prepares*. Thread wound on a bobbin is ready to fly through the warp without tangling. Similarly, our templates are pre-compiled, cached, and ready for rapid generation.

---

*Part of the [machinery](../). Preceded by [heddles](../heddles/) (pattern matching), followed by the [shuttle](../shuttle/) which carries this thread to the warp.*
