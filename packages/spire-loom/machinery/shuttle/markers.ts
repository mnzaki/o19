/**
 * Marker Utilities
 *
 * Generates consistent marker tags for code injection across all languages.
 *
 * Unified format: SPIRE-LOOM:SCOPE:IDENTIFIER
 * End marker:    /SPIRE-LOOM:SCOPE:IDENTIFIER
 *
 * Language-specific wrappers add comment syntax:
 *   - Rust:   block comments (slash-asterisk ... asterisk-slash)
 *   - Gradle: line comments with trailing newline
 *   - XML:    HTML-style comments
 *   - TOML:   hash comments
 */

import * as fs from 'node:fs';

export interface MarkerPair {
  start: string;
  end: string;
}

/**
 * Build the inner tag value.
 * Format: SPIRE-LOOM:<SCOPE>:<IDENTIFIER>
 */
export function buildMarkerTag(scope: string, identifier: string): string {
  return `SPIRE-LOOM:${scope.toUpperCase()}:${identifier.toUpperCase()}`;
}

/**
 * Build the end marker inner tag value.
 * Format: /SPIRE-LOOM:<SCOPE>:<IDENTIFIER>
 */
export function buildEndMarkerTag(scope: string, identifier: string): string {
  return `/SPIRE-LOOM:${scope.toUpperCase()}:${identifier.toUpperCase()}`;
}

/**
 * Create Rust-style block comment markers.
 */
export function createRustMarkers(scope: string, identifier: string): MarkerPair {
  const startTag = buildMarkerTag(scope, identifier);
  const endTag = buildEndMarkerTag(scope, identifier);
  return {
    start: `/* ${startTag} */`,
    end: `/* ${endTag} */`,
  };
}

/**
 * Create Gradle/Java-style line comment markers.
 * Includes trailing newline for boundary protection.
 */
export function createGradleMarkers(scope: string, identifier: string): MarkerPair {
  const startTag = buildMarkerTag(scope, identifier);
  const endTag = buildEndMarkerTag(scope, identifier);
  return {
    start: `// ${startTag}\n`,
    end: `// ${endTag}\n`,
  };
}

/**
 * Create XML/HTML-style comment markers.
 */
export function createXmlMarkers(scope: string, identifier: string): MarkerPair {
  const startTag = buildMarkerTag(scope, identifier);
  const endTag = buildEndMarkerTag(scope, identifier);
  return {
    start: `<!-- ${startTag} -->`,
    end: `<!-- ${endTag} -->`,
  };
}

/**
 * Create TOML/INI-style comment markers.
 */
export function createTomlMarkers(scope: string, identifier: string): MarkerPair {
  const startTag = buildMarkerTag(scope, identifier);
  const endTag = buildEndMarkerTag(scope, identifier);
  return {
    start: `# ${startTag}`,
    end: `# ${endTag}`,
  };
}

/**
 * Escape special regex characters in a marker string.
 */
export function escapeMarkerForRegex(marker: string): string {
  return marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex pattern to match content between markers.
 */
export function buildBlockRegex(startMarker: string, endMarker: string): RegExp {
  const escapedStart = escapeMarkerForRegex(startMarker);
  const escapedEnd = escapeMarkerForRegex(endMarker);
  return new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, 'g');
}

/**
 * Create markers for a specific language.
 */
export function createMarkers(
  language: 'rust' | 'gradle' | 'xml' | 'toml',
  scope: string,
  identifier: string
): MarkerPair {
  switch (language) {
    case 'rust':
      return createRustMarkers(scope, identifier);
    case 'gradle':
      return createGradleMarkers(scope, identifier);
    case 'xml':
      return createXmlMarkers(scope, identifier);
    case 'toml':
      return createTomlMarkers(scope, identifier);
    default:
      throw new Error(`Unknown language: ${language}`);
  }
}

// ============================================================================
// Generic Block Operations
// ============================================================================

export interface BlockOperationResult {
  modified: boolean;
  content: string;
}

/**
 * Find a marked block in content.
 * Returns the start/end indices or null if not found.
 */
