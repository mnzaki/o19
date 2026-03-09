# Treadle Kit 🧰

The Treadle Kit provides the foundation for building code generators (treadles) in spire-loom. It handles method collection, language enhancement, and file generation.

## Quick Start

```typescript
import { declareTreadle, generateFromTreadle } from './index.js';

export const myTreadle = declareTreadle({
  // Match condition: when does this treadle run?
  matches: [{ current: 'RustCore', previous: 'ExternalLayer' }],
  
  // New files to generate
  newFiles: [
    {
      template: 'commands.rs.mejs',
      path: 'src/commands.rs'
    }
  ]
});

export const generate = generateFromTreadle(myTreadle);
```

## Language Handling

### Automatic Language Detection

The target language is **automatically detected** from the template filename using the double-extension pattern:

| Template | Detected Language | File Extension |
|----------|------------------|----------------|
| `service.kt.mejs` | Kotlin | `.kt` |
| `commands.rs.mejs` | Rust | `.rs` |
| `interface.aidl.mejs` | AIDL | `.aidl` |
| `types.ts.mejs` | TypeScript | `.ts` |

When `kit.generateFiles()` is called, the language is automatically added to methods and entities, enabling language-specific accessors in templates:

```ejs
// In a .rs.mejs template
<% methods.forEach(method => { %>
  // Access Rust-specific variant: method.rs.returnType
  fn <%= method.rs.name %>() -> <%= method.rs.returnType.name %>
<% }) %>
```

### Manual Language Addition (Multi-Language Files)

Sometimes you need multiple languages in one template (e.g., JNI bridges need both Rust and Kotlin). Use `kit.language.add()`:

```typescript
export const jniTreadle = declareTreadle({
  matches: [{ current: 'RustAndroidSpiraler', previous: 'RustCore' }],
  
  async generate(kit, current, previous) {
    // Add both languages for JNI bridge generation
    kit.language.add('rust', 'kotlin');
    
    // Now methods have both .rs and .kt accessors
    const data = {
      rustMethods: kit.context.shed.methods.map(m => m.rs),
      kotlinMethods: kit.context.shed.methods.map(m => m.kt)
    };
    
    return kit.generateFiles([
      { template: 'jni_bridge.rs.mejs', path: 'src/jni.rs' },
      { template: 'kotlin_service.kt.mejs', path: 'android/Service.kt' }
    ], data);
  }
});
```

### Accessing Languages in Templates

Once a language is added (automatically or manually), methods and entities get language-specific accessors:

```ejs
// Single language template (language auto-detected)
<% for (const method of methods) { %>
  // method.lang is the auto-detected language
  fn <%= method.lang.name %>() -> <%= method.lang.returnType.name %>
<% } %>

// Multi-language template (languages manually added)
<% for (const method of methods) { %>
  // Rust variant
  fn <%= method.rs.name %>() -> <%= method.rs.returnType.name %>
  
  // Kotlin variant  
  fun <%= method.kt.name %>(): <%= method.kt.returnType.name %>
<% } %>
```

## New Files vs Hookups

The declarative API distinguishes between two types of file operations:

### New Files - Generate New Files

**New files** are created in the `spire/` directory from templates.

```typescript
newFiles: [
  // Generated files go into spire/ directory
  { template: 'service.kt.mejs', path: 'android/Service.kt' },
  { template: 'interface.aidl.mejs', path: 'aidl/IInterface.aidl' },
  { template: 'commands.rs.mejs', path: 'src/commands.rs' }
]
```

**Characteristics:**
- Files are **created** (not modified)
- Go into the `spire/` directory
- Use templates (`.mejs` files)
- Language auto-detected from template extension
- Can use `{placeholders}` in paths

### Hookups - Modify Existing Files

**Hookups** modify existing external files outside of `spire/`.

```typescript
hookups: [
  // Modify existing AndroidManifest.xml
  {
    path: 'src/main/AndroidManifest.xml',
    permissions: [
      { name: 'android.permission.FOREGROUND_SERVICE' }
    ],
    services: [
      { name: '.service.MyService', exported: false }
    ]
  },
  // Modify existing build.gradle.kts
  {
    path: 'build.gradle.kts',
    plugins: [{ id: 'com.android.application' }]
  }
]
```

