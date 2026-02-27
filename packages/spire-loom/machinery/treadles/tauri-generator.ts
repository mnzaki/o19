/**
 * Tauri Generator
 *
 * Generates Tauri plugin code from spiral patterns.
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratorContext } from '../heddles/index.js';
import type { HookupSpec } from '../shuttle/hookups/types.js';
import {
  defineTreadle,
  generateFromTreadle,
  buildTauriPluginNaming
} from '../treadle-kit/index.js';
import { TauriSpiraler } from '../../warp/spiral/spiralers/tauri.js';
import { RustCore } from '../../warp/spiral/index.js';
import { hookupRustCrate, hookupTauriPlugin } from '../shuttle/hookup-manager.js';
import { configureSpireCargo } from '../shuttle/cargo-toml-manager.js';
import { addManagementPrefix } from '../sley/index.js';
import { buildCrateNaming } from '../stringing.js';

/**
 * Convert snake_case command name to kebab-case permission identifier.
 * E.g., "post_add_post" -> "allow-post-add-post"
 */
function toPermissionId(commandName: string): string {
  return `allow-${commandName.replace(/_/g, '-')}`;
}

// ============================================================================
// Tauri Plugin Treadle Definition
// ============================================================================

export const tauriPluginTreadle = defineTreadle({
  matches: [{ current: 'TauriSpiraler.plugin', previous: 'RustCore' }],

  validate: (current, previous) => {
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof TauriSpiraler)) return false;
    if (!(previous.ring instanceof RustCore)) return false;
    return true;
  },

  methods: {
    filter: 'platform',
    pipeline: [addManagementPrefix()]
  },

  data: (_context, current, previous) => {
    const spiraler = (current.ring as any).spiraler as TauriSpiraler;
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();

    // Allow spiraler config to override the core name (for standalone spirals not connected to a named core)
    const coreName = spiraler._config?.coreName || metadata.packageName || 'unknown';
    const coreCrateName = spiraler._config?.coreCrateName || metadata.crateName || coreName;

    const pascalCore = coreName.charAt(0).toUpperCase() + coreName.slice(1);
    const base = buildTauriPluginNaming(coreName, '');

    // Build crate naming data for Rust code generation
    const crateNaming = buildCrateNaming(coreCrateName);

    return {
      ...base,
      coreName,
      coreNamePascal: pascalCore,
      coreCrateName,
      // Crate naming for Rust code generation (handles hyphen->underscore conversion)
      crateNaming,
      // Backwards compatibility aliases
      coreCrateRustId: crateNaming.rustIdentifier,
      coreCrateBaseName: crateNaming.baseName,
      extensionTraitName: `Spire${pascalCore}Ext`,
      platformMethodName: `spire${pascalCore}Platform`,
      platformStructName: `Spire${pascalCore}Platform`,
      platformSetupFn: `setupSpire${pascalCore}`,
      platformTraitName: `Spire${pascalCore}PlatformTrait`,
      pluginName: `o19-${coreName}-tauri`,
      _currentRing: current.ring,
      _previousRing: previous.ring
    };
  },

  outputs: [
    { template: 'tauri/README.md.ejs', path: 'README.md', language: 'rust' },
    { template: 'tauri/error.rs.ejs', path: 'src/error.rs', language: 'rust' },
    { template: 'tauri/models.rs.ejs', path: 'src/models.rs', language: 'rust' },
    { template: 'tauri/platform.rs.ejs', path: 'src/platform.rs', language: 'rust' },
    { template: 'tauri/commands.rs.ejs', path: 'src/commands.rs', language: 'rust' },
    { template: 'tauri/extension.rs.ejs', path: 'src/extension.rs', language: 'rust' },
    { template: 'tauri/lib.rs.ejs', path: 'src/lib.rs', language: 'rust' },
    { template: 'tauri/desktop.rs.ejs', path: 'src/desktop.rs', language: 'rust' },
    { template: 'tauri/mobile/mod.rs.ejs', path: 'src/mobile/mod.rs', language: 'rust' },
    { template: 'tauri/mobile/android.rs.ejs', path: 'src/mobile/android.rs', language: 'rust' },
    { template: 'tauri/mobile/ios.rs.ejs', path: 'src/mobile/ios.rs', language: 'rust' }
  ],

  hookups: (ctx) => {
    // Generate permission entries for all commands
    const methods = ctx.methods?.all || [];

    if (methods.length === 0) {
      return [];
    }

    // Convert methods to permission IDs, throwing if any method lacks a name
    const permissions = methods.map((method) => {
      if (typeof method.name !== 'string' || method.name.length === 0) {
        throw new Error(
          `Method missing valid name: ${JSON.stringify(method)}. ` +
            `All methods must have a non-empty string name.`
        );
      }
      return toPermissionId(method.name);
    });

    // Generate individual permission files for each command
    // Command name: "bookmark_add_bookmark" -> permission: "allow-bookmark-add-bookmark", command: "bookmark-add-bookmark"
    //    const commandPermissionFiles = methods.map(method => {
    //      const commandName = method.name; // e.g., "bookmark_add_bookmark"
    //      const permissionId = toPermissionId(commandName); // e.g., "allow-bookmark-add-bookmark"
    //      const commandId = commandName.replace(/_/g, '-'); // e.g., "bookmark-add-bookmark"
    //      const fileName = `${commandId}.toml`; // e.g., "bookmark-add-bookmark.toml"
    //
    //      return {
    //        path: `permissions/autogenerated/commands/${fileName}`,
    //        content: `# Automatically generated - DO NOT EDIT!
    //
    //"$schema" = "../../schemas/schema.json"
    //
    //[[permission]]
    //identifier = "${permissionId}"
    //description = "Enables the ${commandId} command without any pre-configured scope."
    //commands.allow = ["${commandId}"]
    //
    //[[permission]]
    //identifier = "deny-${commandId}"
    //description = "Denies the ${commandId} command without any pre-configured scope."
    //commands.deny = ["${commandId}"]
    //`
    //      };
    //    });

    return [
      {
        path: 'permissions/default.toml',
        tomlArray: {
          path: 'default.permissions',
          items: permissions
        }
      }
    ] as HookupSpec[];
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

export async function generateTauriPlugin(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<import('../heddles/index.js').GeneratedFile[]> {
  const baseGenerator = generateFromTreadle(tauriPluginTreadle);
  const files = await baseGenerator(current, previous, context);

  if (!context || files.length === 0) {
    return files;
  }

  const coreMetadata = (previous.ring as any).getMetadata?.() || {};
  const coreName = coreMetadata.packageName || 'foundframe';
  const packageDir = context.packageDir;

  const hooked = hookupRustCrate(packageDir, 'spire');
  if (hooked) {
    console.log(`  ✓ Hooked up spire module to lib.rs`);
  }

  const libRsPath = path.join(packageDir, 'src', 'lib.rs');
  const hookupResult = hookupTauriPlugin({
    libRsPath,
    spireModuleName: 'spire',
    coreName,
    coreCrateName: 'o19-foundframe-tauri',
    commands: []
  });

  if (hookupResult.modified) {
    console.log(`  ✓ Hooked up to src/lib.rs: ${hookupResult.changes.join(', ')}`);
  }

  const cargoResult = configureSpireCargo({
    cratePath: packageDir,
    moduleName: 'spire'
  });

  if (cargoResult.modified) {
    console.log(`  ✓ Configured Cargo.toml: ${cargoResult.changes.join(', ')}`);
  }

  return files;
}

export { generateFromTreadle };
