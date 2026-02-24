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
