/**
 * Tauri Preview adaptor
 * Uses existing url_preview_json command from Rust backend
 */
import { PreviewAdaptor } from '@o19/foundframe-front';
import type { PreviewPort, PreviewMetadata } from '@o19/foundframe-front';
export declare class TauriPreviewAdaptor extends PreviewAdaptor implements PreviewPort {
    getForURL(url: string): Promise<PreviewMetadata>;
    getCached(url: string): Promise<PreviewMetadata | null>;
    store(_preview: PreviewMetadata): Promise<void>;
    deleteOlderThan(_maxAgeMs: number): Promise<void>;
}
//# sourceMappingURL=preview.adaptor.d.ts.map