/**
 * Preview service
 * Domain service for managing URL preview caching
 */

import { PreviewAdaptor, type PreviewPort } from '../ports/preview.port.js';
import type { PreviewMetadata } from '../ports/preview.port.js';

export { PreviewAdaptor };
export type { PreviewPort, PreviewMetadata };

export class PreviewService extends PreviewAdaptor implements PreviewPort {
  constructor(private adaptor: PreviewPort) {
    super();
  }

  getForURL(url: string): Promise<PreviewMetadata> {
    return this.adaptor.getForURL(url);
  }

  getCached(url: string): Promise<PreviewMetadata | null> {
    return this.adaptor.getCached(url);
  }

  store(preview: PreviewMetadata): Promise<void> {
    return this.adaptor.store(preview);
  }

  deleteOlderThan(maxAgeMs: number): Promise<void> {
    return this.adaptor.deleteOlderThan(maxAgeMs);
  }
}
