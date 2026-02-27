/**
 * Media Source entity
 * External media sources that can be polled or push to TheStream™
 */

export type MediaAdapterType = 'file' | 'http' | 'rss' | 'atom' | 'activitypub' | 'webhook';

export type MediaSourceCapability = 'Pull' | 'Push' | 'Webhook' | 'Stream';

export interface MediaSourceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastPoll: number | null;
  lastError: string | null;
  consecutiveErrors: number;
}

export interface PollResult {
  itemsNew: number;
  itemsUpdated: number;
  cursor: string | null;
}

export interface MediaSource {
  id: number;
  url: string;
  adapterType: MediaAdapterType;
  cursorState?: Record<string, unknown>;
  capabilities: MediaSourceCapability[];
  config?: Record<string, unknown>;
  lastPolledAt?: number;
  lastError?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export type CreateMediaSource = Omit<MediaSource, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateMediaSource = Partial<Omit<MediaSource, 'id' | 'createdAt'>>;
