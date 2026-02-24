/**
 * The Hybrid Dressing Service
 * 
 * "The loom reads itself, then writes with precision."
 * 
 * LOADING: Import WARP.ts as a module (like the weaver)
 *   - Get actual runtime metadata from spiral objects
 *   - Extract relationships, configurations, types
 * 
 * WRITING: Regex-based surgical replacement
 *   - Preserve whitespace, comments, formatting
 *   - Only replace what changed
 * 
 * DIFFING: Compare against original dressing
 *   - Show what changed before writing
 *   - Allow rollback
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// ============================================================================
// TYPES
// ============================================================================

export interface Dressing {
  /** The workspace root */
  workspaceRoot: string;
  
  /** The loom/ directory path */
  loomPath: string;
  
  /** Original source code by file path (for diffing and writing) */
  originalSources: Map<string, string>;
  
  /** The loaded WARP module (runtime objects) */
  warpModule: Record<string, any>;
  
  /** Extracted spiral metadata from runtime objects */
  spirals: RuntimeSpiral[];
  
  /** Extracted link metadata */
  links: RuntimeLink[];
  
  /** Extracted reach metadata */
  reaches: RuntimeReach[];
  
  /** Custom treadles */
  treadles: DiscoveredTreadle[];
  
  /** Custom bobbins */
  bobbins: Bobbin[];
  
  /** When the dressing was loaded */
  loadedAt: Date;
  
  /** Original state for diffing */
  original: {
    spirals: RuntimeSpiral[];
    links: RuntimeLink[];
    reaches: RuntimeReach[];
  };
}

export interface RuntimeSpiral {
  /** Export name in WARP.ts (e.g., 'foundframe', 'tauri') */
  exportName: string;
  
  /** The runtime spiral object */
  instance: any;
  
  /** The core struct class (if any) */
  coreStruct?: any;
  
  /** Platform integrations (tauri, android, etc.) */
  integrations: string[];
  
  /** Inner rings this spiral wraps (for multiplexed spirals) */
  innerRings?: string[];
  
  /** Metadata extracted from the spiral */
  metadata: {
    hasTauri?: boolean;
    hasAndroid?: boolean;
    hasDesktop?: boolean;
    hasIOS?: boolean;
  };
  
  /** Source location (approximate, from regex) */
  location: SourceLocation;
}

export interface RuntimeLink {
  /** From management */
  from: string;
  
  /** To struct/core */
  to: string;
  
  /** Relation path (e.g., 'thestream', 'device_manager') */
  relation: string;
  
  /** Source location */
  location: SourceLocation;
}

export interface RuntimeReach {
  /** Spiral export name */
  spiral: string;
  
  /** Integration target (tauri, android, etc.) */
  integration: string;
  
  /** Configuration object */
  config: Record<string, any>;
  
  /** Source location */
  location: SourceLocation;
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface DiscoveredTreadle {
  name: string;
  path: string;
  source: string;
  phase: 'analysis' | 'generation' | 'binding';
  exports: string[];
}

export interface Bobbin {
  name: string;
  path: string;
  content: string;
  type: 'ejs' | 'handlebars' | 'mustache' | 'raw';
}

// ============================================================================
// HYBRID DRESSING SERVICE
// ============================================================================

export interface DressingOptions {
  /** 
   * Load mode:
   * - 'strict': Fail if loom/ doesn't exist or WARP.ts is missing
   * - 'loose': Create defaults for missing parts
   * - 'minimal': Only load what exists, no defaults
   */
  mode?: 'strict' | 'loose' | 'minimal';
}

/**
 * The Hybrid Dressing Service.
 * 
 * "The loom reads itself to understand, writes carefully to preserve."
 */
export class DressingService {
  /**
   * Load the complete dressing by importing WARP.ts as a module.
   * 
   * This gives us the actual runtime metadata from the spiral objects,
   * while keeping original sources for surgical editing.
   */
  async load(
    workspaceRoot: string,
    options: DressingOptions = {}
  ): Promise<Dressing> {
    const { mode = 'loose' } = options;
    const loomPath = path.join(workspaceRoot, 'loom');
    const loadedAt = new Date();
    
    // Check if loom/ exists
    const loomExists = await this.pathExists(loomPath);
    if (!loomExists && mode === 'strict') {
      throw new Error(`loom/ directory not found at ${loomPath}`);
    }
    
    // Load original sources first (before any modifications)
    const originalSources = await this.loadOriginalSources(loomPath);
    
    // Import WARP.ts as a module (like the weaver does)
    const warpPath = path.join(loomPath, 'WARP.ts');
    const warpModule = await this.importWarp(warpPath);
    
    // Extract runtime metadata from the loaded module
    const spirals = this.extractRuntimeSpirals(warpModule, warpPath, originalSources);
    const links = this.extractRuntimeLinks(warpModule);
    const reaches = this.extractRuntimeReaches(warpModule);
    
    // Discover custom treadles and bobbins
    const [treadles, bobbins] = await Promise.all([
      this.discoverTreadles(loomPath, mode),
      this.loadBobbins(loomPath, mode)
    ]);
    
    const dressing: Dressing = {
      workspaceRoot,
      loomPath,
      originalSources,
      warpModule,
      spirals,
      links,
      reaches,
      treadles,
      bobbins,
      loadedAt,
      original: {
        spirals: JSON.parse(JSON.stringify(spirals)),
        links: JSON.parse(JSON.stringify(links)),
        reaches: JSON.parse(JSON.stringify(reaches))
      }
    };
    
    return dressing;
  }
  
