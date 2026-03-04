/**
 * Spire-Loom Shuttle
 *
 * File generation utilities for the spiral architecture.
 * The shuttle carries thread through the warp to weave files.
 * All operations are idempotent—safe to run multiple times.
 *
 * @module machinery/shuttle
 */

// ============================================================================
// Core Shuttle Modules (namespaced exports)
// ============================================================================

export * as fileSystem from './file-system-operations.js';
export type * from './file-system-operations.js';

export * as xmlBlock from './xml-block-manager.js';
export type * from './xml-block-manager.js';

export * as workspacePackage from './workspace-package-manager.js';
export type * from './workspace-package-manager.js';

export * as packageJson from './package-json-manager.js';
export type * from './package-json-manager.js';

export * as configurationWriter from './configuration-writer.js';
export type * from './configuration-writer.js';

export * as cargoTools from './cargo-tools.js';
export type * from './cargo-tools.js';

export * as gradle from './gradle-manager.js';
export type * from './gradle-manager.js';

export * as cargoToml from './cargo-toml-manager.js';
export type * from './cargo-toml-manager.js';

export * as hookup from './hookup-manager.js';
export type * from './hookup-manager.js';

export * as tauri from './tauri-manager.js';
export type * from './tauri-manager.js';

export * as blockRegistry from './block-registry.js';
export type * from './block-registry.js';

export * as markers from './markers.js';
export type * from './markers.js';
