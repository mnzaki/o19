/**
 * XML Block Manager
 *
 * Manages XML blocks in files like AndroidManifest.xml.
 * Uses the generic marker utilities for block operations.
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
  clearBlockRegistry 
} from './block-registry.js';
import { 
  createXmlMarkers,
  ensureBlock,
  removeBlock,
  hasBlock,
  escapeMarkerForRegex,
} from './markers.js';

// XML block pattern for registry: <!-- SPIRE-LOOM:XML:BLOCKID -->
const XML_BLOCK_PATTERN = /<!-- SPIRE-LOOM:XML:([\w-]+) -->/;

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
   */
  keyAttributes?: string[];
}

export type XmlBlockMap = Record<string, XmlBlock>;

// XML Parser options for detection only
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
 */
function extractKey(
  attrs: Record<string, string>,
  keyAttributes: string[]
): string | null {
  const parts: string[] = [];
  for (const attr of keyAttributes) {
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
      return { tag: key, attrs: value as Record<string, string> };
    }
  }
  
  throw new Error('No valid element found in block content');
}

/**
 * Find the insertion point for a block in XML content.
 */
function findInsertionPoint(content: string, parent: string): number {
  switch (parent) {
    case 'manifest': {
      const manifestEnd = content.lastIndexOf('</manifest>');
      if (manifestEnd !== -1) return manifestEnd;
      const selfClose = content.match(/<manifest[^>]*\/>/);
      if (selfClose) return selfClose.index! + selfClose[0].length;
      throw new Error('No </manifest> tag found');
    }
    case 'application': {
      const appEnd = content.indexOf('</application>');
      if (appEnd !== -1) return appEnd;
      // Handle self-closing - will need conversion
      const selfClose = content.match(/<application[^/]*\/>/);
      if (selfClose) return selfClose.index!;
      throw new Error('No </application> tag found');
    }
    case 'permissions': {
      const appMatch = content.match(/(\n)(\s*)<application[\s>]/);
      if (appMatch) {
        return appMatch.index! + 1;
      }
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
 */
function ensureApplicationOpen(content: string): { content: string; insertPoint: number } {
  const selfCloseMatch = content.match(/(<application[^>]*)\/>/);
  if (selfCloseMatch) {
    const tagContent = selfCloseMatch[1];
    if (!tagContent.endsWith('/')) {
      const openTag = tagContent + '>';
      const newContent = content.replace(
        selfCloseMatch[0],
        openTag + '</application>'
      );
      const insertPoint = newContent.indexOf('</application>');
      return { content: newContent, insertPoint };
    }
  }
  
  const appEnd = content.indexOf('</application>');
  if (appEnd === -1) throw new Error('No </application> tag found');
  return { content, insertPoint: appEnd };
}

/**
 * Ensure XML blocks are present in a file (with markers for tracking).
 * Uses the generic marker utilities for block operations.
 */
export function ensureXmlBlock(
  filePath: string,
  blockMap: XmlBlockMap
): { added: string[]; removed: string[]; updated: string[] } {
  const result = { added: [] as string[], removed: [] as string[], updated: [] as string[] };
  
  ensureDir(path.dirname(filePath));
  
  // Register this file for global cleanup
  registerFile(filePath, XML_BLOCK_PATTERN, (_file, blockId, content) => {
    const markers = createXmlMarkers('xml', blockId);
    const res = removeBlock(content, markers);
    return res.modified ? res.content : null;
  });
  
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
    const keyAttributes = block.keyAttributes ?? ['android:name'];
    const markers = createXmlMarkers('xml', blockId);
    
    // Parse block info for detection
    let blockInfo: { tag: string; attrs: Record<string, string> };
    try {
      blockInfo = parseBlockInfo(block.content);
    } catch (e) {
      throw new Error(`Failed to parse block content for ${blockId}: ${e}`);
    }
    
    // Check if already managed by us
    if (isBlockRegistered(filePath, blockId) && hasBlock(content, markers)) {
      // Check if content changed using generic block operations
      const blockRegex = new RegExp(
        `${escapeMarkerForRegex(markers.start)}([\\s\\S]*?)${escapeMarkerForRegex(markers.end)}`
      );
      const existingMatch = content.match(blockRegex);
      
      if (existingMatch) {
        const existingContent = existingMatch[1].trim();
        const newContent = block.content.trim();
        
        if (existingContent !== newContent) {
          // Update using generic replace
          const res = ensureBlock(content, markers, block.content);
          if (res.modified) {
            content = res.content;
            result.updated.push(blockId);
          }
        }
      }
      registerBlock(filePath, blockId);
      continue;
    }
    
    // Check for manual override
    if (!hasBlock(content, markers)) {
      const exists = hasMatchingElement(parsed, blockInfo.tag, keyAttributes, blockInfo.attrs);
      if (exists) {
        const key = extractKey(blockInfo.attrs, keyAttributes);
        console.log(`  Manual override: ${blockId} already exists (${key})`);
        registerBlock(filePath, blockId);
        continue;
      }
    }
    
    // Add new block
    let insertPoint: number;
    
    if (block.parent === 'application') {
      const ensured = ensureApplicationOpen(content);
      content = ensured.content;
      insertPoint = ensured.insertPoint;
    } else {
      insertPoint = findInsertionPoint(content, block.parent);
    }
    
    // Format block with proper indentation
    const indent = '    ';
    const fullBlock = `\n${indent}${markers.start}\n${indent}${block.content}\n${indent}${markers.end}\n`;
    content = content.slice(0, insertPoint) + fullBlock + content.slice(insertPoint);
    
    registerBlock(filePath, blockId);
    result.added.push(blockId);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return result;
}

/**
 * Clear the XML block registry (useful for testing).
 * @deprecated Use clearBlockRegistry from block-registry.js instead
 */
export function clearXmlBlockRegistry(): void {
  clearBlockRegistry();
}
