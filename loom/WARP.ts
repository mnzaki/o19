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

import loom, { typescript, rust } from '@o19/spire-loom';
import { dbBindingTreadle } from './treadles/dbbindings.js';
import { kyselyAdaptorTreadle } from './treadles/kysely-adaptor.js';
import { tauriAdaptorTreadle } from './treadles/tauri-adaptor.js';
import { tauriAndroidCommandsTreadle } from './treadles/tauri-android-commands.js';
import { dddServicesTreadle } from './treadles/ddd-services.js';
import { tauriDesktopPlatformTreadle } from './treadles/tauri-desktop-platform.js';

// ============================================================================
// CORE
// ============================================================================

@rust.Struct
class TheStream {}

@rust.Struct
class DeviceManager {}

@rust.Struct({ useResult: true })
export class Foundframe {
  @rust.Mutex
  @rust.Option
  thestream = TheStream;

  @rust.Mutex
  @rust.Option
  device_manager = DeviceManager;
}

/**
 * The Core - foundframe (Rust)
 * Package: foundframe
 * Path: o19/crates/foundframe
 *
 * The center that holds. Pure domain logic.
 *
 * With DbActor bindings via custom treadle.
 */
// TODO: Migrate dbBindingTreadle to new TreadleDefinition format
// export const foundframe = loom.spiral(Foundframe).tieup({
//   treadles: [
//     {
//       treadle: dbBindingTreadle,
//       warpData: {
//         entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
//         operations: ['create', 'read', 'update', 'delete', 'list']
//       }
//     }
//   ]
// });
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
android.name = 'foundframe-android';

/**
 * Desktop Ring - direct calls to Core
 * Package: foundframe-desktop
 * Path: o19/crates/foundframe-desktop
 *
 * Desktop apps call Core directly (same process).
 */
export const desktop = foundframe.desktop.direct();

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
export const tauri = loom.spiral.tauri
  .plugin({
    ddd: {
      adaptors: {
        // filterOut: ['crud:read', 'crud:list']  // TEMP: Generate all methods for testing
      }
      /*
      translators: {
        [Foundframe.thestream]: {
          returnValues: streamEntryTranslator
        }
      }
      */
    }
  })
  .tieup({
    treadles: [
      {
        treadle: tauriAndroidCommandsTreadle,
        warpData: {
          servicePackage: 'ty.circulari.o19',
          serviceClient: 'FoundframeRadicleClient'
        }
      }
    ]
  })
  .tieup({
    treadles: [
      {
        treadle: tauriDesktopPlatformTreadle,
        warpData: {}
      }
    ]
  });
tauri.name = 'foundframe-tauri';

// ============================================================================
// FRONT RINGS (spiral out from Tauri)
// ============================================================================

//export const prisma = loom.spiral.typescript.prisma();

/**
 * Front Ring - TypeScript domain layer
 * Package: foundframe-front
 * Path: packages/foundframe-front
 *
 * Generates TypeScript domain types and Port interfaces
 * from Management Imprints.
 *
 * With Kysely adaptor implementations via custom treadle.
 */
export const front = loom.spiral.typescript
  .ddd()
  .tieup({
    treadles: [
      {
        treadle: kyselyAdaptorTreadle,
        warpData: {
          entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
          operations: ['read', 'list']
        }
      }
    ]
  })
  .tieup({
    treadles: [
      {
        treadle: tauriAdaptorTreadle,
        warpData: {
          entities: ['Bookmark', 'Media', 'Post', 'Person', 'Conversation'],
          operations: ['create', 'update', 'delete']
        }
      }
    ]
  })
  .tieup({
    treadles: [
      {
        treadle: dddServicesTreadle,
        warpData: {}
      }
    ]
  });
front.name = 'foundframe-front';

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
//export const drizzle = front.typescript.drizzle_adaptors({ filter: ['read'] });

/**
 * MyTauriApp - Example application
 * Package: my-tauri-app
 * Path: apps/my-tauri-app
 *
 * The example application demonstrating the stack.
 * This is an app that wraps the front layer.
 */
//export const myTauriApp = front.tauri.app({ adaptorOverrides: [drizzle] });

// ============================================================================
// FUTURE RINGS
// ============================================================================

/**
 * Drizzle ORM adaptor
 * Package: foundframe-drizzle
 * Path: packages/foundframe-drizzle
 */
// export const drizzle = foundframe.drizzle.schema();

/*
class StreamEntry {
  @rust.i64
  id?: number;

  /// When *I* first encountered this (milliseconds since epoch).
  @rust.u64
  seen_at!: number;

  /// Git commit hash when this was recorded.
  commit_hash!: string;

  /// Reference to the actual content.
  /// Format: `pkb://{identity}/{repo}/{path}?v={commit}`
  reference!: string;

  /// inline summary for quick display, we always get it for the methods we use,
  //  although it is an Option in the rust struct
  summary!: StreamSummary;
}

class StreamSummary {
  /// Title for display.
  title!: string;
  /// Type of content (post, media, bookmark, etc.).
  content_type!: string;
  /// Brief preview.
  preview?: string;
}

const streamEntryTranslator = (entry: StreamEntry) => {
  if (entry.summary.content_type === 'bookmark') {
    return function(service: any) {
    }
  }
};
*/
