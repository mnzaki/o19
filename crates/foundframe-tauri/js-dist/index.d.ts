export { createTauriAdaptors, type StreamEntryResult, type AddMediaLinkParams, type AddTextNoteParams } from './adaptors/index.js';
export { TauriBookmarkAdaptor, TauriPostAdaptor, TauriMediaAdaptor, TauriPersonAdaptor, TauriConversationAdaptor, TauriStreamAdaptor } from './adaptors/index.js';
export declare function createServices(dbName?: string): import("@o19/foundframe-front").DomainServices;
export type IPersistenceServices = ReturnType<typeof createServices>;
export type NotificationPermissionStatus = {
    status: 'prompt' | 'denied' | 'granted';
};
export declare function convertJpegToWebp(jpeg: Uint8Array): Promise<Uint8Array>;
export declare function compressWebpToSize(webp: Uint8Array, maxSize: number): Promise<Uint8Array>;
export declare function requestPermissions(): Promise<NotificationPermissionStatus>;
export type PairingQrResponse = {
    url: string;
    emojiIdentity: string;
    nodeIdHex: string;
};
export type ScannedPairingData = {
    emojiIdentity: string;
    deviceName: string;
    nodeIdHex: string;
    nodeId: string;
};
export type PairedDeviceInfo = {
    nodeId: string;
    alias: string;
    paired: boolean;
};
export declare function generatePairingQr(deviceName: string): Promise<PairingQrResponse>;
export declare function parsePairingUrl(url: string): Promise<ScannedPairingData>;
export declare function confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDeviceInfo>;
export declare function listPairedDevices(): Promise<PairedDeviceInfo[]>;
export declare function checkFollowersAndPair(): Promise<PairedDeviceInfo[]>;
export declare function unpairDevice(nodeIdHex: string): Promise<void>;
export type CameraMode = 'preview' | 'qr' | 'photo';
export type CameraDirection = 'back' | 'front';
export interface CameraOptions {
    mode?: CameraMode;
    cameraDirection?: CameraDirection;
}
export interface CameraResult {
    started?: boolean;
    stopped?: boolean;
    mode?: string;
    active?: boolean;
    success?: boolean;
    uri?: string;
    timestamp?: number;
    message?: string;
}
export interface CameraPermissionResult {
    camera: string;
    granted?: boolean;
}
/**
 * Start the camera with specified mode.
 * - 'preview': Just show camera preview
 * - 'qr': Scan for QR codes (emits 'qr-scanned' event when found)
 * - 'photo': Enable photo capture mode
 */
export declare function startCamera(options?: CameraOptions): Promise<CameraResult>;
/**
 * Stop the camera and release resources.
 */
export declare function stopCamera(): Promise<CameraResult>;
/**
 * Capture a photo (only works when mode is 'photo').
 * Photo is saved to device gallery natively without passing through JS.
 */
export declare function capturePhoto(): Promise<CameraResult>;
/**
 * Change camera mode without stopping/starting.
 */
export declare function setCameraMode(options: CameraOptions): Promise<CameraResult>;
/**
 * Check if camera is currently active.
 */
export declare function isCameraActive(): Promise<CameraResult>;
/**
 * Request camera permissions.
 */
export declare function requestCameraPermissions(): Promise<CameraPermissionResult>;
/**
 * Check camera permission status.
 */
export declare function checkCameraPermissions(): Promise<Pick<CameraPermissionResult, 'camera'>>;
/**
 * Listen for QR code scan events.
 * Use with Tauri's `listen` function:
 *
 * ```typescript
 * import { listen } from '@tauri-apps/api/event';
 *
 * listen('qr-scanned', (event) => {
 *   console.log('QR Code:', event.payload.content);
 * });
 * ```
 */
export declare const QR_SCANNED_EVENT = "qr-scanned";
/**
 * Listen for photo capture events.
 *
 * ```typescript
 * import { listen } from '@tauri-apps/api/event';
 *
 * listen('photo-captured', (event) => {
 *   console.log('Photo saved:', event.payload.uri);
 * });
 * ```
 */
export declare const PHOTO_CAPTURED_EVENT = "photo-captured";
//# sourceMappingURL=index.d.ts.map