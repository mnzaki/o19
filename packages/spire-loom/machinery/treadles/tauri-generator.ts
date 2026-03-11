/**
 * Tauri Generator
 *
 * Generates Tauri plugin code from spiral patterns.
 */

import * as path from 'node:path';
import type { SpiralNode } from '../heddles/index.js';
import {
  declareTreadle,
  generateFromTreadle,
  buildTauriPluginNaming
} from '../treadle-kit/index.js';
import { TauriSpiraler } from '../../warp/spiral/spiralers/tauri.js';
import { RustCore } from '../../warp/spiral/index.js';
import { hookup } from '../sley/index.js';
import { cargoToml } from '../sley/index.js';
import { buildCrateNaming, Name } from '../stringing.js';
import { map, toArray, join } from '../sley/iterators.js';
import type { GeneratedFile } from '../bobbin/index.js';
import { languages } from '../reed/index.js';

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

export const tauriPluginTreadle = declareTreadle({
  matches: [{ current: 'TauriSpiraler.plugin', previous: 'RustCore' }],

  validate: (current, previous) => {
    const spiraler = (current.ring as any).spiraler;
    if (!(spiraler instanceof TauriSpiraler)) return false;
    if (!(previous.ring instanceof RustCore)) return false;
    return true;
  },

  methods: {
    filter: 'platform',
    pipeline: []
  },

  language: ['rust', 'kotlin'],

  data: (context, current, previous) => {
    context.methods.addLang(languages.get('rust')!);
    console.log('heres a clone', { clone: context.methods.all[0].rs });
    const spiraler = (current.ring as any).spiraler as TauriSpiraler;
    const core = previous.ring as RustCore;
    const metadata = core.getMetadata();

    // Allow spiraler config to override the core name (for standalone spirals not connected to a named core)
    const coreName = spiraler._config?.coreName || metadata.packageName || 'unknown';
    const coreCrateName = spiraler._config?.coreCrateName || metadata.crateName || coreName;

    const pascalCore = new Name(coreName).pascalCase;
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
      pluginName: `${coreName}-tauri`,
      _currentRing: current.ring,
      _previousRing: previous.ring
    };
  },

  newFiles: [
    { template: 'tauri/README.md.mejs', path: 'README.md' },
    { template: 'tauri/error.rs.mejs', path: 'src/error.rs' },
    { template: 'tauri/models.rs.mejs', path: 'src/models.rs' },
    { template: 'tauri/platform.rs.mejs', path: 'src/platform.rs' },
    { template: 'tauri/commands.rs.mejs', path: 'src/commands.rs' },
    { template: 'tauri/extension.rs.mejs', path: 'src/extension.rs' },
    { template: 'tauri/lib.rs.mejs', path: 'src/lib.rs' },
    { template: 'tauri/desktop.rs.mejs', path: 'src/desktop.rs' },
    { template: 'tauri/mobile/mod.rs.mejs', path: 'src/mobile/mod.rs' },
    { template: 'tauri/mobile/android.rs.mejs', path: 'src/mobile/android.rs' },
    { template: 'tauri/mobile/ios.rs.mejs', path: 'src/mobile/ios.rs' }
  ],

  hookups: (ctx) => {
    // APP-004: Generate permission entries for all commands using iterators
    if (!ctx.methods || ctx.methods.count === 0) {
      return [];
    }

    // Convert methods to permission IDs using lazy iterator map
    const permissions = toArray(
      map(ctx.methods, (method) => {
        // Handle Name objects (which have toString()) or plain strings
        const nameStr = method.name?.toString ? method.name.toString() : method.name;
        if (typeof nameStr !== 'string' || nameStr.length === 0) {
          throw new Error(
            `Method missing valid name: ${JSON.stringify(method)}. ` +
              `All methods must have a non-empty string name.`
          );
        }
        return toPermissionId(nameStr);
      })
    );

    return [
      {
        path: 'permissions/default.toml',
        tomlArray: {
          path: 'default.permissions',
          items: permissions
        }
      }
    ] as hookup.HookupSpec[];
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
): Promise<GeneratedFile[]> {
  const baseGenerator = generateFromTreadle(tauriPluginTreadle);
  const files = await baseGenerator(current, previous, context);

  if (!context || files.length === 0) {
    return files;
  }

  const coreMetadata = (previous.ring as any).getMetadata?.() || {};
  const coreName = coreMetadata.packageName || 'foundframe';
  const packageDir = context.packageDir;

  const hooked = hookup.hookupRustCrate(packageDir, 'spire');
  if (hooked) {
    console.log(`  ✓ Hooked up spire module to lib.rs`);
  }

  const libRsPath = path.join(packageDir, 'src', 'lib.rs');
  const hookupResult = hookup.hookupTauriPlugin({
    libRsPath,
    spireModuleName: 'spire',
    coreName,
    coreCrateName: 'o19-foundframe-tauri',
    commands: []
  });

  if (hookupResult.modified) {
    console.log(`  ✓ Hooked up to src/lib.rs: ${hookupResult.changes.join(', ')}`);
  }

  const cargoResult = cargoToml.configureSpireCargo({
    cratePath: packageDir,
    moduleName: 'spire'
  });

  if (cargoResult.modified) {
    console.log(`  ✓ Configured Cargo.toml: ${cargoResult.changes.join(', ')}`);
  }

  return files;
}

export { generateFromTreadle };