  /**
   * Get changes between current and original dressing.
   */
  diff(dressing: Dressing): DressingChanges {
    const changes: DressingChanges = {
      spirals: {
        added: [],
        modified: [],
        removed: []
      },
      links: {
        added: [],
        modified: [],
        removed: []
      },
      reaches: {
        added: [],
        modified: [],
        removed: []
      }
    };
    
    // Compare spirals
    const originalSpiralNames = new Set(dressing.original.spirals.map(s => s.exportName));
    const currentSpiralNames = new Set(dressing.spirals.map(s => s.exportName));
    
    for (const spiral of dressing.spirals) {
      if (!originalSpiralNames.has(spiral.exportName)) {
        changes.spirals.added.push(spiral);
      } else {
        const original = dressing.original.spirals.find(s => s.exportName === spiral.exportName);
        if (JSON.stringify(original) !== JSON.stringify(spiral)) {
          changes.spirals.modified.push({ from: original!, to: spiral });
        }
      }
    }
    
    for (const spiral of dressing.original.spirals) {
      if (!currentSpiralNames.has(spiral.exportName)) {
        changes.spirals.removed.push(spiral);
      }
    }
    
    // Similar logic for links and reaches...
    
    return changes;
  }
  
  /**
   * Apply changes to original sources using surgical regex replacement.
   * 
   * This preserves:
   * - Whitespace and indentation
   * - Comments
   * - Formatting (as much as possible)
   */
  async applyChanges(
    dressing: Dressing,
    changes: Partial<Pick<Dressing, 'spirals' | 'links' | 'reaches'>>
  ): Promise<Map<string, string>> {
    const modifiedSources = new Map(dressing.originalSources);
    
    // Apply spiral changes
    if (changes.spirals) {
      for (const spiral of changes.spirals) {
        const warpSource = modifiedSources.get(path.join(dressing.loomPath, 'WARP.ts'));
        if (warpSource) {
          const newSource = this.replaceSpiral(warpSource, spiral);
          modifiedSources.set(path.join(dressing.loomPath, 'WARP.ts'), newSource);
        }
      }
    }
    
    // Apply link changes
    if (changes.links) {
      // Similar surgical replacement for links
    }
    
    // Apply reach changes
    if (changes.reaches) {
      // Similar surgical replacement for reaches
    }
    
    return modifiedSources;
  }
  
