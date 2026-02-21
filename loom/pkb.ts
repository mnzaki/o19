/**
 * PKB (Personal Knowledge Base) Management - Surface Imprint
 * 
 * Manages the git-based Personal Knowledge Base (PKB) repositories.
 * The PKB is a collection of Radicle repositories that constitute
 * the user's personal knowledge.
 * 
 * Reach: Private (Core only)
 * 
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach('Private')
class PkbMgmt extends Management {
  // ========================================================================
  // CONSTANTS
  // ========================================================================
  
  DEFAULT_REPOSITORY_NAME = 'stream'
  MAX_REPOSITORY_NAME_LENGTH = 64
  VALID_NAME_REGEX = /^[a-zA-Z0-9_-]+$/
  
  // ========================================================================
  // REPOSITORY LIFECYCLE
  // ========================================================================
  
  /**
   * Create a new repository with the given name
   */
  @crud('create')
  createRepository(name: string): boolean {
    throw new Error('Imprint only');
  }
  
  /**
   * List all repositories in the PKB
   */
  @crud('list', { collection: true })
  listRepositories(): string[] {
    throw new Error('Imprint only');
  }
  
  /**
   * Get the default repository for stream content
   */
  @crud('read')
  getDefaultRepository(): string {
    throw new Error('Imprint only');
  }
  
  /**
   * Set the default repository
   */
  @crud('update')
  setDefaultRepository(name: string): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Repository information
 */
interface Repository {
  name: string
  createdAt: number
  lastCommitAt?: number
  commitCount: number
  isDefault: boolean
  rid: string  // Radicle ID
}

export { PkbMgmt };
