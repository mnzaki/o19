# spire-loom Examples

This directory contains example files demonstrating how to extend spire-loom with custom treadles (generators) and bobbins (templates).

## Directory Structure

```
examples/
└── loom/
    ├── treadles/           # Custom generator examples
    │   └── custom-api.ts
    └── bobbin/             # Custom template examples
        └── rust/
            └── custom-handler.rs.ejs
```

## Usage

To use these examples in your project:

### 1. Custom Treadle (Generator)

Copy the example to your project's `loom/treadles/`:

```bash
cp examples/loom/treadles/custom-api.ts /path/to/your/project/loom/treadles/
```

Then customize it for your needs:

```typescript
import { definePlatformWrapperTreadle } from '@o19/spire-loom/machinery';

export default definePlatformWrapperTreadle({
  name: 'my-custom-treadle',
  platform: 'tauri',  // or 'android', 'desktop', 'ios'
  phase: 'generation',
  
  async generate(context) {
    // Access spiral metadata
    const spiral = context.spiral;
    const methods = context.management?.methods || [];
    
    // Generate files
    return {
      files: methods.map(method => ({
        path: `generated/${method.name}.rs`,
        content: generateMethodCode(method)
      }))
    };
  }
});
```

### 2. Custom Bobbin (Template)

Copy the example to your project's `loom/bobbin/`:

```bash
cp -r examples/loom/bobbin/rust /path/to/your/project/loom/bobbin/
```

Templates use EJS syntax:
- `<%= variable %>` - Output escaped value
- `<%- variable %>` - Output unescaped value
- `<% code %>` - Execute code (no output)
- `<%# comment %>` - Comment

Available variables in templates:
- `management` - The management class metadata
- `method` - The current method being generated
- `spiral` - The spiral object
- `config` - Additional configuration

### 3. Verify in Dressing Editor

After adding custom treadles/bobbins, verify they're loaded:

```bash
spire-loom --interactive
```

Navigate to "Inspect Dressing" to see your custom components listed.

## More Examples

See the `machinery/bobbin/` directory for built-in templates used by the default generators.

## The Dressing

The Dressing (loaded by `DressingService`) discovers:

- **treadles** - All `.ts` files in `loom/treadles/`
- **bobbins** - All `.ejs`, `.hbs`, `.mustache` files in `loom/bobbin/`

Run `spire-loom --interactive` → "Inspect Dressing" to see what's loaded.
