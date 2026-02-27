/**
 * Foundframe-Front Package WARP - TypeScript Domain Layer
 *
 * This is the canonical definition for the foundframe-front package.
 * The workspace WARP imports from here or the package WARP overrides
 * the workspace definition.
 *
 * This package provides:
 * - TypeScript domain types and Port interfaces
 * - DDD service layer
 */

import loom from '@o19/spire-loom';
import { dddServicesTreadle } from '@o19/spire-loom/machinery/treadles';

// ============================================================================
// FRONT SPIRAL - TypeScript Domain Layer
// ============================================================================

/**
 * Front Ring - TypeScript domain layer
 * Package: @o19/foundframe-front
 * Path: packages/foundframe-front
 *
 * Generates TypeScript domain types and Port interfaces
 * from Management Imprints.
 *
 * Tieups are merged with workspace WARP.ts tieups:
 * - Main WARP.ts tieups run first
 * - Package WARP.ts tieups run second (appended)
 */
export const front = loom.spiral.typescript
  .ddd()
  .tieup({
    treadles: [
      {
        treadle: dddServicesTreadle,
        warpData: {}
      }
    ]
  });

// Name must match the export name in workspace WARP.ts
front.name = 'foundframe-front';

export default loom;
