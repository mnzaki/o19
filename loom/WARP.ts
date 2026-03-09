/**
 * O19 WARP - Architecture Definition
 *
 * The loom creates spirals. The spirals create spires.
 *
 * Relationship:
 *   Loom (@o19/spire-loom)
 *     ↓ exposes
 *   Spiral (pattern)
 *     ↓ creates
 *   Spire (generated package)
 *
 * This file defines the foundframe architecture using the loom DSL.
 */

import loom from '@o19/spire-loom';
import { tauriAndroidCommandsTreadle } from './treadles/tauri-android-commands.js';
import { tauriDesktopPlatformTreadle } from './treadles/tauri-desktop-platform.js';
import { appHookupTreadle } from './treadles/app-hookups.js';

// ============================================================================
// PLACEHOLDER SPIRALS - Replaced by Package WARPs
// ============================================================================
// Package WARPs are auto-discovered at {packagePath}/loom/WARP.ts
// and replace these placeholders while merging tieups.

// Placeholder for foundframe - package WARP at o19/crates/foundframe/loom/WARP.ts
export const foundframe = loom.spiral(loom.spiral.rust.core());

// Placeholder for tauri - package WARP at o19/crates/foundframe-tauri/loom/WARP.ts
// Note: Workspace tieups are defined below and will be merged with package WARP tieups
export const tauri = loom.spiral(loom.spiral.tauri.core());
tauri.name = 'foundframe-tauri';

// Placeholder for front - package WARP at packages/foundframe-front/loom/WARP.ts
export const front = loom.spiral(loom.spiral.typescript.core());
front.name = 'foundframe-front';

// ============================================================================
// PLATFORM RINGS (spiral out from Core)
// ============================================================================

/**
 * Android Ring - foreground service wrapping Core
 * Package: foundframe-android
 * Path: o19/crates/foundframe-android
 */
export const android = foundframe.android.foregroundService({
  nameAffix: 'radicle',
  gradleNamespace: 'ty.circulari.o19'
});
android.name = 'foundframe-android';

/**
 * Desktop Ring - direct calls to Core
 * Package: foundframe-desktop
 * Path: o19/crates/foundframe-desktop
 */
export const desktop = foundframe.desktop.direct();

/**
 * iOS Ring - future platform support
 * Package: foundframe-ios
 * Path: o19/crates/foundframe-ios
 */
// export const ios = foundframe.ios.service();

// ============================================================================
// WORKSPACE TIEUPS (merged with package WARP tieups during weaving)
// ============================================================================

// Apply workspace-level tieups to tauri spiral
// These will be merged with package WARP tieups during weaving

tauri.tieup({
  treadles: [
    {
      treadle: tauriAndroidCommandsTreadle,
      config: {
        servicePackage: 'ty.circulari.o19',
        serviceClient: 'FoundframeRadicleClient'
      }
    }
  ]
});

tauri.tieup({
  treadles: [
    {
      treadle: tauriDesktopPlatformTreadle,
      config: {
        coreName: 'foundframe',
        coreCrateName: 'o19-foundframe'
      }
    }
  ]
});

// ============================================================================
// EXAMPLE APPLICATION
// ============================================================================

/**
 * MyTauriApp - Example application
 * Package: my-tauri-app
 * Path: apps/my-tauri-app
 */
export const myTauriApp = loom.spiral.tauri.app().tieup({
  treadles: [
    {
      treadle: appHookupTreadle,
      config: {
        appName: 'MyTauriApp',
        template: 'vanilla'
      }
    }
  ]
});
myTauriApp.name = 'MyTauriApp';

// ============================================================================
// FUTURE RINGS
// ============================================================================

// export const drizzle = foundframe.drizzle.schema();

export default loom;
