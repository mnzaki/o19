# Hookup Plan: Fresh Tauri → Integration Test Harness

> *"From vanilla to circularity, through declarative transformation."*

This plan uses the spire-loom hookup system to transform a fresh `pnpm create tauri-app` vanilla template into the integration test harness.

## Starting Point

```
MyTauriApp/ (fresh from pnpm create tauri-app)
├── package.json          # Basic Tauri deps
├── vite.config.ts        # Standard Vite config
├── index.html            # Basic HTML
├── src/
│   ├── main.ts           # Vanilla TS
│   ├── styles.css
│   └── assets/
└── src-tauri/
    ├── Cargo.toml        # Basic Tauri Rust
    ├── src/main.rs       # Standard main
    └── src/lib.rs        # Standard lib
```

## Target State

```
MyTauriApp/
├── package.json          # + @o19/foundframe-tauri
├── vite.config.ts        # (unchanged)
├── index.html            # (unchanged)
├── src/
│   ├── main.ts           # + test mode switch
│   ├── lib/test-circularity/  # Test framework
│   └── ...
└── src-tauri/
    ├── Cargo.toml        # + o19-foundframe-tauri
    └── src/lib.rs        # + plugin initialization
```

---

## Required Hookups

### Hookup 1: NPM Package Dependencies

**Type:** `NpmPackageHookup`  
**Target:** `package.json`  
**Action:** Add workspace dependency

```typescript
{
  path: 'package.json',
  dependencies: {
    '@o19/foundframe-tauri': 'workspace:*'
  },
  scripts: {
    'test:circularity:integration': 'tauri dev',
    'test:circularity:integration:ci': 'CI=true tauri dev'
  }
}
```

**Generated Change:**
```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-opener": "^2",
    "@o19/foundframe-tauri": "workspace:*"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test:circularity:integration": "tauri dev",
    "test:circularity:integration:ci": "CI=true tauri dev"
  }
}
```

---

### Hookup 2: Cargo.toml Dependencies

**Type:** `CargoTomlHookup`  
**Target:** `src-tauri/Cargo.toml`  
**Action:** Add Rust workspace dependency

```typescript
{
  path: 'src-tauri/Cargo.toml',
  dependencies: {
    'o19-foundframe-tauri': { path: '../../../crates/foundframe-tauri' }
  }
}
```

