/**
 * Person Management - Surface Imprint
 *
 * People/contacts saved to TheStream™.
 * Represents the "encounter with the other"—capturing who we meet.
 *
 * Database Schema (prisma):
 *   Person {
 *     id            Int     @id @default(autoincrement())
 *     displayName   String
 *     handle        String?
 *     avatarMediaId Int?    // FK to Media
 *     metadata      String? // JSON: DID, KERI AID, etc
 *     createdAt     Int     // timestamp_ms
 *     updatedAt     Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// MANAGEMENT
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class PersonMgmt extends loom.Management {
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
  addPerson(displayName: string, handle?: string, metadata?: Record<string, unknown>): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a person by ID
   */
  @loom.crud.read
  getPerson(id: number): Person {
    throw new Error('Imprint only');
  }

  /**
   * Get a person by their handle
   */
  @loom.crud.read({ by: 'handle' })
  getPersonByHandle(handle: string): Person {
    throw new Error('Imprint only');
  }

  /**
   * List all people with pagination
   */
  @loom.crud.list({ collection: true })
  listPeople(limit?: number, offset?: number): Person[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a person's metadata
   */
  @loom.crud.update
  updatePerson(
    id: number,
    displayName?: string,
    handle?: string,
    metadata?: Record<string, unknown>
  ): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Delete a person (soft delete)
   */
  @loom.crud.delete_({ soft: true })
  deletePerson(id: number): boolean {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

/**
 * Person entity - People and contacts
 */
@PersonMgmt.Entity()
export class Person {
  /** Primary key */
  id!: number;

  /** Display name */
  displayName!: string;

  /** Unique handle (optional) */
  handle?: string;

  /** Avatar media reference */
  avatarMediaId?: number;

  /** Extended metadata (DID, KERI AID, etc) */
  metadata?: Record<string, unknown>;

  /** When this person was added */
  createdAt!: number;

  /** When this person was last updated */
  updatedAt!: number;
}
