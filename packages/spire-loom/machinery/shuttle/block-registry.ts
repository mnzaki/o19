/**
 * Block Registry Service
 *
 * Tracks all blocks managed by spire-loom across all files.
 * Enables global cleanup of orphaned blocks after generation completes.
 *
 * The loom is a conservation engine - even its remnants must be swept clean.
 */

import * as fs from 'node:fs';

/**
 * Information about a block in a file.
 */
export interface BlockInfo {
  /** Block identifier (e.g., 'RustBuild', 'ServiceDeclaration') */
  blockId: string;
  /** Full marker prefix for this block type (e.g., 'spire-loom:RustBuild') */
  markerPrefix: string;
  /** File path where the block lives */
  filePath: string;
}

/**
 * Registry entry for a file.
 */
interface FileRegistry {
  /** Map of block IDs to the generation they were registered in */
  blocks: Map<string, number>;
  /** Function to clean up a specific block from the file */
  cleanupFn: (filePath: string, blockId: string, content: string) => string | null;
  /** Regex to find all blocks in the file */
  blockPattern: RegExp;
  /** Whether we've already scanned this file for existing blocks */
  scanned: boolean;
}

/**
 * Global block registry - tracks ALL blocks across ALL files.
 * Key: filePath, Value: registry for that file
 */
const globalBlockRegistry = new Map<string, FileRegistry>();

/**
 * Set of files touched during this generation run.
 * Used to know which files need cleanup (even if zero blocks were added).
 */
const touchedFiles = new Set<string>();

/**
 * Current generation number.
 * Incremented at the start of each generation run.
 * Blocks registered in the current generation are "accounted for".
 */
let currentGeneration = 0;

/**
 * Register a file for block tracking.
 * Must be called before ensureBlock operations on a file.
 *
 * @param filePath Path to the file
 * @param blockPattern Regex to find blocks (must capture blockId in group 1)
 * @param cleanupFn Function to remove a block: returns new content or null if no change
 */
export function registerFile(
  filePath: string,
  blockPattern: RegExp,
  cleanupFn: (filePath: string, blockId: string, content: string) => string | null
): void {
  touchedFiles.add(filePath);
  
  if (!globalBlockRegistry.has(filePath)) {
    globalBlockRegistry.set(filePath, {
      blocks: new Map(),
      cleanupFn,
      blockPattern,
      scanned: false,
    });
  }
}

/**
 * Register a block as "accounted for" in a file.
 * Call this when a block is successfully added or updated.
 *
 * @param filePath Path to the file
 * @param blockId Block identifier
 */
export function registerBlock(filePath: string, blockId: string): void {
  touchedFiles.add(filePath);
  
  const registry = globalBlockRegistry.get(filePath);
  if (!registry) {
    throw new Error(`File ${filePath} not registered. Call registerFile() first.`);
  }
  
  registry.blocks.set(blockId, currentGeneration);
}

/**
 * Check if a block is registered in a file.
 */
export function isBlockRegistered(filePath: string, blockId: string): boolean {
  const registry = globalBlockRegistry.get(filePath);
  return registry?.blocks.has(blockId) ?? false;
}

/**
 * Get all registered blocks for a file.
 */
export function getRegisteredBlocks(filePath: string): Set<string> | undefined {
  const registry = globalBlockRegistry.get(filePath);
  if (!registry) return undefined;
  return new Set(registry.blocks.keys());
}

/**
 * Scan a file for existing spire-loom blocks and register them.
 * Call this before processing to pick up blocks from previous runs.
 * Only scans once per file - subsequent calls are no-ops.
 *
 * Blocks found during scanning are registered with the current generation.
 *
 * @param filePath Path to the file
 * @param content File content to scan
 */
export function scanExistingBlocks(filePath: string, content: string): void {
  const registry = globalBlockRegistry.get(filePath);
  if (!registry || registry.scanned) return;
  
  registry.scanned = true;
  
  let match;
  const pattern = new RegExp(registry.blockPattern.source, 'g');
  while ((match = pattern.exec(content)) !== null) {
    const blockId = match[1];
    if (blockId) {
      registry.blocks.set(blockId, currentGeneration);
    }
  }
}

/**
 * Global cleanup: remove all unaccounted blocks from all touched files.
 * Call this ONCE after all generation is complete.
 *
 * Removes blocks that:
 * 1. Exist in the file (physically present)
 * 2. Are registered but NOT in the current generation (orphaned)
 *
 * @returns Summary of cleanup operations
 */
export function cleanupAllBlocks(): { 
  filesProcessed: number; 
  blocksRemoved: number;
  details: Array<{ filePath: string; removed: string[] }>;
} {
  const result = {
    filesProcessed: 0,
    blocksRemoved: 0,
    details: [] as Array<{ filePath: string; removed: string[] }>,
  };
  
  for (const filePath of touchedFiles) {
    const registry = globalBlockRegistry.get(filePath);
    if (!registry) continue;
    
    if (!fs.existsSync(filePath)) {
      // File was deleted or never created - clear registry
      registry.blocks.clear();
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const removed: string[] = [];
    
    // Find all blocks in the file (using the pattern)
    const blocksInFile = new Set<string>();
    let match;
    const pattern = new RegExp(registry.blockPattern.source, 'g');
    while ((match = pattern.exec(content)) !== null) {
      const blockId = match[1];
      if (blockId) {
        blocksInFile.add(blockId);
      }
    }
    
    // Remove blocks that exist in file but aren't in current generation
    for (const blockId of blocksInFile) {
      const blockGeneration = registry.blocks.get(blockId);
      // Block is orphaned if:
      // - Not in registry at all (blockGeneration === undefined), OR
      // - Registered in a previous generation (blockGeneration < currentGeneration)
      if (blockGeneration === undefined || blockGeneration < currentGeneration) {
        const newContent = registry.cleanupFn(filePath, blockId, content);
        if (newContent !== null && newContent !== content) {
          content = newContent;
          removed.push(blockId);
        }
      }
    }
    
    if (removed.length > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      result.blocksRemoved += removed.length;
    }
    
    if (removed.length > 0 || content !== originalContent) {
      result.filesProcessed++;
      result.details.push({ filePath, removed });
    }
  }
  
  return result;
}

/**
 * Start a new generation.
 * Call this at the beginning of each generation run.
 * Increments the generation counter so that blocks registered in previous
 * runs are considered "orphaned" and will be cleaned up.
 */
export function startGeneration(): number {
  currentGeneration++;
  touchedFiles.clear();
  return currentGeneration;
}

/**
 * Get the current generation number.
 */
export function getCurrentGeneration(): number {
  return currentGeneration;
}

/**
 * Clear the entire block registry.
 * Useful for testing or starting fresh.
 */
export function clearBlockRegistry(): void {
  globalBlockRegistry.clear();
  touchedFiles.clear();
  currentGeneration = 0;
}

/**
 * Get statistics about the current registry state.
 */
export function getRegistryStats(): {
  generation: number;
  filesRegistered: number;
  filesTouched: number;
  totalBlocks: number;
} {
  let totalBlocks = 0;
  for (const registry of globalBlockRegistry.values()) {
    totalBlocks += registry.blocks.size;
  }
  
  return {
    generation: currentGeneration,
    filesRegistered: globalBlockRegistry.size,
    filesTouched: touchedFiles.size,
    totalBlocks,
  };
}
