/**
 * XML Block Manager
 *
 * Manages XML blocks in files like AndroidManifest.xml.
 * Uses XML parser for detection/checking, regex for precise modifications.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { ensureDir } from './file-system-operations.js';
import { 
  registerFile, 
  registerBlock, 
  scanExistingBlocks,
  isBlockRegistered,
  getRegisteredBlocks,
  clearBlockRegistry 
} from './block-registry.js';

/**
 * XML block pattern: <!-- spire-loom:blockId:tagName -->
 * Captures blockId in group 1.
 */
const XML_BLOCK_PATTERN = /<!-- spire-loom:([^:]+):[\w-]+ -->/;

/**
 * A single XML block definition.
 */
export interface XmlBlock {
  /** The XML content (single tag, without marker comments) */
  content: string;
  /** Where to insert: 'manifest', 'application', or 'permissions' */
  parent: 'manifest' | 'application' | 'permissions';
  /**
   * Attributes to use for matching existing elements (for manual override detection).
   * Defaults to ['android:name'] if not specified.
   * If an element exists with matching values for ALL these attributes,
   * it's considered a manual override and won't be replaced.
   */
  keyAttributes?: string[];
}

/**
 * Map of block identifiers to their definitions.
 * The key is used to generate the marker comment.
 */
export type XmlBlockMap = Record<string, XmlBlock>;

// XML Parser options for detection only (no need for builder)
const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  preserveOrder: false,
  processEntities: false,
};

/**
 * Extract key attributes from an element for comparison.
 * Handles the @_ prefix added by the XML parser.
 */
function extractKey(
  attrs: Record<string, string>,
  keyAttributes: string[]
): string | null {
  const parts: string[] = [];
  for (const attr of keyAttributes) {
    // Try with and without @_ prefix
    let value = attrs[attr];
    if (value === undefined) {
      value = attrs[`@_${attr}`];
    }
    if (value === undefined) return null;
    parts.push(`${attr}="${value}"`);
  }
  return parts.join(' ');
}

/**
 * Check if an element with matching key attributes exists in the XML.
 */