**Generated Change:**
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
o19-foundframe-tauri = { path = "../../../crates/foundframe-tauri" }
```

---

### Hookup 3: Tauri Plugin Initialization (Rust)

**Type:** `RustModuleHookup`  
**Target:** `src-tauri/src/lib.rs`  
**Action:** Add plugin to Tauri builder

```typescript
{
  path: 'src-tauri/src/lib.rs',
  // Find the .plugin() chain and add our plugin
  pluginInit: {
    fnName: 'init',
    stateType: '',
    setup: '.plugin(o19_foundframe_tauri::init())'
  }
}
```

**Current lib.rs:**
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**After Hookup:**
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(o19_foundframe_tauri::init())  // <-- INJECTED
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Hookup 4: Test Framework Module Generation

**Type:** `OutputSpec[]` (File generation, not hookup)  
**Target:** `src/lib/test-circularity/*.ts`

Files to generate:
- `src/lib/test-circularity/index.ts` - Public exports
- `src/lib/test-circularity/runner.ts` - TestRunner class
- `src/lib/test-circularity/suites/bookmark-tests.ts` - Bookmark tests
- `src/lib/test-circularity/suites/device-tests.ts` - Device tests

These are **generated files** (not hookups) created via treadle `outputs`.

---

### Hookup 5: Test Mode Entry Point

**Type:** `FileBlockHookup`  
**Target:** `src/main.ts`  
**Action:** Prepend test mode detection

```typescript
{
  path: 'src/main.ts',
  language: 'typescript',
  position: { before: 'import' },
  content: `
// CIRCULARITY TEST MODE
// Auto-detect and run tests in CI mode
if (import.meta.env.CI) {
  import('./lib/test-circularity/index.js').then(({ TestRunner, bookmarkTestSuite, deviceTestSuite }) => {
    const runner = new TestRunner();
    runner.runAll([bookmarkTestSuite, deviceTestSuite]).then(report => {
      console.log('Tests complete:', report);
      process.exit(report.failed > 0 ? 1 : 0);
    });
  });
}
// NORMAL APP MODE
else {
  // ... existing main.ts content ...
}
`
}
```

**Alternative (safer):** Generate `src/test-entry.ts` alongside `main.ts`, switch via vite config.

---

### Hookup 6: Vite Config Multi-Entry (Optional)

**Type:** `FileBlockHookup`  
**Target:** `vite.config.ts`  
**Action:** Add conditional entry point

```typescript
{
  path: 'vite.config.ts',
  language: 'typescript',
  position: { after: 'export default defineConfig' },
  content: `
  build: {
    rollupOptions: {
      input: process.env.CIRCULARITY_TEST 
        ? './src/test-entry.ts' 
        : './src/main.ts'
    }
  },
`
}
```

---

## Hookup Implementation Status

| Hookup | Type | Status | Notes |
|--------|------|--------|-------|
| NPM Package | `NpmPackageHookup` | ✅ Types exist, needs handler | Add to `shuttle/hookups/npm.ts` |
| Cargo.toml | `CargoTomlHookup` | 🚧 Types exist, needs handler | Add to `shuttle/hookups/cargo-toml.ts` |
| Rust Plugin Init | `RustModuleHookup` | 🚧 Types exist, needs handler | Inject `.plugin()` chain |
| Test Files | `OutputSpec[]` | ✅ Works today | Treadle `outputs` array |
| Test Entry | `FileBlockHookup` | ✅ Works today | Use file-block hookup |
| Vite Config | `FileBlockHookup` | ✅ Works today | Use file-block hookup |

---

## Treadle Definition (Reference)

```typescript
// loom/treadles/integration-test-harness.ts
import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const integrationTestHarnessTreadle = defineTreadle({
  name: 'integration-test-harness',
  
  // No matches - applied via .tieup() to MyTauriApp
  
  outputs: [
    // Generate test framework files
    {
      template: 'test-harness/runner.ts.ejs',
      path: 'src/lib/test-circularity/runner.ts',
      language: 'typescript'
    },
    {
      template: 'test-harness/index.ts.ejs',
      path: 'src/lib/test-circularity/index.ts',
      language: 'typescript'
    },
    {
      template: 'test-harness/bookmark-tests.ts.ejs',
      path: 'src/lib/test-circularity/suites/bookmark-tests.ts',
      language: 'typescript'
    }
  ],
  
  hookups: [
    // 1. NPM dependencies
    {
      path: 'package.json',
      dependencies: {
        '@o19/foundframe-tauri': 'workspace:*'
      },
      scripts: {
        'test:circularity:integration': 'tauri dev',
        'test:circularity:integration:ci': 'CI=true tauri dev'
      }
    },
    
    // 2. Cargo dependencies
    {
      path: 'src-tauri/Cargo.toml',
      dependencies: {
        'o19-foundframe-tauri': { path: '../../../crates/foundframe-tauri' }
      }
    },
    
    // 3. Rust plugin initialization
    {
      path: 'src-tauri/src/lib.rs',
      pluginInit: {
        setup: '.plugin(o19_foundframe_tauri::init())'
      }
    },
    
    // 4. Test entry point
    {
      path: 'src/test-entry.ts',
      language: 'typescript',
      content: '// Generated test entry...'
    }
  ]
});
```

---

## Manual Steps (Until Hookups Ready)

Since hookup handlers aren't fully implemented, manual steps:

```bash
cd o19/apps/MyTauriApp

# 1. Add NPM dependency
pnpm add @o19/foundframe-tauri

# 2. Add Cargo dependency (edit src-tauri/Cargo.toml)
# Add: o19-foundframe-tauri = { path = "../../../crates/foundframe-tauri" }

# 3. Add plugin init (edit src-tauri/src/lib.rs)
# Add .plugin(o19_foundframe_tauri::init()) to the builder chain

# 4. Copy test framework files
cp -r ../path/to/test-circularity src/lib/

# 5. Create test entry point (src/test-entry.ts)
# Import and run tests

# 6. Run tests
pnpm test:circularity:integration
```

---

## Success Criteria

- [ ] `pnpm test:circularity:integration` starts Tauri app
- [ ] Tests auto-run on startup
- [ ] Console shows test results
- [ ] Exit code reflects pass/fail (CI mode)

---

> *"The hookup system transforms the vanilla seed into the circularity tree."*
