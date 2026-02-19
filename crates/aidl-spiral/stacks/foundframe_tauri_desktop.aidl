// foundframe_tauri_desktop.aidl
// Stack: Foundframe (domain) → Tauri (user) - Desktop only
//
// Simplified 6-ring architecture for desktop-only applications.
// No Android/Java binding layer - direct Rust all the way.
//
// To use: Copy or symlink this file as meta.aidl in your AIDL directory:
//   ln -s stacks/foundframe_tauri_desktop.aidl aidl/meta.aidl

package aidl.config;

/**
 * Architecture: Foundframe → Tauri (Desktop only)
 * 
 * Data flow: Domain logic → Tauri commands → TypeScript UI
 * Process model: In-process (no service boundaries)
 * 
 * Rings:
 *   0. Contract (AIDL)     - Source of truth
 *   1. Bridge (Rust)       - FFI (minimal, direct)
 *   2. Core (Rust)         - Foundframe domain logic
 *   3. Platform (Rust)     - Desktop platform
 *   4. Interface (Rust)    - Tauri command handlers
 *   5. Front (TypeScript)  - User-facing adaptors
 */
interface IMetaArchitecture {
    Ring[] getRings();
    String[] getManagements();
    Config getConfig();
    StackInfo getStackInfo();
}

parcelable Ring {
    String name;
    int order;
    String artifactType;
    String language;
}

parcelable Config {
    String projectName;
    String basePackage;
    String outputDir;
    String version;
}

parcelable StackInfo {
    String name;
    String description;
    String dataLayer;
    String domainLayer;
    String uiLayer;
    String[] platforms;
}

/*
 * Default configuration:
 * 
 * Rings (6 total):
 *   Ring 0: Contract, 0, Aidl, InterfaceDefinition
 *   Ring 1: Bridge, 1, Ffi, Rust
 *   Ring 2: Core, 2, ServiceImpl, Rust
 *   Ring 3: Platform, 3, PlatformImpl, Rust
 *   Ring 4: Interface, 4, TauriCommands, Rust
 *   Ring 5: Front, 5, TsAdaptor, TypeScript
 * 
 * StackInfo:
 *   name: "foundframe_tauri_desktop"
 *   description: "Foundframe domain → Tauri UI (desktop only)"
 *   dataLayer: "local"  // or radicle, sqlite, etc.
 *   domainLayer: "foundframe"
 *   uiLayer: "tauri"
 *   platforms: ["desktop"]
 */