function hasMatchingElement(
  parsed: any,
  tagName: string,
  keyAttributes: string[],
  desiredAttrs: Record<string, string>
): boolean {
  const manifest = parsed.manifest;
  if (!manifest) return false;
  
  const searchContainers = [manifest];
  if (manifest.application) {
    searchContainers.push(manifest.application);
  }
  
  const desiredKey = extractKey(desiredAttrs, keyAttributes);
  if (!desiredKey) return false;
  
  for (const container of searchContainers) {
    const elements = container[tagName];
    if (!elements) continue;
    
    const arr = Array.isArray(elements) ? elements : [elements];
    
    for (const el of arr) {
      if (!el || typeof el !== 'object') continue;
      // Attributes are directly on the element with @_ prefix
      const key = extractKey(el, keyAttributes);
      if (key === desiredKey) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Parse a block content string to get tag name and attributes.
 */
function parseBlockInfo(content: string): { tag: string; attrs: Record<string, string> } {
  const parser = new XMLParser(PARSER_OPTIONS);
  const wrapped = `<root>${content}</root>`;
  const parsed = parser.parse(wrapped);
  
  const root = parsed.root || parsed;
  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith('@_')) continue;
    if (typeof value === 'object' && value !== null) {
      // Attributes are directly on the element object with @_ prefix
      return { tag: key, attrs: value as Record<string, string> };
    }
  }
  
  throw new Error('No valid element found in block content');
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create start and end markers for a block.
 */
function createMarkers(blockId: string, tagName: string): { start: string; end: string } {
  return {
    start: `<!-- spire-loom:${blockId}:${tagName} -->`,
    end: `<!-- /spire-loom:${blockId}:${tagName} -->`,
  };
}

/**
 * Find the insertion point for a block in XML content.
 * Handles both self-closing and separate closing tags.
 */
function findInsertionPoint(content: string, parent: string): number {
  switch (parent) {
    case 'manifest': {
      // Find </manifest> or self-closing <manifest ... />
      const manifestEnd = content.lastIndexOf('</manifest>');
      if (manifestEnd !== -1) return manifestEnd;
      // Handle self-closing (rare for manifest but possible)
      const selfClose = content.match(/<manifest[^>]*\/>/);
      if (selfClose) return selfClose.index! + selfClose[0].length;
      throw new Error('No </manifest> tag found');
    }
    case 'application': {
      // Look for </application> first
      const appEnd = content.indexOf('</application>');
      if (appEnd !== -1) return appEnd;
      // Look for self-closing <application ... />
      const selfClose = content.match(/<application[^/]*\/>/);
      if (selfClose) {
        // Convert self-closing to open tag
        const start = selfClose.index!;
        const end = start + selfClose[0].length;
        return start; // Will insert after converting
      }
      throw new Error('No </application> tag found');
    }
    case 'permissions': {
      // Insert before <application> or before </manifest>
      const appMatch = content.match(/(\n)(\s*)<application[\s>]/);
      if (appMatch) {
        // Return index of the newline before <application>
        // The block will be inserted after the newline, before the indentation
        return appMatch.index! + 1; // Position after the \n
      }
      // Fallback: no newline before application (edge case)
      const appStart = content.search(/<application[\s>]/);
      if (appStart !== -1) return appStart;
      const manifestEnd = content.lastIndexOf('</manifest>');
      if (manifestEnd !== -1) return manifestEnd;
      throw new Error('No insertion point found for permissions');
    }
    default:
      throw new Error(`Unknown parent: ${parent}`);
  }
}

/**
 * Convert self-closing application tag to open/close form.
 * Returns new content and the insertion point.
 */
function ensureApplicationOpen(content: string): { content: string; insertPoint: number } {
  // Check for self-closing tag: <application ... />
  const selfCloseMatch = content.match(/(<application[^>]*)\/>/);
  if (selfCloseMatch) {
    // Make sure it's not just a tag ending with />
    const tagContent = selfCloseMatch[1];
    if (!tagContent.endsWith('/')) {
      // Convert <application ... /> to <application ...></application>
      const openTag = tagContent + '>';
      const newContent = content.replace(
        selfCloseMatch[0],
        openTag + '</application>'
      );
      const insertPoint = newContent.indexOf('</application>');
      return { content: newContent, insertPoint };
    }
  }
  
  // Already open/close form
  const appEnd = content.indexOf('</application>');
  if (appEnd === -1) throw new Error('No </application> tag found');
  return { content, insertPoint: appEnd };
}

/**
 * Ensure XML blocks are present in a file (with markers for tracking).
 * This function is idempotent and can be called multiple times.
 * 
 * Manual Override: If an equivalent element exists without a spire-loom marker,
 * the generator will NOT add a marked version. This allows users to manually
 * control elements without interference.
 * 
 * @param filePath Path to the XML file
 * @param blockMap Map of block IDs to their definitions
 * @returns Object listing added, removed, and updated block IDs
 */
export function ensureXmlBlock(
  filePath: string,
  blockMap: XmlBlockMap
): { added: string[]; removed: string[]; updated: string[] } {
  const result = { added: [] as string[], removed: [] as string[], updated: [] as string[] };
  
  ensureDir(path.dirname(filePath));
  
  // Register this file for global cleanup
  registerFile(filePath, XML_BLOCK_PATTERN, cleanupXmlBlock);
  
  // Read existing content
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }
  
  // Scan for existing spire-loom markers and register them
  scanExistingBlocks(filePath, content);
  
  // If file doesn't exist or is empty, create a basic manifest structure
  if (!content.trim()) {
    content = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application/>
</manifest>`;
  }
  
  // Parse for detection only
  const parser = new XMLParser(PARSER_OPTIONS);
  let parsed: any;
  try {
    parsed = parser.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse ${filePath}: ${e}`);
  }
  
  
  // Process each block
  for (const [blockId, block] of Object.entries(blockMap)) {
    // Default key attributes to android:name
    const keyAttributes = block.keyAttributes ?? ['android:name'];
    
    // Parse block info for detection
    let blockInfo: { tag: string; attrs: Record<string, string> };
    try {
      blockInfo = parseBlockInfo(block.content);
    } catch (e) {
      throw new Error(`Failed to parse block content for ${blockId}: ${e}`);
    }
    
    const { tag, attrs } = blockInfo;
    const { start, end } = createMarkers(blockId, tag);
    
    // Check if already managed by us
    if (isBlockRegistered(filePath, blockId) && content.includes(start)) {
      // Check if content changed
      const blockRegex = new RegExp(
        `${escapeRegex(start)}([\\s\\S]*?)${escapeRegex(end)}`
      );
      const existingMatch = content.match(blockRegex);
      
      if (existingMatch) {
        const existingContent = existingMatch[1].trim();
        const newContent = block.content.trim();
        
        if (existingContent !== newContent) {
          // Update: replace old block with new
          const fullBlock = `\n    ${start}\n    ${block.content}\n    ${end}\n`;
          content = content.replace(blockRegex, fullBlock);
          result.updated.push(blockId);
        }
      }
      // Re-register to update generation
      registerBlock(filePath, blockId);
      continue;
    }
    
    // Check for manual override: element exists but not managed by us
    if (!content.includes(start)) {
      const exists = hasMatchingElement(parsed, tag, keyAttributes, attrs);
      if (exists) {
        const key = extractKey(attrs, keyAttributes);
        console.log(`  Manual override: ${blockId} already exists (${key})`);
        registerBlock(filePath, blockId);
        continue;
      }
    }
    
    // Add new block
    let insertPoint: number;
    
    if (block.parent === 'application') {
      // Need to handle self-closing application tag
      const ensured = ensureApplicationOpen(content);
      content = ensured.content;
      insertPoint = ensured.insertPoint;
    } else {
      insertPoint = findInsertionPoint(content, block.parent);
    }
    
    // Format block with proper indentation
    const indent = '    ';
    const fullBlock = `${indent}${start}\n${indent}${block.content}\n${indent}${end}\n`;
    content = content.slice(0, insertPoint) + fullBlock + content.slice(insertPoint);
    
    registerBlock(filePath, blockId);
    result.added.push(blockId);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return result;
}

/**
 * Cleanup function for XML blocks.
 * Removes a specific block from XML content.
 */
function cleanupXmlBlock(_filePath: string, blockId: string, content: string): string | null {
  // Find the tag name for this block
  const tagPattern = new RegExp(`<!-- spire-loom:${escapeRegex(blockId)}:([\\w-]+) -->`);
  const tagMatch = content.match(tagPattern);
  if (!tagMatch) return null;
  
  const tagName = tagMatch[1];
  const { start, end } = createMarkers(blockId, tagName);
  const blockRegex = new RegExp(
    `[ \\t]*${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}[ \\t]*\\n?`,
    'g'
  );
  return content.replace(blockRegex, '');
}

/**
 * Clear the XML block registry (useful for testing).
 * @deprecated Use clearBlockRegistry from block-registry.js instead
 */
export function clearXmlBlockRegistry(): void {
  clearBlockRegistry();
}
