/**
 * ⚠️  KIMI NOTICE: Before editing this treadle, read HOW_TO_LOOM.md
 *     The loom has patterns. Understanding them prevents cross-cutting.
 *     Conservation spiral matters. Read before weaving. 🌀
 *
 * Tauri Desktop Platform Treadle
 *
 * Generates a DesktopPlatform implementation that bridges the mainline Platform trait
 * to the spire's generated SpireRustExternalLayerPlatformTrait.
 *
 * This allows the mainline to use generated CRUD methods while keeping custom
 * hand-written methods separate.
 *
 * Strategy:
 * 1. Generate desktop_mainline.rs in spire/src/ (implements mainline Platform trait)
 * 2. Bridge delegates generated methods to spire platform
 * 3. Custom methods remain in mainline src/desktop.rs
 *
 * Matrix match: (TauriSpiraler.plugin, RustCore) → Desktop platform bridge
 *
 * > *"The bridge connects what was separate, the spiral preserves both."*
 */

import {
  defineTreadle,
  generateFromTreadle,
  type OutputSpec
} from '@o19/spire-loom/machinery/treadle-kit';
import { addManagementPrefix } from '@o19/spire-loom/machinery/sley';

// ============================================================================
// Treadle Definition
// ============================================================================

export const tauriDesktopPlatformTreadle = defineTreadle({
  name: 'tauri-desktop-platform',

  // Tieup treadle - invoked directly via .tieup() in WARP.ts
  // No automatic matrix matching needed

  // Method filtering and transformation
  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },

  // Template data from context
  data: (context, current, previous) => {
    const coreName = 'foundframe'; // Could be extracted from RustCore metadata
    const coreNamePascal = coreName.charAt(0).toUpperCase() + coreName.slice(1);

    return {
      coreName,
      coreNamePascal,
      // Spire naming conventions
      spirePlatformTrait: `Spire${coreNamePascal}PlatformTrait`,
      spirePlatformStruct: `Spire${coreNamePascal}Platform`,
      spireSetupFn: `setupSpire${coreNamePascal}`,
      spireModule: 'crate::spire',
      // Mainline naming
      mainlinePlatformTrait: 'Platform',
      mainlineDesktopPlatform: 'DesktopPlatform',
      // Generated bridge
      bridgePlatformName: `Spire${coreNamePascal}DesktopBridge`,
    };
  },

  // Output files
  outputs: [
    // Desktop platform bridge - implements mainline Platform using spire
    {
      template: 'tauri/desktop_mainline_bridge.rs.ejs',
      path: 'src/desktop_mainline_bridge.rs',
      language: 'rust'
    }
  ],

  // Hookup: Add bridge module to mainline lib.rs
  hookups: [{
    path: 'src/lib.rs',
    moduleDeclarations: [
      { name: 'desktop_mainline_bridge', path: '../spire/src/desktop_mainline_bridge.rs', pub: true }
    ]
  }]
});

// ============================================================================
// Generator Export
// ============================================================================

export { generateFromTreadle };