  /**
   * Write modified sources back to disk.
   */
  async write(dressing: Dressing, modifiedSources: Map<string, string>): Promise<void> {
    for (const [filePath, content] of modifiedSources) {
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }
  
  // ===== LOADING HELPERS =====
  
  private async loadOriginalSources(loomPath: string): Promise<Map<string, string>> {
    const sources = new Map<string, string>();
    
    // Load WARP.ts
    const warpPath = path.join(loomPath, 'WARP.ts');
    if (await this.pathExists(warpPath)) {
      sources.set(warpPath, await fs.readFile(warpPath, 'utf-8'));
    }
    
    // Load other loom files...
    // TODO: Load all .ts files in loom/
    
    return sources;
  }
  
  private async importWarp(warpPath: string): Promise<Record<string, any>> {
    try {
      const warpUrl = pathToFileURL(warpPath).href;
      return await import(warpUrl);
    } catch (error) {
      throw new Error(`Failed to import WARP.ts: ${(error as Error).message}`);
    }
  }
  
  private extractRuntimeSpirals(
    warpModule: Record<string, any>,
    filePath: string,
    sources: Map<string, string>
  ): RuntimeSpiral[] {
    const spirals: RuntimeSpiral[] = [];
    const warpSource = sources.get(filePath) || '';
    
    for (const [exportName, value] of Object.entries(warpModule)) {
      // Skip if not an object
      if (!value || typeof value !== 'object') continue;
      
      // Check if it looks like a spiral
      const isSpiral = this.isSpiralObject(value);
      if (!isSpiral) continue;
      
      // Extract metadata from the spiral object
      const integrations = this.extractIntegrations(value);
      const coreStruct = value.core?.constructor;
      
      // Find source location (approximate via regex)
      const location = this.findSpiralLocation(warpSource, exportName);
      
      spirals.push({
        exportName,
        instance: value,
        coreStruct,
        integrations,
        innerRings: value.innerRings?.map((r: any) => r.exportName || r.name),
        metadata: {
          hasTauri: integrations.includes('tauri'),
          hasAndroid: integrations.includes('android'),
          hasDesktop: integrations.includes('desktop'),
          hasIOS: integrations.includes('ios')
        },
        location
      });
    }
    
    return spirals;
  }
  
  private isSpiralObject(obj: any): boolean {
    // A spiral object (SpiralOut) has:
    // - 'inner' property containing RustCore
    // - Integration objects (android, desktop, tauri, ios)
    // - Or is a result of loom.spiral()
    
    if (obj === null || typeof obj !== 'object') return false;
    
    // Check for RustCore in inner
    if (obj.inner?.layer !== undefined) return true;
    if (obj.inner?.core !== undefined) return true;
    
    // Check for integration objects (AndroidSpiraler, DesktopSpiraler, etc.)
    if (obj.android?.innerRing !== undefined) return true;
    if (obj.desktop?.innerRing !== undefined) return true;
    if (obj.tauri?.innerRing !== undefined) return true;
    if (obj.ios?.innerRing !== undefined) return true;
    
    // Check constructor name
    const proto = Object.getPrototypeOf(obj);
    if (proto?.constructor?.name === 'SpiralOut') return true;
    
    return false;
  }
  
  private extractIntegrations(spiral: any): string[] {
    const integrations: string[] = [];
    
    // Integration objects have innerRing property
    if (spiral.tauri !== undefined) integrations.push('tauri');
    if (spiral.android !== undefined) integrations.push('android');
    if (spiral.desktop !== undefined) integrations.push('desktop');
    if (spiral.ios !== undefined) integrations.push('ios');
    
    return integrations;
  }
  
  private extractRuntimeLinks(warpModule: Record<string, any>): RuntimeLink[] {
    const links: RuntimeLink[] = [];
    
    // Links are typically defined via @loom.link decorator
    // We can extract them from the spiral objects' metadata
    
    for (const [exportName, value] of Object.entries(warpModule)) {
      if (!value || typeof value !== 'object') continue;
      
      // Look for link metadata
      const linkMeta = value._links || value.__links;
      if (linkMeta) {
        for (const link of linkMeta) {
          links.push({
            from: exportName,
            to: link.to,
            relation: link.relation,
            location: { file: 'WARP.ts', line: 0, column: 0 } // TODO
          });
        }
      }
    }
    
    return links;
  }
  
  private extractRuntimeReaches(warpModule: Record<string, any>): RuntimeReach[] {
    const reaches: RuntimeReach[] = [];
    
    // Reaches are the platform integrations
    // e.g., loom.spiral(foundframe).tauri.plugin()
    
    for (const [exportName, value] of Object.entries(warpModule)) {
      if (!value || typeof value !== 'object') continue;
      
      // Check for reach metadata
      const reachMeta = value._reaches || value.__reaches;
      if (reachMeta) {
        for (const reach of reachMeta) {
          reaches.push({
            spiral: exportName,
            integration: reach.integration,
            config: reach.config,
            location: { file: 'WARP.ts', line: 0, column: 0 } // TODO
          });
        }
      }
    }
    
    return reaches;
  }
  
  private findSpiralLocation(source: string, exportName: string): SourceLocation {
    // Find the line where this spiral is defined
    const regex = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*loom\\.spiral`);
    const match = regex.exec(source);
    
    if (match) {
      const pos = this.getPosition(source, match.index);
      return { file: 'WARP.ts', line: pos.line, column: pos.column };
    }
    
    return { file: 'WARP.ts', line: 0, column: 0 };
  }
  
  // ===== SURGICAL EDITING HELPERS =====
  
  private replaceSpiral(source: string, spiral: RuntimeSpiral): string {
    // Find the spiral definition and replace it surgically
    const regex = new RegExp(
      `(export\\s+const\\s+)${spiral.exportName}(\\s*=\\s*loom\\.spiral)\\s*\\([^)]*\\)`,
      'g'
    );
    
    // For now, just return the source unchanged
    // TODO: Implement actual replacement logic
    return source;
  }
  
  // ===== UTILITIES =====
  
  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
  
  private getPosition(source: string, index: number): { line: number; column: number } {
    const lines = source.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }
  
  private async discoverTreadles(loomPath: string, mode: string): Promise<DiscoveredTreadle[]> {
    const treadlesPath = path.join(loomPath, 'treadles');
    if (!(await this.pathExists(treadlesPath))) return [];
    
    const entries = await fs.readdir(treadlesPath, { withFileTypes: true });
    const treadles: DiscoveredTreadle[] = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        const filePath = path.join(treadlesPath, entry.name);
        const source = await fs.readFile(filePath, 'utf-8');
        
        treadles.push({
          name: entry.name.replace(/\.ts$/, ''),
          path: filePath,
          source,
          phase: this.detectTreadlePhase(source),
          exports: this.extractExports(source)
        });
      }
    }
    
    return treadles;
  }
  
  private async loadBobbins(loomPath: string, mode: string): Promise<Bobbin[]> {
    const bobbinPath = path.join(loomPath, 'bobbin');
    if (!(await this.pathExists(bobbinPath))) return [];
    
    const bobbins: Bobbin[] = [];
    await this.walkDir(bobbinPath, async (filePath) => {
      if (filePath.endsWith('.ejs') || filePath.endsWith('.hbs')) {
        const content = await fs.readFile(filePath, 'utf-8');
        const type = filePath.endsWith('.ejs') ? 'ejs' : 'handlebars';
        
        bobbins.push({
          name: path.relative(bobbinPath, filePath),
          path: filePath,
          content,
          type
        });
      }
    });
    
    return bobbins;
  }
  
  private async walkDir(dir: string, callback: (filePath: string) => Promise<void>): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walkDir(fullPath, callback);
      } else {
        await callback(fullPath);
      }
    }
  }
  
  private detectTreadlePhase(source: string): DiscoveredTreadle['phase'] {
    if (source.includes('phase:') || source.includes('phase =')) {
      if (source.includes('"analysis"') || source.includes("'analysis'")) return 'analysis';
      if (source.includes('"generation"') || source.includes("'generation'")) return 'generation';
      if (source.includes('"binding"') || source.includes("'binding'")) return 'binding';
    }
    return 'generation';
  }
  
  private extractExports(source: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(source)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }
}

// ============================================================================
// CHANGE TRACKING
// ============================================================================

export interface DressingChanges {
  spirals: {
    added: RuntimeSpiral[];
    modified: { from: RuntimeSpiral; to: RuntimeSpiral }[];
    removed: RuntimeSpiral[];
  };
  links: {
    added: RuntimeLink[];
    modified: { from: RuntimeLink; to: RuntimeLink }[];
    removed: RuntimeLink[];
  };
  reaches: {
    added: RuntimeReach[];
    modified: { from: RuntimeReach; to: RuntimeReach }[];
    removed: RuntimeReach[];
  };
}

// Singleton instance
export const dressingService = new DressingService();
