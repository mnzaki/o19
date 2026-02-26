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
 *
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 */

import loom from '@o19/spire-loom';
import { foundframe } from './core.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Media source capabilities
 */
type MediaSourceCapability = 'Pull' | 'Push' | 'Webhook' | 'Stream';

/**
 * Adapter types for different source kinds
 */
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

/**
 * MediaSource entity - External media connections
 */
@MediaSourceMgmt.Entity()
export class MediaSource {
  /** Primary key */
  id!: number;

  /** Source URL or identifier */
  url!: string;

  /** Adapter type for this source */
  adapterType!: MediaAdapterType;

  /** Opaque cursor for resuming polling (JSON) */
  cursorState?: Record<string, unknown>;

  /** Capabilities this source supports (JSON) */
  capabilities!: MediaSourceCapability[];

  /** Adapter-specific configuration (JSON) */
  config?: Record<string, unknown>;

  /** When this source was last polled */
  lastPolledAt?: number;

  /** Last error message (if any) */
  lastError?: string;

  /** Whether this source is currently active */
  isActive!: boolean;

  /** When this source was created */
  createdAt!: number;

  /** When this source was last updated */
  updatedAt!: number;
}
