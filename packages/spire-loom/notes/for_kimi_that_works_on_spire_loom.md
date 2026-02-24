# For Kimi Working on Spire-Loom

> *"The loom improves itself through use."*

This document captures insights, feedback, and improvement ideas for the spire-loom code generator from the perspective of a Kimi working on it.

---

## Current State (February 2026)

Spire-loom is functional and generating code for:
- ✅ Android JNI bridges (snake_case method names)
- ✅ Tauri plugins (Platform trait, commands, extension)
- ✅ TypeScript adaptors (DDD layer)
- ✅ Smart header comments with template paths

---

## Feedback & Improvement Ideas

### 1. Template Lookup Priority (HIGH PRIORITY)

**Current:** Templates resolve from builtin dir only (via `getBuiltinTemplateDir()`)

**Desired:** Priority order:
1. Absolute paths (explicit)
2. Workspace `loom/bobbin/<template-path>` (custom override)
3. Builtin `node_modules/@o19/spire-loom/machinery/bobbin/` (default)

**Implementation Hint:** In `code-generator.ts`, modify template resolution:
```typescript
function resolveTemplate(template: string): string {
  if (path.isAbsolute(template)) return template;
  
  // Check workspace override first
  const workspaceTemplate = path.join(workspaceRoot, 'loom', 'bobbin', template);
  if (fs.existsSync(workspaceTemplate)) return workspaceTemplate;
  
  // Fall back to builtin
  return path.join(getBuiltinTemplateDir(), template);
}
```

**Use Case:** Projects can customize templates without forking spire-loom.

---

### 2. Method Body Generation Abstraction

**Observation:** Android JNI and DesktopPlatform share similar Rust patterns:
```rust
// Field access with Option unwrapping
let __field = service.thestream.as_ref().ok_or("...")?;

// Mutex locking
let mut __service = __field.lock().map_err(|_| "...")?;

// Method delegation  
Ok(__service.add_bookmark(...))
```

**Idea:** Create a shared `generateRustMethodBody(method, context)` utility:
- Input: Method metadata, field access path (e.g., `service.thestream`)
- Output: Rust code block
- Used by: Both JNI and Desktop templates

**Benefit:** Consistent error handling, easier maintenance.

---

### 3. Template Validation/Warmup

**Issue:** Template errors only show at generation time (runtime for loom)

**Idea:** Add `validate-templates` CLI command:
- Parses all `.ejs` files
- Checks for syntax errors
- Validates required template variables
- Reports unused variables

**Usage:**
```bash
pnpm spire-loom --validate-templates
```

---

### 4. Incremental Generation

**Issue:** Currently regenerates all files even if only one Management changes

**Idea:** Add timestamp/hash checking:
- Store template + data hash per output file
- Only regenerate if hash changed
- Skip unchanged files (faster dev cycles)

**Implementation:** Add to `generateCode()`:
```typescript
const hash = computeHash(templateContent, JSON.stringify(data));
if (storedHash === hash && fs.existsSync(outputPath)) {
  return { path: outputPath, unchanged: true };
}
```

---

### 5. Better Error Context

**Current:** EJS errors show line numbers but lack context

**Desired:** When template fails, show:
- Template name
- Line number with surrounding lines
- The data that was passed (sanitized)
- Suggested fixes

**Example:**
```
❌ Template Error in 'tauri/desktop.rs.ejs' line 42:
   
   40 | fn <%= method.name %>() {
   41 |   let x = <%= undefined_variable %>;
   42 |                        ^
   
   Variable 'undefined_variable' not found in data.
   Available: method, coreName, coreCrateName, ...
```

---

### 6. Plugin Architecture for Transforms

**Current:** Transforms are hardcoded in `transformForRust()`, etc.

**Idea:** Plugin system for custom transformations:
```typescript
// In loom/WARP.ts
@loom.transform('rust', myCustomTransform)
class MyMgmt { ... }

// Transform function
function myCustomTransform(method: RawMethod): RustMethod {
  // Custom logic
}
```

**Benefit:** Projects can add custom transformations without modifying spire-loom.

---

### 7. Template Composition/Inheritance

**Issue:** Duplicated boilerplate across templates (header comments, imports)

**Idea:** EJS includes with relative paths:
```ejs
<%- include('../partials/rust-header.ejs', { coreName }) %>
<%- include('../partials/rust-imports.ejs', { coreCrateName }) %>
```

**Benefit:** DRY templates, easier to update shared sections.

---

### 8. Live Reload for Templates

**Use Case:** Developer editing template wants to see results immediately

**Idea:** Watch mode for spire-loom:
```bash
pnpm spire-loom --watch
# Regenerates when templates or loom/*.ts change
```

**Implementation:** Use `fs.watch()` or `chokidar` package.

---

### 9. Method Link Validation

**Current:** `@loom.link(foundframe.inner.core.thestream)` attaches metadata but doesn't validate

**Idea:** Validate link paths at generation time:
- Check that linked field exists in target struct
- Verify type compatibility (e.g., `Option<Mutex<T>>` pattern)
- Warn if field not found

**Benefit:** Catch errors early, not at Rust compile time.

---

### 10. Output Diff/Patch Mode

**Use Case:** Review changes before applying

**Idea:** Dry-run with diff output:
```bash
pnpm spire-loom --dry-run --diff
# Shows:
# --- crates/foundframe-tauri/spire/src/platform.rs (current)
# +++ crates/foundframe-tauri/spire/src/platform.rs (generated)
# @@ -35,7 +35,7 @@
#  fn bookmark_add_bookmark(
```

**Benefit:** Confidence in what will change before regeneration.

---

## Recent Changes (Chronological)

### February 2026 - Session 2

**Added:**
- Smart header comments with template paths and override instructions
- Snake case method naming fix for Tauri Platform trait
- DesktopPlatform template with foundframe initialization
- Spire README template explaining two-platform architecture

**Fixed:**
- Method names now consistently snake_case across all generators
- Template errors show actual file paths

---

## Notes for Next Kimi

When working on spire-loom:
1. **Test template changes** - Run `pnpm spire-loom` after any template edit
2. **Check header comments** - Ensure they show correct template paths
3. **Validate snake_case** - All Rust method names should be snake_case
4. **Update this file** - Add insights as you discover them

The loom learns from use. Even these notes need conservation.

---

*Last updated by Kimi, February 2026*
*Weaving the weft, spiraling toward spirali.ty*
