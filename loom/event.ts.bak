/**
 * Event Management - Surface Imprint
 * 
 * Real-time event streaming from the service to clients.
 * Provides notifications for PKB events, sync status, and content updates
 * through a callback interface.
 * 
 * Reach: Local (extends to Platform rings)
 * 
 * NOTE: This is a METADATA IMPRINT for code generation. Not executable TypeScript.
 * 
 * The pattern: Outer rings subscribe via EventMgmt.subscribeEvents(callback),
 * then receive events through the EventCallback interface methods.
 */

import { reach, Management, crud } from '@o19/spire-loom';

@reach('Local')
class EventMgmt extends Management {
  // ========================================================================
  // CONSTANTS
  // ========================================================================
  
  MAX_CALLBACKS_PER_CLIENT = 5
  EVENT_QUEUE_SIZE = 100
  
  // ========================================================================
  // EVENT SUBSCRIPTION
  // ========================================================================
  
  /**
   * Subscribe to events from the service.
   * The provided callback will be invoked when events occur.
   */
  @crud('create')
  subscribeEvents(callback: EventCallback): void {
    throw new Error('Imprint only');
  }
  
  /**
   * Unsubscribe from events.
   * Removes the previously registered callback.
   */
  @crud('delete')
  unsubscribeEvents(callback: EventCallback): void {
    throw new Error('Imprint only');
  }
  
  /**
   * Check if events are supported by this service.
   */
  @crud('read')
  supportsEvents(): boolean {
    throw new Error('Imprint only');
  }
}

/**
 * Event Callback Interface
 * 
 * Implemented by subscribers to receive real-time notifications.
 * This is NOT a Management - it's a callback interface that gets passed
 * to subscribeEvents() and invoked by the service when events occur.
 * 
 * Each ring that needs events implements this interface and registers
 * with the EventMgmt.subscribeEvents() method.
 */
interface EventCallback {
  /**
   * Called when an event occurs.
   * @param eventType - Type of event (see EventType constants)
   * @param eventData - Event payload as JSON string
   */
  onEvent(eventType: string, eventData: string): void;
  
  /**
   * Called when the service status changes.
   * @param status - New status (see ServiceStatus constants)
   * @param details - Additional details
   */
  onStatusChange(status: string, details: string): void;
  
  /**
   * Called when sync completes for a repository.
   * @param repositoryId - The repository that synced
   * @param success - Whether sync succeeded
   */
  onSyncComplete(repositoryId: string, success: boolean): void;
}

/**
 * Event types emitted by the service.
 * These are strings passed to onEvent() as eventType.
 */
const EventType = {
  CONTENT_CREATED: 'content:created',
  CONTENT_UPDATED: 'content:updated',
  CONTENT_DELETED: 'content:deleted',
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  PEER_CONNECTED: 'peer:connected',
  PEER_DISCONNECTED: 'peer:disconnected',
  NODE_STARTED: 'node:started',
  NODE_STOPPED: 'node:stopped',
} as const;

/**
 * Service status values passed to onStatusChange().
 */
const ServiceStatus = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  SYNCING: 'syncing',
  ERROR: 'error',
  SHUTTING_DOWN: 'shutting_down',
} as const;

export { EventMgmt, EventCallback, EventType, ServiceStatus };
