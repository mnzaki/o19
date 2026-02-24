/**
 * Virtual Filesystem Mock
 *
 * In-memory filesystem for testing file operations.
 */

export interface MockVirtualFs {
  /** Read file content */
  readFile(path: string): string | null;
  /** Write file content */
  writeFile(path: string, content: string): Promise<void>;
  /** Check if file exists */
  fileExists(path: string): boolean;
  /** List all files */
  listFiles(): string[];
  /** Create directory */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** Get directory contents */
  readdir(path: string): string[];
}

export interface VirtualFsConfig {
  /** Initial file contents */
  initialFiles?: Record<string, string>;
  /** Allow writes outside initial structure */
  allowAnyPath?: boolean;
}

/**
 * Create a mock virtual filesystem.
 */
export function createMockVirtualFs(config: VirtualFsConfig = {}): MockVirtualFs {
  const files = new Map<string, string>(Object.entries(config.initialFiles || {}));
  const dirs = new Set<string>(['/']);
  
  // Extract directories from initial files
  for (const path of files.keys()) {
    const parts = path.split('/');
    let current = '';
    for (let i = 0; i < parts.length - 1; i++) {
      current += (current ? '/' : '') + parts[i];
      dirs.add(current);
    }
  }

  return {
    readFile(path: string): string | null {
      return files.get(path) || null;
    },

    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
      
      // Ensure parent directories exist
      const parts = path.split('/');
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current += (current ? '/' : '') + parts[i];
        dirs.add(current);
      }
    },

    fileExists(path: string): boolean {
      return files.has(path);
    },

    listFiles(): string[] {
      return Array.from(files.keys());
    },

    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      if (options?.recursive) {
        const parts = path.split('/');
        let current = '';
        for (const part of parts) {
          if (!part) continue;
          current += (current ? '/' : '') + part;
          dirs.add(current);
        }
      } else {
        dirs.add(path);
      }
    },

    readdir(path: string): string[] {
      const prefix = path.endsWith('/') ? path : path + '/';
      const result: string[] = [];
      
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          const relative = filePath.slice(prefix.length);
          const firstPart = relative.split('/')[0];
          if (firstPart && !result.includes(firstPart)) {
            result.push(firstPart);
          }
        }
      }
      
      return result;
    }
  };
}

/**
 * Create TreadleUtils from virtual filesystem.
 */
export function createMockTreadleUtils(
  vfs: MockVirtualFs,
  basePath: string = ''
): any {
  return {
    async writeFile(relativePath: string, content: string): Promise<void> {
      const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
      await vfs.writeFile(fullPath, content);
    },

    async readFile(relativePath: string): Promise<string | null> {
      const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
      return vfs.readFile(fullPath);
    },

    async updateFile(
      relativePath: string,
      updater: (content: string) => string
    ): Promise<void> {
      const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
      const content = vfs.readFile(fullPath);
      if (content !== null) {
        await vfs.writeFile(fullPath, updater(content));
      }
    },

    async fileExists(relativePath: string): Promise<boolean> {
      const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
      return vfs.fileExists(fullPath);
    }
  };
}
