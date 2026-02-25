/**
 * Android Manifest Hookup Handler
 *
 * Applies AndroidManifest.xml hookups declaratively.
 */

import * as path from 'node:path';
import type { GeneratorContext } from '../../heddles/index.js';
import type { AndroidManifestHookup, HookupResult, AndroidPermission, AndroidPermissionDefinition, AndroidService } from './types.js';
import { ensureXmlBlock, type XmlBlockMap } from '../xml-block-manager.js';

/**
 * Apply AndroidManifest.xml hookup.
 */
export function applyAndroidManifestHookup(
  filePath: string,
  spec: AndroidManifestHookup,
  context: GeneratorContext
): HookupResult {
  const blockMap: XmlBlockMap = {};
  const added: string[] = [];
  
  // Build permission blocks
  if (spec.permissions) {
    for (const perm of spec.permissions) {
      const blockId = `Permission_${perm.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      blockMap[blockId] = {
        content: buildPermissionXml(perm),
        parent: 'permissions',
      };
      added.push(blockId);
    }
  }
  
  // Build permission definitions
  if (spec.permissionDefinitions) {
    for (const def of spec.permissionDefinitions) {
      const blockId = `PermDef_${def.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      blockMap[blockId] = {
        content: buildPermissionDefXml(def),
        parent: 'permissions',
      };
      added.push(blockId);
    }
  }
  
  // Build service blocks
  if (spec.services) {
    for (const svc of spec.services) {
      const blockId = `Service_${svc.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      blockMap[blockId] = {
        content: buildServiceXml(svc),
        parent: 'application',
      };
      added.push(blockId);
    }
  }
  
  // Add raw application blocks
  if (spec.applicationBlocks) {
    for (let i = 0; i < spec.applicationBlocks.length; i++) {
      const blockId = `AppBlock_${i}`;
      blockMap[blockId] = {
        content: spec.applicationBlocks[i],
        parent: 'application',
      };
      added.push(blockId);
    }
  }
  
  // Add raw manifest blocks
  if (spec.manifestBlocks) {
    for (let i = 0; i < spec.manifestBlocks.length; i++) {
      const blockId = `ManifestBlock_${i}`;
      blockMap[blockId] = {
        content: spec.manifestBlocks[i],
        parent: 'manifest',
      };
      added.push(blockId);
    }
  }
  
  // Apply all blocks
  if (Object.keys(blockMap).length > 0) {
    ensureXmlBlock(filePath, blockMap);
  }
  
  return {
    path: filePath,
    type: 'android-manifest',
    status: added.length > 0 ? 'applied' : 'skipped',
    message: added.length > 0 ? `Added ${added.length} blocks` : 'No blocks to add',
  };
}

/**
 * Build permission XML element.
 */
function buildPermissionXml(perm: AndroidPermission): string {
  const attrs = Object.entries(perm)
    .filter(([key]) => key !== 'name')
    .map(([key, value]) => `android:${key}="${value}"`)
    .join(' ');
  
  if (attrs) {
    return `<uses-permission android:name="${perm.name}" ${attrs} />`;
  }
  return `<uses-permission android:name="${perm.name}" />`;
}

/**
 * Build permission definition XML (permission + uses-permission).
 */
function buildPermissionDefXml(def: AndroidPermissionDefinition): string {
  const { name, label, protectionLevel, ...otherAttrs } = def;
  
  let permissionAttrs = `android:name="${name}"`;
  if (label) permissionAttrs += ` android:label="${label}"`;
  if (protectionLevel) permissionAttrs += ` android:protectionLevel="${protectionLevel}"`;
  
  // Add any other attributes
  for (const [key, value] of Object.entries(otherAttrs)) {
    if (typeof value === 'string') {
      permissionAttrs += ` android:${key}="${value}"`;
    }
  }
  
  return `<permission ${permissionAttrs} />\n    <uses-permission android:name="${name}" />`;
}

/**
 * Build service XML element.
 */
function buildServiceXml(svc: AndroidService): string {
  const { name, ...attrs } = svc;
  
  let xml = '<service';
  xml += ` android:name="${name}"`;
  
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'boolean') {
      xml += ` android:${key}="${value}"`;
    } else if (typeof value === 'string') {
      xml += ` android:${key}="${value}"`;
    }
  }
  
  xml += ' />';
  return xml;
}
