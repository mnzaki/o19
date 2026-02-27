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
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

// ============================================================================
// FILTER TYPE
// ============================================================================

/**
 * Filter criteria for Person list queries.
 * All fields are optional - only specified filters are applied.
 */
export interface PersonFilter {
  /** Filter by display name (exact match) */
  displayName?: string;
  /** Filter by handle (exact match) */
  handle?: string;
  /** Filter by avatar media reference */
  avatarMediaId?: number;
  /** Only return entries with createdAt >= this timestamp (inclusive) */
  after?: number;
  /** Only return entries with createdAt <= this timestamp (inclusive) */
  before?: number;
}

// ============================================================================
// MANAGEMENT (defined first to avoid TDZ)
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class PersonMgmt extends loom.Management {
  MAX_NAME_LENGTH = 100;
  MAX_HANDLE_LENGTH = 50;
  DEFAULT_DIRECTORY = 'people';
  GIT_BRANCH = 'main';

  @loom.crud.create
  addPerson(displayName: string, handle?: string, metadata?: Record<string, unknown>): void {
    throw new Error('Imprint only');
  }

  @loom.crud.read
  getPerson(id: number): Person {
    throw new Error('Imprint only');
  }

  @loom.crud.read({ by: 'handle' })
  getPersonByHandle(handle: string): Person {
    throw new Error('Imprint only');
  }

  /**
   * List people with optional filtering.
   * 
   * @example
   * // Basic pagination
   * listPeople(50, 0)
   * 
   * // By handle
   * listPeople(50, 0, { handle: '@alice' })
   * 
   * // Recent people
   * listPeople(50, 0, { after: Date.now() - 86400000 })
   */
  @loom.crud.list({ collection: true })
  listPeople(
    limit?: number,
    offset?: number,
    filter?: PersonFilter
  ): Person[] {
    throw new Error('Imprint only');
  }

  @loom.crud.update
  updatePerson(
    id: number,
    displayName?: string,
    handle?: string,
    metadata?: Record<string, unknown>
  ): boolean {
    throw new Error('Imprint only');
  }

  @loom.crud.delete_({ soft: true })
  deletePerson(id: number): boolean {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

@PersonMgmt.Entity()
export class Person {
  id = crud.field.id();
  displayName = crud.field.string();
  handle = crud.field.string({ nullable: true });
  avatarMediaId = crud.field.int({ nullable: true });
  metadata = crud.field.json<Record<string, unknown>>({ nullable: true });
  createdAt = crud.field.createdAt();
  updatedAt = crud.field.updatedAt();
}
