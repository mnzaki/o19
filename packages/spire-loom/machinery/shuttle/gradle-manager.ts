/**
 * Gradle Manager
 *
 * Tools for manipulating Gradle build files (build.gradle, build.gradle.kts).
 * Uses string-based manipulation to preserve formatting and comments.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureDir } from './file-system-operations.js';
import { 
  registerFile, 
  registerBlock, 
  isBlockRegistered 
} from './block-registry.js';

// Gradle block pattern: // spire-loom:blockId followed by newline
// The newline ensures we don't match partial block IDs (e.g., RustBuild vs RustBuild:xxx)
const GRADLE_BLOCK_PATTERN = /\/\/ spire-loom:([^\n]+)/;

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create markers for a Gradle block.
 * Uses newlines to ensure clear boundaries (prevents prefix matching).
 */
function createGradleMarkers(blockId: string): { start: string; end: string } {
  return {
    start: `// spire-loom:${blockId}\n`,
    end: `// /spire-loom:${blockId}\n`,
  };
}

/**
 * Cleanup function for Gradle blocks.
 * Removes a specific block from Gradle content.
 * Uses line-based matching to ensure exact block ID matching.
 */
function cleanupGradleBlock(_filePath: string, blockId: string, content: string): string | null {
  // Build exact marker lines (without the trailing newlines that createGradleMarkers adds)
  const startMarker = `// spire-loom:${blockId}`;
  const endMarker = `// /spire-loom:${blockId}`;
  
  // Find the start of the block - must be at the beginning of a line
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === startMarker) {
      startIdx = i;
    } else if (line === endMarker && startIdx !== -1) {
      endIdx = i;
      break;
    }
  }
  
  if (startIdx === -1 || endIdx === -1) return null;
  
  // Remove the block lines (inclusive)
  const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)];
  return newLines.join('\n');
}

/**
 * Ensure a Gradle block is present in a build file (idempotent).
 * 
 * @param filePath Path to build.gradle or build.gradle.kts
 * @param blockId Unique identifier for this block
 * @param blockContent The Gradle content to insert
 * @param options Where to insert the block
 * @returns true if added/updated, false if already present with same content
 */
export function ensureGradleBlock(
  filePath: string,
  blockId: string,
  blockContent: string,
  options: { after?: string; before?: string } = {}
): boolean {
  ensureDir(path.dirname(filePath));
  
  // Register this file for global cleanup
  registerFile(filePath, GRADLE_BLOCK_PATTERN, cleanupGradleBlock);
  
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }
  
  const { start, end } = createGradleMarkers(blockId);
  // Start and end already include newlines for boundary protection
  const fullBlock = `${start}${blockContent}\n${end}`;
  
  // Check if block exists in file
  if (content.includes(start)) {
    // Find existing block
    const startIdx = content.indexOf(start);
    const endIdx = content.indexOf(end, startIdx);
    if (endIdx === -1) {
      // Malformed block - remove and re-add
      content = content.slice(0, startIdx) + content.slice(startIdx + start.length);
    } else {
      const existingBlock = content.slice(startIdx, endIdx + end.length);
      if (existingBlock === fullBlock) {
        // No change needed, but re-register to update generation
        registerBlock(filePath, blockId);
        return false;
      }
      // Replace existing block
      content = content.slice(0, startIdx) + fullBlock + content.slice(endIdx + end.length);
      fs.writeFileSync(filePath, content, 'utf-8');
      registerBlock(filePath, blockId);
      return true;
    }
  }
  
  // Find insertion point
  let insertIdx = content.length;
  if (options.after) {
    const afterIdx = content.indexOf(options.after);
    if (afterIdx !== -1) {
      // Find the closing brace of this block (simple approach)
      const afterContent = content.slice(afterIdx);
      const blockEndMatch = afterContent.match(/\n\s*\}\s*(?:\n|$)/);
      if (blockEndMatch) {
        insertIdx = afterIdx + blockEndMatch.index! + blockEndMatch[0].length;
      } else {
        insertIdx = afterIdx + options.after.length;
      }
    }
  } else if (options.before) {
    const beforeIdx = content.indexOf(options.before);
    if (beforeIdx !== -1) {
      insertIdx = beforeIdx;
    }
  }
  
  // Insert with proper formatting
  const needsLeadingNewline = insertIdx > 0 && content[insertIdx - 1] !== '\n';
  const formattedBlock = (needsLeadingNewline ? '\n\n' : '\n') + fullBlock + '\n';
  
  content = content.slice(0, insertIdx) + formattedBlock + content.slice(insertIdx);
  fs.writeFileSync(filePath, content, 'utf-8');
  
  registerBlock(filePath, blockId);
  return true;
}

/**
 * Ensure a Gradle block is removed from a build file.
 */
