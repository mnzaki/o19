/**
 * Tauri Preview adaptor
 * Uses existing url_preview_json command from Rust backend
 */

import { invoke } from '@tauri-apps/api/core';
import { PreviewAdaptor } from '@o19/foundframe-front';
import type { PreviewPort, PreviewMetadata } from '@o19/foundframe-front';

type HtmlPreviewJSON = {
  title?: string;
  description?: string;
  imageUrl?: string;
  images: string[];
  siteName?: string;
};

type MediaPreviewJSON = {
  url: string;
  mediaType: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  thumbnailPath?: string;
  metadata: {
    title?: string;
    description?: string;
  };
};

type PreviewType =
  | { type: 'html' } & HtmlPreviewJSON
  | { type: 'media' } & MediaPreviewJSON
  | { type: 'unknown' };

export class TauriPreviewAdaptor extends PreviewAdaptor implements PreviewPort {
  async getForURL(url: string): Promise<PreviewMetadata> {
    const result = await invoke<PreviewType>('plugin:o19-ff|url_preview_json', { url });

    // Convert PreviewType to PreviewMetadata
    if (result.type === 'html') {
      return {
        url,
        title: result.title,
        description: result.description,
        imagePath: result.imageUrl,
        siteName: result.siteName,
        fetchedAt: new Date(),
      };
    } else if (result.type === 'media') {
      return {
        url,
        title: result.metadata.title || result.url,
        description: result.metadata.description,
        imagePath: result.thumbnailPath,
        siteName: undefined,
        fetchedAt: new Date(),
      };
    } else {
      // Unknown type - return minimal metadata
      return {
        url,
        fetchedAt: new Date(),
      };
    }
  }

  async getCached(url: string): Promise<PreviewMetadata | null> {
    // The Rust backend doesn't have a separate cache check command,
    // so we just call getForURL which handles caching internally
    try {
      return await this.getForURL(url);
    } catch {
      return null;
    }
  }

  async store(_preview: PreviewMetadata): Promise<void> {
    // The Rust backend handles caching automatically in url_preview_json
    // No explicit store command needed
  }

  async deleteOlderThan(_maxAgeMs: number): Promise<void> {
    // The Rust backend handles cache expiration automatically
    // No explicit cleanup command needed
  }
}
