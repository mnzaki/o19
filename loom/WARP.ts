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

import loom, { rust } from '@o19/spire-loom';

// ============================================================================
// CORE
// ============================================================================

@rust.Struct
class TheStream {}

@rust.Struct
class DeviceManager {}

export class Foundframe {
  @rust.Mutex
  @rust.Option
  thestream = TheStream;

  @rust.Mutex
  @rust.Option
  device_manager = DeviceManager;
}

//const core = loom.spiral.rust.core({ structs: { Foundframe } });

/**
 * The Core - foundframe (Rust)
 * Package: foundframe
 * Path: o19/crates/foundframe
 *
 * The center that holds. Pure domain logic.
 */
export const foundframe = loom.spiral(Foundframe);

// ============================================================================
// PLATFORM RINGS (spiral out from Core)
// ============================================================================

/**
 * Android Ring - foreground service wrapping Core
 * Package: foundframe-android
 * Path: o19/crates/foundframe-android
 *
 * Runs Core in :foundframe process with foreground service.
 *
 * The service is named IFoundframeRadicle (I{core}Radicle pattern)
 * where 'Radicle' is the nameAffix.
 *
 * gradleNamespace sets the Android package name for the generated code.
 */
export const android = foundframe.android.foregroundService({
  nameAffix: 'radicle',
  gradleNamespace: 'ty.circulari.o19'
});

/**
 * Desktop Ring - direct calls to Core
 * Package: foundframe-desktop
 * Path: o19/crates/foundframe-desktop
 *
 * Desktop apps call Core directly (same process).
 */
export const desktop = spiral.desktop.direct();

/**
 * iOS Ring - future platform support
 * Package: foundframe-ios
 * Path: o19/crates/foundframe-ios
 */
// export const ios = foundframe.ios.service();

// ============================================================================
// AGGREGATION RING (multiplexes platform rings)
// ============================================================================

/**
 * Tauri Ring - aggregates platform rings into a plugin
 * Package: foundframe-tauri
 * Path: o19/crates/foundframe-tauri
 *
 * Tauri routes to different platform rings based on target:
 *   - Desktop → uses desktop ring (direct calls)
 *   - Android → uses android ring (AIDL service)
 *   - iOS → uses ios ring (future)
 */
export const tauri = loom.spiral(android, desktop).tauri.plugin({
  ddd: {
    adaptors: {
      filterOut: ['crud:read']
    }
  }
});

// ============================================================================
// FRONT RINGS (spiral out from Tauri)
// ============================================================================

/**
 * Front Ring - TypeScript domain layer
 * Package: foundframe-front
 * Path: packages/foundframe-front
 *
 * Generates TypeScript domain types and Port interfaces
 * from Management Imprints.
 */
export const front = tauri.typescript.ddd();

/**
 * Drizzle Adaptor Ring - ORM implementation of Ports
 * Package: foundframe-drizzle
 * Path: packages/foundframe-drizzle
 *
 * Implements the Port interfaces defined in front layer
 * using Drizzle ORM. Filtered to read-only operations
 * for this adaptor (can be combined with other adaptors
 * for full CRUD).
 */
export const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] });

/**
 * MyTauriApp - Example application
 * Package: my-tauri-app
 * Path: apps/my-tauri-app
 *
 * The example application demonstrating the stack.
 * This is an app that wraps the front layer.
 */
export const myTauriApp = front.tauri.app({ adaptorOverrides: [drizzle] });

// ============================================================================
// FUTURE RINGS
// ============================================================================

/**
 * Drizzle ORM adaptor
 * Package: foundframe-drizzle
 * Path: packages/foundframe-drizzle
 */
// export const drizzle = foundframe.drizzle.schema();
