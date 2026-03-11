/**
 * Scrim-Loom WARP 🦡
 *
 * The weaving abstraction with AAAArchi integration.
 * Mirrors spire-loom's API while adding architectural validation.
 */

export { Struct, Field, Link, Service, crud } from './decorators.js';
export type {
  ScrimStructConfig,
  ScrimFieldConfig,
  ScrimLinkConfig,
  ScrimServiceConfig
} from './decorators.js';

// Re-export spire-loom's spiral for compatibility
// Note: Using direct .ts imports since spire-loom exports point to source
export { spiral, spiralCore } from '@o19/spire-loom/warp/spiral';

// The scrim namespace
import { Struct, Field, Link, Service, crud } from './decorators.js';

export const scrim = {
  Struct,
  Field,
  Link,
  Service,
  crud
} as const;