**Characteristics:**
- Files are **modified** (not created)
- Target files exist outside `spire/` (e.g., `AndroidManifest.xml`, `Cargo.toml`)
- Use declarative specs (not templates)
- Hookup type auto-detected from file path
- Idempotent - safe to run multiple times

### Complete Example

```typescript
export const androidTreadle = declareTreadle({
  // ... match, methods, data ...
  
  // Generate new files into spire/
  newFiles: [
    // Kotlin service implementation
    { template: 'android/service.kt.mejs', path: 'android/java/{packagePath}/{serviceName}.kt' },
    // AIDL interface (generated, not modified)
    { template: 'android/aidl_interface.aidl.mejs', path: 'android/aidl/{packagePath}/{interfaceName}.aidl' },
    // AIDL callback (also generated)
    { template: 'android/aidl_callback.aidl.mejs', path: 'android/aidl/{packagePath}/IEventCallback.aidl' },
    // Rust JNI bridge
    { template: 'android/jni_bridge.rs.mejs', path: 'src/lib.rs' }
  ],
  
  // Modify existing external files
  hookups: [
    // Add permissions and service declaration to manifest
    {
      path: 'src/main/AndroidManifest.xml',
      permissions: [
        { name: 'android.permission.FOREGROUND_SERVICE' }
      ],
      services: [
        { 
          name: '.service.{serviceName}', 
          process: ':{coreName}',
          foregroundServiceType: 'dataSync'
        }
      ]
    },
    // Add plugins and source sets to gradle
    {
      path: 'build.gradle.kts',
      plugins: [
        { id: 'com.android.application' },
        { id: 'org.mozilla.rust-android-gradle.rust-android' }
      ],
      android: {
        sourceSets: {
          main: {
            aidl: { srcDirs: ['spire/android/aidl'] }
          }
        }
      }
    }
  ]
});
```

### Common Mistake

❌ **Wrong:** Adding a generated file as a hookup
```typescript
// Don't do this - IEventCallback.aidl is generated, not modified!
hookups: [
  { path: 'spire/android/aidl/IEventCallback.aidl', ... }  // ❌ Wrong
]

// Do this instead - add it to newFiles
newFiles: [
  { template: 'aidl_callback.aidl.mejs', path: 'android/aidl/IEventCallback.aidl' }  // ✓ Correct
]
```

## API Reference

### `createTreadleKit(context)`

Creates a kit instance for use in `generate` functions.

```typescript
const kit = createTreadleKit(context);
```

### `kit.language`

Language management interface:

- `kit.language.add(...langs: string[])` - Add languages to methods/entities
- `kit.language.isEnhanced` - Check if any languages have been added
- `kit.language.languages` - Get list of added language keys

### `kit.generateFiles(outputs, data)`

Generate files from templates with automatic language detection.

```typescript
const files = await kit.generateFiles([
  { template: 'service.kt.mejs', path: 'Service.kt' },
  { template: 'interface.aidl.mejs', path: 'IInterface.aidl' }
], data);
```

Each new file spec can have:
- `template` - Template filename (searched workspace → package → builtin)
- `path` - Output path with optional `{placeholders}`
- `condition` - Optional condition function `(context) => boolean`
- `context` - Extra template data merged with main data

### `kit.hookup`

Integration hooks for external files:

- `kit.hookup.android(data)` - Android manifest and gradle integration
- `kit.hookup.rustCrate(packageDir, moduleName)` - Rust crate registration
- `kit.hookup.tauriPlugin(options)` - Tauri plugin integration

## Creating a New Treadle

1. **Declare the treadle** using `declareTreadle()`
2. **Define match conditions** for when it should run
3. **Specify newFiles** with templates and paths
4. **Export a generator** using `generateFromTreadle()`

See existing treadles in `machinery/treadles/` for examples.

## Language Definitions

Languages are defined in `warp/{language}.ts` and self-register. To add a new language:

1. Create `warp/{language}.ts` with `declareLanguage()`
2. Export a TypeFactory with type mappings
3. Define syntax (keywords, type constructors)
4. Add function variants (async, public, etc.)

The language will be auto-detected from template extensions.
