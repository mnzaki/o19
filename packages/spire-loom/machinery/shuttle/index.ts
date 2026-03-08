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

export * as configurationWriter from './configuration-writer.js';
export type * from './configuration-writer.js';

export * as codePrinter from './code-printer.js';
export type * from './code-printer.js';
