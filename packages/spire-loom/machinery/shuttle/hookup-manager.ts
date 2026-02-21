/**
 * Hookup Manager
 *
 * Integrates generated code into existing packages.
 * This creates the bridge between the spire/ directory and the main package.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTextBlockInserted, fileContains } from './file-system-operations.js';

/**
 * Hookup generated Rust code into a Cargo crate.
 * Creates/modifies lib.rs to include the generated spire module.
 */
export function hookupRustCrate(cratePath: string, spireModuleName: string = 'spire'): boolean {
  const srcDir = path.join(cratePath, 'src');
  const libRsPath = path.join(srcDir, 'lib.rs');
  const mainRsPath = path.join(srcDir, 'main.rs');
  
  // Find the entry point (lib.rs or main.rs)
  const entryPath = fs.existsSync(libRsPath) ? libRsPath : mainRsPath;
  
  if (!fs.existsSync(entryPath)) {
    throw new Error(`No lib.rs or main.rs found in ${srcDir}`);
  }
  
  // Check if spire module is already included
  const spireInclude = `pub mod ${spireModuleName};`;
  if (fileContains(entryPath, spireInclude)) {
    return false; // Already hooked up
  }
  
  // Add spire module declaration at the end of the file
  const content = fs.readFileSync(entryPath, 'utf-8');
  fs.writeFileSync(entryPath, content + '\n' + spireInclude + '\n', 'utf-8');
  
  return true;
}

/**
 * Hookup generated TypeScript code into a Node package.
 * Creates/modifies index.ts to re-export from spire/.
 */
export function hookupNodePackage(packagePath: string): boolean {
  const srcDir = path.join(packagePath, 'src');
  const indexPath = path.join(srcDir, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    // Create index.ts with spire export
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(indexPath, `// Generated package entry point\nexport * from './spire/index.js';\n`, 'utf-8');
    return true;
  }
  
  // Check if already hooked up
  if (fileContains(indexPath, 'spire')) {
    return false;
  }
  
  // Add spire export
  const content = fs.readFileSync(indexPath, 'utf-8');
  fs.writeFileSync(indexPath, content + `\n// Spire (generated code)\nexport * from './spire/index.js';\n`, 'utf-8');
  
  return true;
}

/**
 * Ensure the spire/ directory structure exists for a package.
 * Does NOT create any index files (mod.rs, index.ts) - those are created
 * by the specific generators if needed.
 */
export function ensureSpireDirectory(packagePath: string, _language?: 'rust' | 'typescript' | 'kotlin'): string {
  const spirePath = path.join(packagePath, 'spire');
  
  // Create spire/ directory only
  fs.mkdirSync(spirePath, { recursive: true });
  
  return spirePath;
}

/**
 * Add a submodule to the spire index.
 */
export function addSpireSubmodule(
  packagePath: string,
  submoduleName: string,
  language: 'rust' | 'typescript'
): void {
  const spirePath = path.join(packagePath, 'spire');
  
  if (language === 'rust') {
    const modRsPath = path.join(spirePath, 'mod.rs');
    const modDecl = `pub mod ${submoduleName};`;
    
    if (!fileContains(modRsPath, modDecl)) {
      const content = fs.readFileSync(modRsPath, 'utf-8');
      fs.writeFileSync(modRsPath, content + modDecl + '\n', 'utf-8');
    }
  } else if (language === 'typescript') {
    const indexPath = path.join(spirePath, 'index.ts');
    const exportDecl = `export * from './${submoduleName}/index.js';`;
    
    if (!fileContains(indexPath, exportDecl)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      fs.writeFileSync(indexPath, content + exportDecl + '\n', 'utf-8');
    }
  }
}

/**
 * Auto-detect package type and hook up accordingly.
 */
export function autoHookup(packagePath: string): { hooked: boolean; type: string } {
  // Check for Cargo.toml (Rust)
  if (fs.existsSync(path.join(packagePath, 'Cargo.toml'))) {
    const hooked = hookupRustCrate(packagePath);
    return { hooked, type: 'rust' };
  }
  
  // Check for package.json (Node/TypeScript)
  if (fs.existsSync(path.join(packagePath, 'package.json'))) {
    const hooked = hookupNodePackage(packagePath);
    return { hooked, type: 'node' };
  }
  
  return { hooked: false, type: 'unknown' };
}
