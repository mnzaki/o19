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
import { generateCode, transformForTypeScript, type RawMethod } from '../bobbin/index.js';
import { filterByReach, type ManagementMetadata } from '../reed/index.js';
import { hookupRustCrate, hookupTauriPlugin } from '../shuttle/hookup-manager.js';
import { configureSpireCargo } from '../shuttle/cargo-toml-manager.js';
import {
  MethodPipeline,
  addManagementPrefix,
  crudInterfaceMapping,
  tagFilter,
  fromSourceMethods,
  type MgmtMethod,
} from '../sley/index.js';

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
  
  const tauri = current.ring as TauriSpiraler;
  
  // Check if CRUD adaptor generation is enabled
  const crudConfig = tauri._config?.ddd?.adaptors;
  const crudEnabled = crudConfig !== undefined;
  
  // The TauriSpiraler (MuxSpiraler) contains all platform rings in innerRings
  // previous is the specific platform being processed (AndroidSpiraler or DesktopSpiraler)
  const platformRings = tauri.innerRings;
  const currentPlatform = previous.typeName; // 'AndroidSpiraler' or 'DesktopSpiraler'
  
  console.log(`[TAURI] Generating plugin for ${currentPlatform}`);
  console.log(`  Total platforms in mux: ${platformRings.length}`);
  for (const ring of platformRings) {
    console.log(`    - ${ring.constructor.name}`);
  }
  
  // Collect Management methods from all rings
  // For Tauri, we include both Local and Global reach (platform + front-facing)
  const { methods: allMethods, byManagement: methodsByManagement } = collectManagementMethods(
    plan?.managements ?? [],
    ['platform', 'front']
  );
  
  // Convert to RawMethod for template compatibility
  const rawMethods = allMethods.map(toRawMethod);
  
  // Package info
  const packageDir = 'o19/crates/foundframe-tauri';
  const coreName = 'foundframe';
  
  // Compute names during weaving (like gradle task name)
  // These must be computed here, not in templates, to ensure consistency
  const coreNamePascal = coreName.charAt(0).toUpperCase() + coreName.slice(1);
  const extensionTraitName = `Spire${coreNamePascal}Ext`;
  const platformMethodName = `spire${coreNamePascal}Platform`;
  const platformStructName = `Spire${coreNamePascal}Platform`;
  const platformSetupFn = `setupSpire${coreNamePascal}`;
  const platformTraitName = `Spire${coreNamePascal}PlatformTrait`;
  
  console.log(`  Extension trait: ${extensionTraitName}`);
  console.log(`  Platform method: ${platformMethodName}()`);
  console.log(`  Platform struct: ${platformStructName}`);
  console.log(`  Platform trait: ${platformTraitName}`);
  console.log(`  Setup function: ${platformSetupFn}()`);
  
  // ==========================================================================
  // Generate all files using bobbin's unified API
  // ==========================================================================
  
  // Common data for all templates
  const commonData = {
    coreCrateName: 'o19_foundframe',
    pluginName: 'o19-foundframe-tauri',
    coreName,
    coreNamePascal,
    extensionTraitName,
    platformMethodName,
    platformStructName,
    platformSetupFn,
    platformTraitName,
  };
  
  // Generate template-based files
  const generationTasks = [
    
    // Platform trait - defines the interface all platforms implement
    generateCode({
      template: 'tauri/platform.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'platform.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Commands - Tauri command handlers that delegate to Platform
    generateCode({
      template: 'tauri/commands.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'commands.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Extension trait - AppHandle extension for accessing platform
    generateCode({
      template: 'tauri/extension.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'extension.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Plugin init - registers all commands
    generateCode({
      template: 'tauri/lib.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'lib.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Desktop platform implementation
    generateCode({
      template: 'tauri/desktop.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'desktop.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Mobile module declarations
    generateCode({
      template: 'tauri/mobile/mod.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'mobile', 'mod.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // Android platform implementation
    generateCode({
      template: 'tauri/mobile/android.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'mobile', 'android.rs'),
      data: commonData,
      methods: rawMethods,
    }),
    
    // iOS platform stub
    generateCode({
      template: 'tauri/mobile/ios.rs.ejs',
      outputPath: path.join(packageDir, 'spire', 'src', 'mobile', 'ios.rs'),
      data: commonData,
      methods: rawMethods,
    }),
  ];
  
  // ==========================================================================
  // Generate TypeScript Adaptors (per Management)
  // ==========================================================================
  
  // Generate adaptor for each Management
  for (const mgmt of methodsByManagement) {
    const mgmtName = mgmt.name;
    const mgmtMethods = mgmt.methods;
    const adaptorName = mgmtName.replace('Mgmt', '');
    
    // Build adaptor pipeline:
    // 1. CRUD interface mapping (create, update, delete)
    // 2. Last-second filtering by tags
    const adaptorPipeline = new MethodPipeline()
      .translate(crudInterfaceMapping());
    
    // Process through pipeline (complete set)
    const processedMethods = adaptorPipeline.process(mgmtMethods);
    
    // Filter at last second (before template rendering)
    const filterOut = crudEnabled ? crudConfig?.filterOut : [];
    const filteredMethods = filterOut && filterOut.length > 0
      ? adaptorPipeline.filter(processedMethods, tagFilter(filterOut))
      : processedMethods;
    
    // Group for template convenience
    const crudMethods = filteredMethods.filter(m => m.crudOperation);
    const passthroughMethods = filteredMethods.filter(m => !m.crudOperation);
    
    // Convert to RawMethod for template compatibility
    const toRaw = (m: MgmtMethod) => toRawMethod(m);
    
    // Prepare template data with translated methods
    const templateData: Record<string, unknown> = {
      ...commonData,
      managementName: adaptorName,
      extendsClass: `Drizzle${adaptorName}Adaptor`,
      portInterface: `${adaptorName}Port`,
      domainImports: [adaptorName, `Create${adaptorName}`, `Update${adaptorName}`],
      // Translated methods ready for rendering
      methods: filteredMethods.map(toRaw),
      crudMethods: crudMethods.map(toRaw),
      passthroughMethods: passthroughMethods.map(toRaw),
      hasCrud: crudMethods.length > 0,
      hasPassthrough: passthroughMethods.length > 0,
    };
    
    generationTasks.push(
      generateCode({
        template: 'adaptor/typescript.adaptor.ts.ejs',
        outputPath: path.join(packageDir, 'spire', 'ts', 'adaptors', `${adaptorName.toLowerCase()}.adaptor.ts`),
        data: templateData,
        methods: mgmtMethods.map(toRaw),
      })
    );
  }
  
  const generatedFiles = await Promise.all(generationTasks);
  files.push(...generatedFiles);
  
  // ==========================================================================
  // Hook up generated code to the crate
  // ==========================================================================
  
  // Resolve absolute path for hookup
  const resolvedPackageDir = path.join(context?.workspaceRoot ?? process.cwd(), '..', packageDir);
  
  // Hook up spire module to lib.rs
  const hooked = hookupRustCrate(resolvedPackageDir, 'spire');
  if (hooked) {
    console.log(`  ✓ Hooked up spire module to lib.rs`);
  }
  
  // Hook up generated code into user's lib.rs (invoke_handler + setup)
  const libRsPath = path.join(resolvedPackageDir, 'src', 'lib.rs');
  const commandNames = rawMethods.map(m => m.name);
  const hookupResult = hookupTauriPlugin({
    libRsPath,
    spireModuleName: 'spire',
    coreName,
    coreCrateName: 'o19-foundframe-tauri',
    commands: commandNames,
  });
  if (hookupResult.modified) {
    console.log(`  ✓ Hooked up to src/lib.rs: ${hookupResult.changes.join(', ')}`);
  }
  
  // Configure Cargo.toml for spire
  const cargoResult = configureSpireCargo({
    cratePath: resolvedPackageDir,
    moduleName: 'spire',
  });
  if (cargoResult.modified) {
    console.log(`  ✓ Configured Cargo.toml: ${cargoResult.changes.join(', ')}`);
  }
  
  return files;
}

/**
 * Convert MgmtMethod to RawMethod for template compatibility.
 * This bridges the new pipeline to existing templates.
 */
function toRawMethod(method: MgmtMethod): RawMethod & { operation?: string; tags?: string[] } {
  return {
    name: method.name,
    implName: method.name,  // Same as name for TypeScript (camelCase)
    jsName: method.jsName,
    returnType: method.returnType,
    isCollection: method.isCollection,
    params: method.params.map(p => ({
      name: p.name,
      type: p.tsType,
      optional: p.optional,
    })),
    description: method.description || `${method.managementName}.${method.name}`,
    operation: method.crudOperation,
    tags: method.tags,
  };
}

/**
 * Collect Management methods through the Sley pipeline.
 * 
 * The pipeline architecture:
 * 1. Convert raw Management metadata to MgmtMethod format
 * 2. Apply translations (stackable):
 *    - addManagementPrefix(): "{mgmt}_{method}" for unique bind-points
 *    - Additional translations from spiral rings
 * 3. Return complete method set (filtering happens at generation time)
 * 
 * Tauri includes methods with:
 * - Local reach (platform operations)
 * - Global reach (front-facing operations)
 */
function collectManagementMethods(
  managements: ManagementMetadata[],
  reaches: Array<'private' | 'platform' | 'front'>
): { methods: MgmtMethod[]; byManagement: Array<{ name: string; methods: MgmtMethod[] }> } {
  if (managements.length === 0) {
    return { methods: [], byManagement: [] };
  }

  // Map Management reach values to filter values
  const reachMap: Record<string, string> = {
    'Global': 'front',
    'Local': 'platform', 
    'Private': 'private',
  };

  // Filter by multiple reach levels
  const filteredManagements = managements.filter(mgmt => {
    const mgmtReach = ((mgmt as any).reach ?? 'Private') as string;
    const normalizedReach = reachMap[mgmtReach] ?? 'private';
    return reaches.includes(normalizedReach as any);
  });
  
  // Build the pipeline
  // Each ring can add translations - they stack!
  const pipeline = new MethodPipeline()
    .translate(addManagementPrefix());  // bookmark_add, device_pair, etc.
  
  // Convert to pipeline format and process
  const allMethods: MgmtMethod[] = [];
  const byManagement: Array<{ name: string; methods: MgmtMethod[] }> = [];
  
  for (const mgmt of filteredManagements) {
    // Convert source methods to pipeline format
    const sourceMethods = fromSourceMethods(mgmt.name, mgmt.methods);
    
    // Process through pipeline (applies all translations)
    const processedMethods = pipeline.process(sourceMethods);
    
    allMethods.push(...processedMethods);
    byManagement.push({ name: mgmt.name, methods: processedMethods });
  }
  
  // ==========================================================================
  // Temple: Validation & Sanity Checking
  // ==========================================================================
  
  // Check for duplicate bind-point names across all managements
  const methodNames = new Map<string, string>(); // name -> management that defined it
  const clashes: Array<{ name: string; managements: string[] }> = [];
  
  for (const method of allMethods) {
    const existingMgmt = methodNames.get(method.name);
    if (existingMgmt) {
      // Found a clash!
      const existingClash = clashes.find(c => c.name === method.name);
      if (existingClash) {
        if (!existingClash.managements.includes(method.managementName)) {
          existingClash.managements.push(method.managementName);
        }
      } else {
        clashes.push({ name: method.name, managements: [existingMgmt, method.managementName] });
      }
    } else {
      methodNames.set(method.name, method.managementName);
    }
  }
  
  if (clashes.length > 0) {
    console.error('\n❌ TEMPLE VALIDATION FAILED: Method name clashes detected!');
    console.error('   The following bind-point names are defined in multiple Managements:\n');
    for (const clash of clashes) {
      console.error(`   - "${clash.name}" is defined in: ${clash.managements.join(', ')}`);
    }
    console.error('\n   To fix: Ensure management prefixes create unique names.');
    console.error('   Continuing generation, but compilation will likely fail.\n');
  } else {
    console.log('  ✓ Temple validation passed: No bind-point name clashes');
  }

  return { methods: allMethods, byManagement };
}


