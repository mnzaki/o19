/**
 * Tauri Generator
 *
 * Generates Tauri plugin code from spiral patterns.
 * 
 * Matrix match: (TauriSpiraler, SpiralMux) → Tauri plugin with platform routing
 * 
 * This demonstrates **muxing** - the Tauri layer aggregates multiple platform
 * rings (Android, Desktop, iOS) and routes commands to the appropriate
 * platform implementation at runtime.
 * 
 * Generated files go to {package}/spire/:
 * - src/platform.rs        → Platform trait (generated methods)
 * - src/commands.rs        → Tauri commands (generated handlers)
 * - src/extension.rs       → AppHandle extension trait
 * - src/lib.rs             → Plugin initialization with command registration
 */

import * as path from 'node:path';
import type { SpiralNode, GeneratedFile, GeneratorContext } from '../heddles/index.js';
import { ensurePlanComplete } from '../heddles/index.js';
import { TauriSpiraler } from '../../warp/spiral/spiralers/tauri.js';
import { SpiralMux } from '../../warp/spiral/pattern.js';
import { generateCode, type RawMethod } from '../bobbin/index.js';
import { filterByReach, type ManagementMetadata } from '../reed/index.js';

export interface TauriGenerationOptions {
  /** Output directory for generated code */
  outputDir: string;
  /** Core crate name (e.g., "o19-foundframe") */
  coreCrateName: string;
  /** Plugin name (e.g., "o19-foundframe-tauri") */
  pluginName: string;
  /** Management methods to generate commands for */
  methods?: RawMethod[];
}

/**
 * Generate Tauri plugin files.
 * 
 * This is called when the matrix matches (TauriSpiraler, SpiralMux).
 * It generates:
 * - Platform trait with methods from Management
 * - Tauri commands that delegate to Platform
 * - AppHandle extension trait
 * - Plugin initialization with command registration
 * 
 * The muxing pattern: Tauri aggregates multiple platform rings and routes
 * commands to the appropriate implementation based on compile-time target.
 */
export async function generateTauriPlugin(
  current: SpiralNode,
  previous: SpiralNode,
  context?: GeneratorContext
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const plan = context?.plan;
  
  // Validate node types
  if (!(current.ring instanceof TauriSpiraler)) {
    if (process.env.DEBUG_MATRIX) {
      console.log(`[TAURI] Skipping: current ring is ${current.ring.constructor.name}, not TauriSpiraler`);
    }
    return [];
  }
  
  if (!(previous.ring instanceof SpiralMux)) {
    throw new Error('Expected SpiralMux as previous node (Tauri requires multiplexed platforms)');
  }
  
  const tauri = current.ring as TauriSpiraler;
  const mux = previous.ring as SpiralMux;
  
  // Get metadata from the mux's inner rings (Android, Desktop, etc.)
  const platformRings = mux.innerRings;
  
  console.log(`[TAURI] Generating plugin for ${platformRings.length} platform rings:`);
  for (const ring of platformRings) {
    console.log(`  - ${ring.constructor.name}`);
  }
  
  // Collect Management methods from all rings
  // For Tauri, we include both Local and Global reach (platform + front-facing)
  const rawMethods = collectManagementMethods(plan?.managements ?? [], ['platform', 'front']);
  
  // Package info
  const packageDir = 'o19/crates/foundframe-tauri';
  const coreName = 'foundframe';
  
  // ==========================================================================
  // Generate all files using bobbin's unified API
  // ==========================================================================
  
  const generationTasks = [
    // Platform trait - defines the interface all platforms implement
    generateCode({
      template: 'tauri/platform.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'platform_gen.rs'),
      data: {
        coreCrateName: 'o19_foundframe',
        pluginName: 'o19-foundframe-tauri',
        coreName,
      },
      methods: rawMethods,
    }),
    
    // Commands - Tauri command handlers that delegate to Platform
    generateCode({
      template: 'tauri/commands.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'commands_gen.rs'),
      data: {
        coreCrateName: 'o19_foundframe',
        pluginName: 'o19-foundframe-tauri',
        coreName,
      },
      methods: rawMethods,
    }),
    
    // Extension trait - AppHandle extension for accessing platform
    generateCode({
      template: 'tauri/extension.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'extension_gen.rs'),
      data: {
        coreCrateName: 'o19_foundframe',
        pluginName: 'o19-foundframe-tauri',
        coreName,
      },
      methods: rawMethods,
    }),
    
    // Plugin init - registers all commands
    generateCode({
      template: 'tauri/lib.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'lib_gen.rs'),
      data: {
        coreCrateName: 'o19_foundframe',
        pluginName: 'o19-foundframe-tauri',
        coreName,
      },
      methods: rawMethods,
    }),
  ];
  
  const generatedFiles = await Promise.all(generationTasks);
  files.push(...generatedFiles);
  
  return files;
}

/**
 * Collect raw Management methods for Tauri generation.
 * 
 * Tauri includes methods with:
 * - Local reach (platform operations)
 * - Global reach (front-facing operations)
 * 
 * This is different from Android which only includes Local.
 */
function collectManagementMethods(
  managements: ManagementMetadata[],
  reaches: Array<'private' | 'platform' | 'front'>
): RawMethod[] {
  if (managements.length === 0) {
    return [];
  }

  // Filter by multiple reach levels
  const filteredManagements = managements.filter(mgmt => {
    const reach = (mgmt as any).reach ?? 'private';
    return reaches.includes(reach);
  });
  
  const methods: RawMethod[] = [];

  for (const mgmt of filteredManagements) {
    for (const method of mgmt.methods) {
      methods.push({
        name: method.name,
        returnType: method.returnType,
        isCollection: method.isCollection ?? false,
        params: method.params.map(p => ({
          name: p.name,
          type: p.type,
          optional: p.optional,
        })),
        description: `${mgmt.name}.${method.name}`,
      });
    }
  }

  return methods;
}


