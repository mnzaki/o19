/**
 * Hookup Manager
 *
 * High-level integration utilities for spire-generated code.
 * 
 * This module provides:
 * - Rust crate module hookup (adding spire module declaration)
 * - Re-exports from specialized managers
 * 
 * For framework-specific hookups, use:
 * - tauri-manager.ts for Tauri plugins
 * - cargo-toml-manager.ts for Cargo.toml modifications
 * - gradle-manager.ts for Gradle build files
 * - xml-block-manager.ts for XML files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Hookup generated Rust code into a Cargo crate.
 * Creates/modifies lib.rs to include the generated spire module using #[path].
 * 
 * This creates a module declaration like:
 *   #[path = "../spire/src/lib.rs"]
 *   pub mod spire;
 * 
 * Which allows the spire/ directory to live as a sibling to src/.
 */
export function hookupRustCrate(cratePath: string, spireModuleName: string = 'spire'): boolean {
  const srcDir = path.join(cratePath, 'src');
  const libRsPath = path.join(srcDir, 'lib.rs');
  const mainRsPath = path.join(srcDir, 'main.rs');
  
  const entryPath = fs.existsSync(libRsPath) ? libRsPath : mainRsPath;
  
  if (!fs.existsSync(entryPath)) {
    throw new Error(`No lib.rs or main.rs found in ${srcDir}`);
  }
  
  const spireModPattern = new RegExp(`pub\\s+mod\\s+${spireModuleName}\\s*;`);
  const content = fs.readFileSync(entryPath, 'utf-8');
  if (spireModPattern.test(content)) {
    return false;
  }
  
  const spireInclude = `#[path = "../spire/src/lib.rs"]\npub mod ${spireModuleName};`;
  fs.writeFileSync(entryPath, content + '\n' + spireInclude + '\n', 'utf-8');
  
  return true;
}

// Re-exports from specialized managers
export { hookupTauriPlugin, unhookTauriPlugin } from './tauri-manager.js';
export type { TauriHookupOptions, TauriHookupResult } from './tauri-manager.js';