export function ensureGradleBlockRemoved(
  filePath: string,
  blockId: string
): boolean {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const { start, end } = createGradleMarkers(blockId);
  
  if (!content.includes(start)) return false;
  
  const startIdx = content.indexOf(start);
  const endIdx = content.indexOf(end, startIdx);
  
  if (endIdx === -1) {
    content = content.replace(start, '');
  } else {
    const regex = new RegExp(
      `\\n?${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\n?`,
      'g'
    );
    content = content.replace(regex, '');
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

/**
 * Ensure a source set configuration is present in build.gradle.
 * 
 * Uses `srcDir` (singular) to ADD to existing source directories
 * instead of `srcDirs = [...]` which would REPLACE them.
 * 
 * This preserves the original source paths while adding our generated paths.
 * 
 * @param filePath Path to build.gradle or build.gradle.kts
 * @param name Source set name (e.g., 'main')
 * @param config Source set configuration
 * @returns true if added/updated, false if unchanged
 */
export function ensureGradleSourceSet(
  filePath: string,
  name: string,
  config: {
    java?: string[];
    kotlin?: string[];
    res?: string[];
    aidl?: string[];
    jniLibs?: string[];
    assets?: string[];
    manifest?: string;
  }
): boolean {
  ensureDir(path.dirname(filePath));
  
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }
  
  // Filter out empty configs
  const hasConfig = Object.values(config).some(v => v && (Array.isArray(v) ? v.length > 0 : true));
  if (!hasConfig) return false;
  
  // Check if android block exists
  if (!content.includes('android {')) {
    // Create basic structure with sourceSets using srcDir (append style)
    const lines: string[] = [`android {`, `    sourceSets {`, `        ${name} {`];
    
    // Use srcDir (singular) to add to existing paths
    if (config.java?.length) {
      for (const dir of config.java) {
        lines.push(`            java.srcDir '${dir}'`);
      }
    }
    if (config.kotlin?.length) {
      for (const dir of config.kotlin) {
        lines.push(`            kotlin.srcDir '${dir}'`);
      }
    }
    if (config.res?.length) {
      for (const dir of config.res) {
        lines.push(`            res.srcDir '${dir}'`);
      }
    }
    if (config.aidl?.length) {
      for (const dir of config.aidl) {
        lines.push(`            aidl.srcDir '${dir}'`);
      }
    }
    if (config.jniLibs?.length) {
      for (const dir of config.jniLibs) {
        lines.push(`            jniLibs.srcDir '${dir}'`);
      }
    }
    if (config.assets?.length) {
      for (const dir of config.assets) {
        lines.push(`            assets.srcDir '${dir}'`);
      }
    }
    if (config.manifest) {
      lines.push(`            manifest.srcFile '${config.manifest}'`);
    }
    
    lines.push(`        }`, `    }`, `}`);
    
    content = `plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}

${lines.join('\n')}
`;
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  // Check if we already have a spire-loom managed source set block
  const markerId = `SourceSetAppend_${name}`;
  const { start, end } = createGradleMarkers(markerId);
  
  // Build the source set append block
  const lines: string[] = [];
  
  if (config.java?.length) {
    for (const dir of config.java) {
      lines.push(`            java.srcDir '${dir}'`);
    }
  }
  if (config.kotlin?.length) {
    for (const dir of config.kotlin) {
      lines.push(`            kotlin.srcDir '${dir}'`);
    }
  }
  if (config.res?.length) {
    for (const dir of config.res) {
      lines.push(`            res.srcDir '${dir}'`);
    }
  }
  if (config.aidl?.length) {
    for (const dir of config.aidl) {
      lines.push(`            aidl.srcDir '${dir}'`);
    }
  }
  if (config.jniLibs?.length) {
    for (const dir of config.jniLibs) {
      lines.push(`            jniLibs.srcDir '${dir}'`);
    }
  }
  if (config.assets?.length) {
    for (const dir of config.assets) {
      lines.push(`            assets.srcDir '${dir}'`);
    }
  }
  if (config.manifest) {
    lines.push(`            manifest.srcFile '${config.manifest}'`);
  }
  
  if (lines.length === 0) return false;
  
  const sourceSetBlock = `android {
    sourceSets {
        ${name} {
${lines.join('\n')}
        }
    }
}`;
  
  // Check if already exists
  if (content.includes(start)) {
    // Update existing block
    const startIdx = content.indexOf(start);
    const endIdx = content.indexOf(end, startIdx);
    if (endIdx !== -1) {
      const existingBlock = content.slice(startIdx, endIdx + end.length);
      const newBlock = `${start}\n${sourceSetBlock}\n${end}`;
      if (existingBlock === newBlock) {
        return false; // No change
      }
      content = content.slice(0, startIdx) + newBlock + content.slice(endIdx + end.length);
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
  }
  
  // Find the LAST android block and insert before its closing brace
  const androidBlocks: number[] = [];
  let idx = 0;
  while ((idx = content.indexOf('android {', idx)) !== -1) {
    androidBlocks.push(idx);
    idx++;
  }
  
  if (androidBlocks.length === 0) {
    throw new Error('Could not find android block');
  }
  
  const lastAndroidIdx = androidBlocks[androidBlocks.length - 1];
  const afterAndroid = content.slice(lastAndroidIdx);
  
  // Find the matching closing brace for this android block
  let braceCount = 0;
  let closeIdx = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < afterAndroid.length; i++) {
    const char = afterAndroid[i];
    const prevChar = i > 0 ? afterAndroid[i - 1] : '';
    
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      continue;
    }
    if (inString) continue;
    
    if (char === '{') braceCount++;
    if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  
  const insertIdx = lastAndroidIdx + closeIdx;
  const fullBlock = `\n${start}\n${sourceSetBlock}\n${end}\n`;
  
  content = content.slice(0, insertIdx) + fullBlock + content.slice(insertIdx);
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

/**
 * Clear the Gradle block registry (useful for testing).
 * @deprecated Use clearBlockRegistry from block-registry.js instead
 */
export function clearGradleBlockRegistry(): void {
  // No-op - global registry is used now
}
