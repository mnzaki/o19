/**
 * Foundframe-Tauri Package WARP - Tauri Plugin Layer
 *
 * This is the canonical definition for the foundframe-tauri package.
 * The workspace WARP imports from here or the package WARP overrides
 * the workspace definition.
 *
 * This package provides:
 * - Tauri plugin bridge between frontend and core
 * - Command handlers for Rust core operations
 * - Platform-specific routing (Android/Desktop)
 */

import loom from '@o19/spire-loom';
import { tauriAdaptorTreadle } from '@o19/spire-loom/machinery/treadles';

// ============================================================================
// TAURI SPIRAL - Plugin Layer
// ============================================================================

/**
 * Tauri Ring - Tauri plugin aggregating platform rings
 * Package: foundframe-tauri
 * Path: o19/crates/foundframe-tauri
 *
 * Generates Tauri plugin code that routes to different platform rings:
 * - Desktop → uses desktop ring (direct calls)
 * - Android → uses android ring (AIDL service)
 * - iOS → uses ios ring (future)
 *
 * Tieups are merged with workspace WARP.ts tieups:
 * - Main WARP.ts tieups run first
 * - Package WARP.ts tieups run second (appended)
 */
export const tauri = loom.spiral.tauri
  .plugin({
    ddd: {
      adaptors: {
        // filterOut: ['crud:read', 'crud:list']  // TEMP: Generate all methods for testing
      }
    },
    // Override core name detection (loom.spiral.tauri creates standalone core)
    coreName: 'foundframe',
    coreCrateName: 'o19-foundframe'
  })
  .tieup({
    treadles: [
      {
        treadle: tauriAdaptorTreadle,
        warpData: {
          pluginName: 'o19-foundframe-tauri',
          entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
          operations: ['create', 'read', 'update', 'delete', 'list']
        }
      }
    ]
  });

// Name must match the export name in workspace WARP.ts
tauri.name = 'foundframe-tauri';

export default loom;
