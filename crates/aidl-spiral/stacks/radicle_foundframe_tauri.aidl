// radicle_foundframe_tauri.aidl
// Stack: Radicle (data) → Foundframe (domain) → Tauri (user)
//
// This is the architecture configuration for the foundframe stack,
// using Radicle for content-addressed storage and Tauri for cross-platform UI.
//
// To use: Copy or symlink this file as meta.aidl in your AIDL directory:
//   cp stacks/radicle_foundframe_tauri.aidl aidl/meta.aidl
//
// The spiral configures itself.

package aidl.config;

/**
 * Architecture: Radicle → Foundframe → Tauri
 * 
 * Data flow: Git/Radicle storage → Domain logic → Tauri commands → TypeScript UI
 * Process model: Android (remote service) | Desktop (in-process)
 * 
 * Rings:
 *   0. Contract (AIDL)     - Source of truth
 *   1. Binding (Java)      - Android service stubs
 *   2. Bridge (Rust)       - JNI glue, serialization
 *   3. Core (Rust)         - Foundframe domain logic
 *   4. Platform (Rust)     - Desktop/Android abstraction
 *   5. Interface (Rust)    - Tauri command handlers
 *   6. Front (TypeScript)  - User-facing adaptors
 */
interface IMetaArchitecture {
    
    /** Ring definitions for this stack */
    Ring[] getRings();
    
    /** Managements to generate code for (populated from other .aidl files) */
    String[] getManagements();
    
    /** Global configuration */
    Config getConfig();
    
    /** Stack metadata */
    StackInfo getStackInfo();
}

/** Ring definition - horizontal concern */
parcelable Ring {
    /** Ring name */
    String name;
    
    /** Order from center (0 = innermost/Contract) */
    int order;
    
    /** 
     * What this ring produces:
     * - Aidl: Interface definition
     * - Stub: Language-specific stub
     * - JniGlue: JNI exports
     * - ServiceImpl: Service implementation template
     * - PlatformTrait: Platform abstraction
     * - PlatformImpl: Platform implementation
     * - TauriCommands: Tauri command handlers
     * - TsAdaptor: TypeScript adaptor
     * - TsIndex: TypeScript exports
     */
    String artifactType;
    
    /**
     * Target language:
     * - InterfaceDefinition (AIDL)
     * - Java
     * - Kotlin
     * - Rust
     * - TypeScript
     * - Swift
     */
    String language;
}

/** Global configuration */
parcelable Config {
    /** Project name (e.g., "foundframe") */
    String projectName;
    
    /** Base package/namespace (e.g., "ty.circulari.o19") */
    String basePackage;
    
    /** Output directory relative to workspace root */
    String outputDir;
    
    /** Architecture version */
    String version;
}

/** Stack metadata */
parcelable StackInfo {
    /** Stack identifier */
    String name;
    
    /** Human-readable description */
    String description;
    
    /** Data layer (innermost) */
    String dataLayer;
    
    /** Domain layer (middle) */
    String domainLayer;
    
    /** UI layer (outermost) */
    String uiLayer;
    
    /** Supported platforms */
    String[] platforms;
}

/*
 * Default configuration values for this stack:
 * 
 * Rings (7 total):
 *   Ring 0: Contract, 0, Aidl, InterfaceDefinition
 *   Ring 1: Binding, 1, Stub, Java
 *   Ring 2: Bridge, 2, JniGlue, Rust
 *   Ring 3: Core, 3, ServiceImpl, Rust
 *   Ring 4: Platform, 4, PlatformTrait, Rust
 *   Ring 5: Interface, 5, TauriCommands, Rust
 *   Ring 6: Front, 6, TsAdaptor, TypeScript
 * 
 * Config:
 *   projectName: "foundframe"
 *   basePackage: "ty.circulari.o19"
 *   outputDir: "./gen"
 *   version: "0.1.0"
 * 
 * StackInfo:
 *   name: "radicle_foundframe_tauri"
 *   description: "Radicle storage → Foundframe domain → Tauri UI"
 *   dataLayer: "radicle"
 *   domainLayer: "foundframe"
 *   uiLayer: "tauri"
 *   platforms: ["android", "desktop"]
 */
