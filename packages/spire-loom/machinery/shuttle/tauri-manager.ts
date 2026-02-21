/**
 * Tauri Manager
 *
 * Manages Tauri plugin integration for spire-generated code.
 * Handles injection of commands and setup calls into lib.rs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRustMarkers, ensureFileBlock, removeFileBlock, type FileBlockResult } from './markers.js';

export interface TauriHookupOptions {
  /** Path to the lib.rs file */
  libRsPath: string;
  /** Name of the spire module (default: 'spire') */
  spireModuleName?: string;
  /** Core name (e.g., 'foundframe') */
  coreName: string;
  /** Core crate name (e.g., 'o19-foundframe-tauri') */
  coreCrateName: string;
  /** Command names to inject */
  commands?: string[];
}

export interface TauriHookupResult {
  modified: boolean;
  changes: string[];
}

/**
 * Hook up Tauri plugin integration into user's src/lib.rs.
 * 
 * This:
 * 1. Adds spire module declaration with #[path] attribute
 * 2. Injects commands into tauri::generate_handler![]
 * 3. Injects setup call into .setup() closure
 */
export function hookupTauriPlugin(options: TauriHookupOptions): TauriHookupResult {
  const {
    libRsPath,
    spireModuleName = 'spire',
    coreName,
    coreCrateName,
    commands = [],
  } = options;

  const changes: string[] = [];

  if (!fs.existsSync(libRsPath)) {
    throw new Error(`lib.rs not found at ${libRsPath}`);
  }

  // 1. Hook up spire module declaration
  const modHooked = hookupSpireModule(libRsPath, spireModuleName);
  if (modHooked) {
    changes.push(`Added ${spireModuleName} module declaration`);
  }

  // 2. Inject commands into generate_handler![]
  if (commands.length > 0) {
    const commandsResult = injectCommands(libRsPath, spireModuleName, commands);
    if (commandsResult.modified) {
      changes.push(commandsResult.change);
    }
  }

  // 3. Inject setup call
  const setupResult = injectSetupCall(libRsPath, spireModuleName, coreName, coreCrateName);
  if (setupResult.modified) {
    changes.push(setupResult.change);
  }

  return { modified: changes.length > 0, changes };
}

/**
 * Add spire module declaration with #[path] attribute.
 */
function hookupSpireModule(libRsPath: string, spireModuleName: string): boolean {
  const content = fs.readFileSync(libRsPath, 'utf-8');
  
  // Check if already declared
  const spireModPattern = new RegExp(`pub\\s+mod\\s+${spireModuleName}\\s*;`);
  if (spireModPattern.test(content)) {
    return false;
  }

  // Add spire module declaration with path attribute
  const spireInclude = `#[path = "../spire/src/lib.rs"]\npub mod ${spireModuleName};`;
  fs.writeFileSync(libRsPath, content + '\n' + spireInclude + '\n', 'utf-8');
  
  return true;
}

interface InjectionResult {
  modified: boolean;
  change: string;
}

/**
 * Inject commands into tauri::generate_handler![] macro.
 */
function injectCommands(
  libRsPath: string,
  spireModuleName: string,
  commands: string[]
): InjectionResult {
  let content = fs.readFileSync(libRsPath, 'utf-8');
  const originalContent = content;

  // Build command list
  const commandIndent = '      ';
  const commandList = commands
    .map(cmd => `${commandIndent}crate::${spireModuleName}::commands::${cmd},`)
    .join('\n');

  // Create markers
  const markers = createRustMarkers('commands', spireModuleName);

  // Find generate_handler![]
  const handlerPattern = /(tauri::generate_handler!\s*\[)([\s\S]*?)(\])/;
  const handlerMatch = content.match(handlerPattern);

  if (!handlerMatch) {
    return { modified: false, change: '' };
  }

  const beforeContent = handlerMatch[2];
  const fullMatch = handlerMatch[0];

  // Check if our commands are already injected
  if (beforeContent.includes(markers.start)) {
    // Update existing block
    const result = updateCommandsBlock(content, markers, commandList, commandIndent);
    if (result.modified) {
      fs.writeFileSync(libRsPath, result.content, 'utf-8');
      return { modified: true, change: `Updated ${commands.length} generated commands` };
    }
    return { modified: false, change: '' };
  }

  // Check if any spire commands exist (without markers - migration path)
  if (beforeContent.includes(`crate::${spireModuleName}::commands::`)) {
    return { modified: false, change: '' };
  }

  // First time injection
  const cleanedContent = beforeContent.trim().replace(/,\s*$/, '');
  const newHandler = `tauri::generate_handler![
      ${cleanedContent},
      ${markers.start}
${commandList}
      ${markers.end}
    ]`;

  content = content.replace(fullMatch, newHandler);
  fs.writeFileSync(libRsPath, content, 'utf-8');

  return { modified: true, change: `Added ${commands.length} generated commands` };
}

/**
 * Update existing commands block.
 */
function updateCommandsBlock(
  content: string,
  markers: { start: string; end: string },
  commandList: string,
  indent: string
): { modified: boolean; content: string } {
  const startIdx = content.indexOf(markers.start);
  const endIdx = content.indexOf(markers.end, startIdx);

  if (startIdx === -1 || endIdx === -1) {
    return { modified: false, content };
  }

  const newContent =
    content.slice(0, startIdx + markers.start.length) +
    '\n' +
    commandList +
    '\n' +
    indent +
    content.slice(endIdx);

  return { modified: true, content: newContent };
}

/**
 * Inject setup call into .setup() closure.
 */
function injectSetupCall(
  libRsPath: string,
  spireModuleName: string,
  coreName: string,
  coreCrateName: string
): InjectionResult {
  let content = fs.readFileSync(libRsPath, 'utf-8');

  const coreNamePascal = coreName.charAt(0).toUpperCase() + coreName.slice(1);
  const setupFn = `setupSpire${coreNamePascal}`;
  const cratePrefix = coreCrateName.replace(/-/g, '_');

  // Check if already injected
  if (content.includes(setupFn)) {
    return { modified: false, change: '' };
  }

  // Find .setup() closure
  const setupPattern = /(\.setup\s*\(\s*\|\s*app\s*,\s*api\s*\|\s*\{)([\s\S]*?)(\}\s*\))/;
  const setupMatch = content.match(setupPattern);

  if (!setupMatch) {
    return { modified: false, change: '' };
  }

  const setupBody = setupMatch[2];
  const fullMatch = setupMatch[0];

  const setupLine = `      // Initialize ${coreName} platform (generated)\n      let _${coreName} = ${cratePrefix}::${spireModuleName}::${setupFn}(app, &api)?;\n`;
  const newSetup = `.setup(|app, api| {${setupLine}${setupBody}})`;

  content = content.replace(fullMatch, newSetup);
  fs.writeFileSync(libRsPath, content, 'utf-8');

  return { modified: true, change: `Added ${setupFn}() call to setup` };
}

/**
 * Remove all spire integration from a lib.rs file.
 */
export function unhookTauriPlugin(
  libRsPath: string,
  spireModuleName: string = 'spire'
): { removed: string[] } {
  const removed: string[] = [];

  if (!fs.existsSync(libRsPath)) {
    return { removed };
  }

  let content = fs.readFileSync(libRsPath, 'utf-8');

  // Remove commands block
  const commandMarkers = createRustMarkers('commands', spireModuleName);
  const commandResult = removeFileBlock(libRsPath, commandMarkers);
  if (commandResult.modified) {
    removed.push('commands');
  }

  // Note: We don't remove the module declaration or setup call automatically
  // as they might have manual modifications

  return { removed };
}
