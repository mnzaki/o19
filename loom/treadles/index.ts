/**
 * Custom Treadles for foundframe
 *
 * These treadles extend spire-loom's code generation capabilities
 * for foundframe-specific patterns.
 */

// DbBindingTreadle - Generates Rust DbActor traits and commands
export { dbBindingTreadle, type DbBindingConfig } from './dbbindings.js';

// KyselyAdaptorTreadle - Generates TypeScript Kysely adaptor implementations
export { kyselyAdaptorTreadle, type KyselyAdaptorConfig } from './kysely-adaptor.js';

// TauriAndroidCommandsTreadle - Generates Kotlin service client and Tauri plugin
export {
  tauriAndroidCommandsTreadle,
  type TauriAndroidGenerationOptions
} from './tauri-android-commands.js';

// DddServicesTreadle - Generates domain services, ports, and adaptors
export {
  dddServicesTreadle,
  type ManagementService,
  type ServiceMethod
} from './ddd-services.js';
