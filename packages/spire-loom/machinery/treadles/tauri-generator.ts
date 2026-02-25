/**
 * Tauri Generator
 *
 * Generates Tauri plugin code from spiral patterns using the platform-wrapper abstraction.
 *
 * Uses definePlatformWrapperTreadle for consistent pattern with Android generator.
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratorContext } from '../heddles/index.js';
import type { RawMethod } from '../bobbin/index.js';
import {
  definePlatformWrapperTreadle,
  buildTauriPluginNaming,
  generateFromTreadle,
  type PlatformWrapperTreadle
} from '../treadle-kit/platform-wrapper.js';
import { hookupRustCrate, hookupTauriPlugin } from '../shuttle/hookup-manager.js';
import { configureSpireCargo } from '../shuttle/cargo-toml-manager.js';
import { addManagementPrefix } from '../sley/index.js';

// ============================================================================
// Tauri Plugin Treadle Definition
// ============================================================================

/**
 * Tauri plugin treadle defined using the platform-wrapper abstraction.
 *
 * Uses custom match patterns for the mux pattern (wraps Android + Desktop).
 */
export const tauriPluginTreadle: PlatformWrapperTreadle = definePlatformWrapperTreadle({
  platform: {
    name: 'Tauri',
    spiraler: 'TauriSpiraler.plugin'
  },
  wrapperType: 'tauri-plugin',

  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },
  naming: (coreName, affix) => {
    const base = buildTauriPluginNaming(coreName, affix);
    const pascalCore = coreName.charAt(0).toUpperCase() + coreName.slice(1);

    return {
      ...base,
      // Tauri-specific naming
      coreName,
      coreNamePascal: pascalCore,
      extensionTraitName: `Spire${pascalCore}Ext`,
      platformMethodName: `spire${pascalCore}Platform`,
      platformStructName: `Spire${pascalCore}Platform`,
      platformSetupFn: `setupSpire${pascalCore}`,
      platformTraitName: `Spire${pascalCore}PlatformTrait`
    };
  },
  outputs: [
    // README
    {
      template: 'tauri/README.md.ejs',
      file: 'readme',
      language: 'rust'
    },
    // Error types
    {
      template: 'tauri/error.rs.ejs',
      file: 'error',
      language: 'rust'
    },
    // Models
    {
      template: 'tauri/models.rs.ejs',
      file: 'models',
      language: 'rust'
    },
    // Platform trait
    {
      template: 'tauri/platform.rs.ejs',
      file: 'platform',
      language: 'rust'
    },
    // Commands
    {
      template: 'tauri/commands.rs.ejs',
      file: 'commands',
      language: 'rust'
    },
    // Extension trait
    {
      template: 'tauri/extension.rs.ejs',
      file: 'extension',
      language: 'rust'
    },
    // Plugin init
    {
      template: 'tauri/lib.rs.ejs',
      file: 'lib',
      language: 'rust'
    },
    // Desktop platform
    {
      template: 'tauri/desktop.rs.ejs',
      file: 'desktop',
      language: 'rust'
    },
    // Mobile module declarations
    {
      template: 'tauri/mobile/mod.rs.ejs',
      file: 'mobile_mod',
      language: 'rust'
    },
    // Android platform
    {
      template: 'tauri/mobile/android.rs.ejs',
      file: 'android',
      language: 'rust'
    },
    // iOS platform stub
    {
      template: 'tauri/mobile/ios.rs.ejs',
      file: 'ios',
      language: 'rust'
    }
  ],
  hookup: 'custom', // We do custom hookup for Tauri
  extraData: (context, current, previous, naming) => {
    // Get core metadata
    const coreMetadata = (previous.ring as any).getMetadata?.() || {};

    return {
      coreCrateName: coreMetadata.crateName || naming.coreName,
      pluginName: `o19-${naming.coreName}-tauri`
    };
  }
});

// ============================================================================
// Generator Function with Custom Hookup
// ============================================================================

export interface TauriGenerationOptions {
  outputDir: string;
  coreCrateName: string;
  pluginName: string;
}

/**
 * Generate Tauri plugin files with custom hookup.
 *
 * This wraps the declarative treadle and adds Tauri-specific hookup
 * (Cargo.toml configuration, lib.rs hookup, etc.)
 */
export async function generateTauriPlugin(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<import('../heddles/index.js').GeneratedFile[]> {
  // Use the base generator from the treadle
  const baseGenerator = generateFromTreadle(tauriPluginTreadle);
  const files = await baseGenerator(current, previous, context);

  if (!context || files.length === 0) {
    return files;
  }

  // Get naming data for hookup
  const coreMetadata = (previous.ring as any).getMetadata?.() || {};
  const coreName = coreMetadata.packageName || 'foundframe';

  // Resolve package directory
  const packageDir = path.join(
    context.workspaceRoot ?? process.cwd(),
    '..',
    'o19/crates/foundframe-tauri'
  );

  // Hook up spire module to lib.rs
  const hooked = hookupRustCrate(packageDir, 'spire');
  if (hooked) {
    console.log(`  ✓ Hooked up spire module to lib.rs`);
  }

  // Hook up generated code into user's lib.rs
  const libRsPath = path.join(packageDir, 'src', 'lib.rs');
  const commandNames = files.filter((f) => f.path.includes('commands.rs')).flatMap(() => []); // TODO: extract command names from generated content

  const hookupResult = hookupTauriPlugin({
    libRsPath,
    spireModuleName: 'spire',
    coreName,
    coreCrateName: 'o19-foundframe-tauri',
    commands: [] // Command names are auto-detected by hookupTauriPlugin
  });

  if (hookupResult.modified) {
    console.log(`  ✓ Hooked up to src/lib.rs: ${hookupResult.changes.join(', ')}`);
  }

  // Configure Cargo.toml for spire
  const cargoResult = configureSpireCargo({
    cratePath: packageDir,
    moduleName: 'spire'
  });

  if (cargoResult.modified) {
    console.log(`  ✓ Configured Cargo.toml: ${cargoResult.changes.join(', ')}`);
  }

  return files;
}

// Export for matrix registration
export { generateFromTreadle };
