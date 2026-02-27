/**
 * Media Source Management - Surface Imprint
 *
 * External media sources that can be polled or push to TheStream™.
 * Represents "persistent connections" to external media systems.
 *
 * Database Schema (prisma):
 *   MediaSource {
 *     id            Int     @id @default(autoincrement())
 *     url           String  // Source URL/identifier
 *     adapterType   String  // "file", "http", "rss", etc.
 *     cursorState   String? // JSON: opaque cursor for resuming polling
 *     capabilities  String  // JSON: ["Pull", "Push"] etc.
 *     config        String? // JSON: adapter-specific configuration
 *     // Health tracking
 *     lastPolledAt  Int?    // timestamp_ms
 *     lastError     String?
 *     isActive      Boolean @default(false)
 *     createdAt     Int     // timestamp_ms
 *     updatedAt     Int     // timestamp_ms
 *   }
 *
 * Reach: Global (extends from Core to Front)
 */

import loom, { crud } from '@o19/spire-loom';
import { foundframe } from './WARP.js';

// ============================================================================
// TYPES
// ============================================================================

type MediaSourceCapability = 'Pull' | 'Push' | 'Webhook' | 'Stream';
type MediaAdapterType = 'file' | 'http' | 'rss' | 'atom' | 'activitypub' | 'webhook';

/**
 * Health status of a media source
 */
interface MediaSourceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastPoll: number | null;
  lastError: string | null;
  consecutiveErrors: number;
}

/**
 * Result of a poll operation
 */
interface PollResult {
  itemsNew: number;
  itemsUpdated: number;
  cursor: string | null;
}

// ============================================================================
// MANAGEMENT
// ============================================================================

@loom.reach('Global')
@loom.link(foundframe.inner.core.thestream)
export class MediaSourceMgmt extends loom.Management {
  // ========================================================================
  // CONSTANTS (available in all rings)
  // ========================================================================

  DEFAULT_POLL_INTERVAL_MS = 300000;
  MAX_CONSECUTIVE_ERRORS = 5;

  // ========================================================================
  // CRUD METHODS
  // ========================================================================

  /**
   * Register a new media source
   */
  @loom.crud.create
  registerSource(
    url: string,
    adapterType: MediaAdapterType,
    capabilities: MediaSourceCapability[],
    config?: Record<string, unknown>
  ): void {
    throw new Error('Imprint only');
  }

  /**
   * Get a source by ID
   */
  @loom.crud.read
  getSource(id: number): MediaSource {
    throw new Error('Imprint only');
  }

  /**
   * List all media sources
   */
  @loom.crud.list({ collection: true })
  listSources(activeOnly?: boolean, adapterType?: MediaAdapterType): MediaSource[] {
    throw new Error('Imprint only');
  }

  /**
   * Update a source's configuration
   */
  @loom.crud.update
  updateSource(id: number, config?: Record<string, unknown>, isActive?: boolean): boolean {
    throw new Error('Imprint only');
  }

  /**
   * Unregister a media source
   */
  @loom.crud.delete_
  unregisterSource(id: number): boolean {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // POLLING OPERATIONS
  // ========================================================================

  /**
   * Poll a source for new items
   */
  pollSource(id: number): PollResult {
    throw new Error('Imprint only');
  }

  /**
   * Poll all active sources
   */
  pollAllSources(): Map<number, PollResult> {
    throw new Error('Imprint only');
  }

  // ========================================================================
  // HEALTH & MONITORING
  // ========================================================================

  /**
   * Get health status for a source
   */
  getHealth(id: number): MediaSourceHealth {
    throw new Error('Imprint only');
  }

  /**
   * Reset error count for a source (after fixing issues)
   */
  resetErrors(id: number): boolean {
    throw new Error('Imprint only');
  }
}

// ============================================================================
// ENTITY
// ============================================================================

@MediaSourceMgmt.Entity()
export class MediaSource {
  id = crud.field.id();

  url = crud.field.string();

  adapterType = crud.field.string();

  cursorState = crud.field.json<Record<string, unknown>>({ nullable: true });

  capabilities = crud.field.json<MediaSourceCapability[]>();

  config = crud.field.json<Record<string, unknown>>({ nullable: true });

  lastPolledAt = crud.field.int({ nullable: true });

  lastError = crud.field.string({ nullable: true });

  isActive = crud.field.bool({ default: false });

  createdAt = crud.field.createdAt();

  updatedAt = crud.field.updatedAt();
}
