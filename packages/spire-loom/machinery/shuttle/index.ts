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

// Package management
export {
  ensureTypeScriptPackageCreated,
  ensureCargoCrateCreated,
  ensurePnpmWorkspaceIncludes,
  ensureCargoWorkspaceIncludes,
  type TypeScriptPackageOptions,
  type RustCrateOptions,
} from './workspace-package-manager.js';

// Dependency management
export {
  ensureCargoDependencyAdded,
  ensureNpmDependencyAdded,
  findWorkspacePackage,
  addWorkspaceDependency,
  type NpmDependencyOptions,
} from './dependency-manager.js';

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

// Hookup management
export {
  hookupRustCrate,
  hookupNodePackage,
  ensureSpireDirectory,
  addSpireSubmodule,
  autoHookup,
} from './hookup-manager.js';
