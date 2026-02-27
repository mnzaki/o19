/**
 * Custom Treadles for foundframe
 *
 * These treadles extend spire-loom's code generation capabilities
 * for foundframe-specific patterns.
 */

// KyselyAdaptorTreadle - Generates TypeScript Kysely adaptor implementations
//export { kyselyAdaptorTreadle, type KyselyAdaptorConfig } from './kysely-adaptor.js';

// TauriAndroidCommandsTreadle - Generates Kotlin service client and Tauri plugin
export * from './tauri-android-commands.js';
export * from './tauri-desktop-platform.js';
export * from './db-event-router.js';
