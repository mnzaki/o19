/**
 * 🦡 Scrim-Loom
 *
 * The custom warp using AAAArchi for rich architectural validation.
 *
 * Built on spire-loom's foundation but adds:
 * - AAAArchi integration for DAG validation
 * - Ferror for contextual error messages
 * - Orka for saga-based generation
 *
 * Three friends working together: 🦏 + 🦀 + 🐋
 */

// Re-export spire-loom's core (we extend, don't replace)
export {
  // Spiral (enrichment patterns)
  spiral,
  spiralCore
} from '@o19/spire-loom/warp/spiral';

// Re-export our custom warp decorators
export {
  Struct,
  Field,
  Link,
  Service,
  crud
} from './warp/index.js';

export type {
  ScrimStructConfig,
  ScrimFieldConfig,
  ScrimLinkConfig,
  ScrimServiceConfig
} from './warp/index.js';

// Export heddles
export {
  scrimHeddles,
  ScrimHeddles,
  type ScrimManagement,
  type ScrimMethod,
  type ArchitecturalViolation
} from './heddles/index.js';

// Export Weavvy the Warthog
export {
  Weavvy,
  createWeavvy,
  type WeavvyConfig
} from './weaver/index.js';

// ============================================
// SCRIM NAMESPACE (convenience)
// ============================================

import type { Struct as StructFn, Field as FieldFn, Link as LinkFn, Service as ServiceFn, crud as crudFn } from './warp/index.js';
import type { spiral as spiralFn, spiralCore as spiralCoreFn } from '@o19/spire-loom/warp/spiral';
import type { scrimHeddles as heddlesFn } from './heddles/index.js';
import type { createWeavvy as createWeavvyFn, Weavvy as WeavvyClass } from './weaver/index.js';

/**
 * The scrim namespace - your entry point to custom weaving.
 */
export interface ScrimNamespace {
  Struct: typeof StructFn;
  Field: typeof FieldFn;
  Link: typeof LinkFn;
  Service: typeof ServiceFn;
  crud: typeof crudFn;
  spiral: typeof spiralFn;
  spiralCore: typeof spiralCoreFn;
  heddles: typeof heddlesFn;
  createWeavvy: typeof createWeavvyFn;
  Weavvy: typeof WeavvyClass;
}

// ============================================
// METADATA
// ============================================

export const SCRIM_VERSION = '0.1.0';
export const SCRIM_MASCOT = '🦡'; // Warthog!

/**
 * Check all three friends are available.
 */
export function checkFriends(): { available: boolean; friends: string[] } {
  const friends: string[] = [];
  
  try {
    const { AAAArchi } = require('@o19/aaaarchi');
    if (AAAArchi) friends.push('🦏 AAAArchi');
  } catch {
    // Not available
  }
  
  try {
    const { ferroringModule } = require('@o19/ferror');
    if (ferroringModule) friends.push('🦀 Ferror');
  } catch {
    // Not available
  }
  
  try {
    const { Orka } = require('@o19/orka');
    if (Orka) friends.push('🐋 Orka');
  } catch {
    // Not available
  }
  
  return {
    available: friends.length === 3,
    friends
  };
}
