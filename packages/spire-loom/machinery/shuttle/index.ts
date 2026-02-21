/**
 * Spire-Loom Shuttle
 *
 * File generation utilities for the spiral architecture.
 * The shuttle carries thread through the warp to weave files.
 * All operations are idempotent—safe to run multiple times.
 */

// File system utilities
export {
  ensureDir,
  ensureFile,
  ensureTextBlockInserted,
  ensureTextBlockRemoved,
  ensureCopied,
  fileContains,
  readJson,
  writeJson,
  findFiles,
  type InsertTextOptions,
} from './file-system-operations.js';

// XML block management
export {
  ensureXmlBlock,
  clearXmlBlockRegistry,
  type XmlBlock,
  type XmlBlockMap,
} from './xml-block-manager.js';

// Package management
export {
  ensureTypeScriptPackageCreated,
  ensureCargoCrateCreated,
  ensurePnpmWorkspaceIncludes,
  ensureCargoWorkspaceIncludes,
  type TypeScriptPackageOptions,
  type RustCrateOptions,
} from './workspace-package-manager.js';

// Package.json management
export {
  ensureNpmDependencyAdded,
  findWorkspacePackage,
  addWorkspaceDependency,
  type NpmDependencyOptions,
} from './package-json-manager.js';

// Template generation
export {
  loadTemplate,
  loadBuiltinTemplate,
  renderEjs,
  generateFromEjs,
  templateHelpers,
  renderWithHelpers,
  inlineTemplate,
  type RenderOptions,
} from './template-renderer.js';

// Configuration management
export {
  ensureTauriPermissions,
  ensureTauriCapability,
  ensureRustModDeclared,
  ensureRustUseAdded,
  ensureTsExportAdded,
  ensureBuildRs,
  ensureBuildDependency,
  ensureAndroidServiceDeclared,
  type TauriPermission,
} from './configuration-writer.js';

// Cargo tools
export {
  isCargoToolInstalled,
  getCargoToolVersion,
  ensureCargoToolInstalled,
  ensureCargoNdkInstalled,
  ensureCbindgenInstalled,
  checkAndroidPrerequisites,
  printAndroidPrerequisites,
} from './cargo-tools.js';

// Android Gradle integration
export {
  configureAndroidGradle,
} from './android-gradle-integration.js';

// Tauri generator
export {
  generateTauriPlugin,
} from '../treadles/tauri-generator.js';

// Hookup management
export {
  hookupRustCrate,
  hookupTauriPlugin,
  unhookTauriPlugin,
  type TauriHookupOptions,
  type TauriHookupResult,
} from './hookup-manager.js';

// Specialized managers
export {
  ensureCargoBlock,
  removeCargoBlock,
  hasCargoBlock,
  configureSpireCargo,
  addWorkspaceDependencies,
  startCargoGeneration,
  cleanupUntouchedBlocks,
  ensureCargoDependencyAdded,
} from './cargo-toml-manager.js';

export {
  ensureGradleBlock,
  ensureGradleBlockRemoved,
  ensureGradleSourceSet,
  clearGradleBlockRegistry,
} from './gradle-manager.js';

export {
  hookupTauriPlugin as ensureTauriPluginHookup,
  unhookTauriPlugin as removeTauriPluginHookup,
  type TauriHookupOptions as TauriPluginOptions,
  type TauriHookupResult as TauriPluginResult,
} from './tauri-manager.js';

// Block registry (global cleanup)
export {
  registerFile,
  registerBlock,
  scanExistingBlocks,
  cleanupAllBlocks,
  startGeneration,
  clearBlockRegistry,
} from './block-registry.js';

// Marker utilities
export {
  buildMarkerTag,
  buildEndMarkerTag,
  createMarkers,
  createRustMarkers,
  createGradleMarkers,
  createXmlMarkers,
  createTomlMarkers,
  escapeMarkerForRegex,
  buildBlockRegex,
  findBlock,
  hasBlock,
  insertBlock,
  replaceBlock,
  removeBlock,
  ensureBlock,
  ensureFileBlock,
  removeFileBlock,
  type MarkerPair,
  type BlockOperationResult,
  type FileBlockResult,
} from './markers.js';
