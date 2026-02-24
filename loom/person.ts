/**
 * Person Management - Surface Imprint
 *
 * People/contacts saved to TheStream™.
 * Represents the "encounter with the other"—capturing who we meet.
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './WARP.js';

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
class PersonMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  MAX_NAME_LENGTH = 100;
  MAX_HANDLE_LENGTH = 50;
  DEFAULT_DIRECTORY = 'people';
  GIT_BRANCH = 'main';

  // ========================================================================
  // CRUD METHODS
  // ========================================================================

  /**
   * Add a person to the stream
   */
  @loom.crud.create
  addPerson(
    displayName: string,
    handle?: string,
    metadata?: Record<string, unknown>
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a person by their handle
   */
  @loom.crud.read
  getPersonByHandle(handle: string): Person {
    throw new Error('Imprint only');
  }

  /**
   * List all people
   */
  @loom.crud.list({ collection: true })
  listPeople(): string[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a person's metadata
   */
  @loom.crud.update
  updatePerson(
    handle: string,
    displayName?: string,
    metadata?: Record<string, unknown>
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a person (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deletePerson(handle: string): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Person data structure
 */
interface Person {
  displayName: string;
  handle?: string;
  metadata?: Record<string, unknown>;
  seenAt: number;
  updatedAt?: number;
  pkbUrl: string;
  commitHash: string;
}

/**
 * Export the Management class for collector
 */
export { PersonMgmt };