export function findBlock(
  content: string,
  markers: MarkerPair
): { startIdx: number; endIdx: number; innerStart: number; innerEnd: number } | null {
  const startIdx = content.indexOf(markers.start);
  if (startIdx === -1) return null;

  const endIdx = content.indexOf(markers.end, startIdx);
  if (endIdx === -1) return null;

  return {
    startIdx,
    endIdx: endIdx + markers.end.length,
    innerStart: startIdx + markers.start.length,
    innerEnd: endIdx,
  };
}

/**
 * Check if a marked block exists in content.
 */
export function hasBlock(content: string, markers: MarkerPair): boolean {
  return content.includes(markers.start);
}

/**
 * Insert a new block into content.
 * If insertAfter is provided, inserts after that pattern, otherwise at end.
 */
export function insertBlock(
  content: string,
  markers: MarkerPair,
  blockContent: string,
  options?: {
    insertAfter?: string;
    insertBefore?: string;
    indent?: string;
    trailingNewline?: boolean;
  }
): BlockOperationResult {
  // Check if already exists
  if (hasBlock(content, markers)) {
    return { modified: false, content };
  }

  const indent = options?.indent ?? '';
  const trailingNewline = options?.trailingNewline ?? true;
  
  const fullBlock = options?.insertAfter
    ? `${indent}${markers.start}\n${blockContent}\n${indent}${markers.end}${trailingNewline ? '\n' : ''}`
    : `${indent}${markers.start}\n${blockContent}\n${indent}${markers.end}${trailingNewline ? '\n' : ''}`;

  let insertIdx = content.length;

  if (options?.insertAfter) {
    const afterIdx = content.indexOf(options.insertAfter);
    if (afterIdx !== -1) {
      insertIdx = afterIdx + options.insertAfter.length;
    }
  } else if (options?.insertBefore) {
    const beforeIdx = content.indexOf(options.insertBefore);
    if (beforeIdx !== -1) {
      insertIdx = beforeIdx;
    }
  }

  const newContent = content.slice(0, insertIdx) + fullBlock + content.slice(insertIdx);
  return { modified: true, content: newContent };
}

/**
 * Replace content inside an existing block.
 */
export function replaceBlock(
  content: string,
  markers: MarkerPair,
  newBlockContent: string
): BlockOperationResult {
  const block = findBlock(content, markers);
  if (!block) {
    return { modified: false, content };
  }

  const newContent =
    content.slice(0, block.innerStart) +
    '\n' +
    newBlockContent +
    '\n' +
    content.slice(block.innerEnd);

  return { modified: true, content: newContent };
}

/**
 * Remove a marked block from content.
 */
export function removeBlock(content: string, markers: MarkerPair): BlockOperationResult {
  const block = findBlock(content, markers);
  if (!block) {
    return { modified: false, content };
  }

  const newContent = content.slice(0, block.startIdx) + content.slice(block.endIdx);
  return { modified: true, content: newContent };
}

/**
 * Ensure a block exists with the given content (idempotent).
 * If block exists, updates it. If not, inserts it.
 */
export function ensureBlock(
  content: string,
  markers: MarkerPair,
  blockContent: string,
  options?: {
    insertAfter?: string;
    insertBefore?: string;
    indent?: string;
  }
): BlockOperationResult {
  // Try to replace existing block first
  const replaceResult = replaceBlock(content, markers, blockContent);
  if (replaceResult.modified) {
    return replaceResult;
  }

  // Block doesn't exist, insert it
  return insertBlock(content, markers, blockContent, options);
}

// ============================================================================
// File-based Operations
// ============================================================================

export interface FileBlockResult extends BlockOperationResult {
  filePath: string;
}

/**
 * Read a file and ensure a block exists.
 * Writes back to file if modified.
 */
export function ensureFileBlock(
  filePath: string,
  markers: MarkerPair,
  blockContent: string,
  options?: {
    insertAfter?: string;
    insertBefore?: string;
    indent?: string;
  }
): FileBlockResult {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
  }

  const result = ensureBlock(content, markers, blockContent, options);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf-8');
  }

  return { ...result, filePath };
}

/**
 * Remove a block from a file.
 */
export function removeFileBlock(filePath: string, markers: MarkerPair): FileBlockResult {
  if (!fs.existsSync(filePath)) {
    return { modified: false, content: '', filePath };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const result = removeBlock(content, markers);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf-8');
  }

  return { ...result, filePath };
}
