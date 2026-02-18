import { invoke } from '@tauri-apps/api/core';
import { createServices as createDomainServices } from '@o19/foundframe-front';
import { createDrizzleProxy } from './drizzleProxy.js';
import { createTauriAdaptors } from './adaptors/index.js';
import { TauriPreviewAdaptor } from './adaptors/preview.adaptor.js';

export { createTauriAdaptors, type StreamEntryResult, type AddMediaLinkParams, type AddTextNoteParams } from './adaptors/index.js';
export { TauriBookmarkAdaptor, TauriPostAdaptor, TauriMediaAdaptor, TauriPersonAdaptor, TauriConversationAdaptor, TauriStreamAdaptor, TauriDeviceAdaptor } from './adaptors/index.js';

// Re-export device types from foundframe-front for convenience
export type { 
  PairedDevice, 
  PairingQrData, 
  ScannedPairingData,
  DevicePort
} from '@o19/foundframe-front/ports';

export function createServices(dbName = "database.db") {
  const db = createDrizzleProxy(dbName);
  const adaptors = createTauriAdaptors(db);
  return createDomainServices({
    ...adaptors,
    preview: new TauriPreviewAdaptor(),
  });
}

export type IPersistenceServices = ReturnType<typeof createServices>;

export type NotificationPermissionStatus = {
  status: 'prompt' | 'denied' | 'granted'
}

export async function convertJpegToWebp(jpeg: Uint8Array): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('plugin:o19-foundframe-tauri|convert_jpeg_to_webp', {
    payload: { jpeg }
  });

  return Uint8Array.from(bytes);
}

export async function compressWebpToSize(webp: Uint8Array, maxSize: number): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('plugin:o19-foundframe-tauri|compress_webp_to_size', {
    payload: { webp, maxSize }
  });

  return Uint8Array.from(bytes);
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return await invoke('plugin:o19-foundframe-tauri|request_permissions')
}

// ============================================================================
// Device Pairing Commands
// ============================================================================

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

export async function generatePairingQr(deviceName: string): Promise<PairingQrResponse> {
  return await invoke('plugin:o19-foundframe-tauri|generate_pairing_qr', { deviceName });
}

export async function parsePairingUrl(url: string): Promise<ScannedPairingData> {
  return await invoke('plugin:o19-foundframe-tauri|parse_pairing_url', { url });
}

export async function confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDeviceInfo> {
  return await invoke('plugin:o19-foundframe-tauri|confirm_pairing', { nodeIdHex, alias });
}

export async function listPairedDevices(): Promise<PairedDeviceInfo[]> {
  return await invoke('plugin:o19-foundframe-tauri|list_paired_devices');
}

export async function checkFollowersAndPair(): Promise<PairedDeviceInfo[]> {
  return await invoke('plugin:o19-foundframe-tauri|check_followers_and_pair');
}

export async function unpairDevice(nodeIdHex: string): Promise<void> {
  return await invoke('plugin:o19-foundframe-tauri|unpair_device', { nodeIdHex });
}

// ============================================================================
// Camera API
// ============================================================================

// Note: Camera commands go through the o19-foundframe-tauri plugin, which delegates to 
// the native CameraPlugin on Android. This ensures proper permission handling.

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
export async function startCamera(options: CameraOptions = {}): Promise<CameraResult> {
  return await invoke('plugin:o19-foundframe-tauri|start_camera', {
    options: {
      mode: options.mode || 'preview',
      cameraDirection: options.cameraDirection || 'back'
    }
  });
}

/**
 * Stop the camera and release resources.
 */
export async function stopCamera(): Promise<CameraResult> {
  return await invoke('plugin:o19-foundframe-tauri|stop_camera');
}

/**
 * Capture a photo (only works when mode is 'photo').
 * Photo is saved to device gallery natively without passing through JS.
 */
export async function capturePhoto(): Promise<CameraResult> {
  return await invoke('plugin:o19-foundframe-tauri|capture_photo');
}

/**
 * Change camera mode without stopping/starting.
 */
export async function setCameraMode(options: CameraOptions): Promise<CameraResult> {
  return await invoke('plugin:o19-foundframe-tauri|set_camera_mode', {
    options: {
      mode: options.mode || 'preview',
      cameraDirection: options.cameraDirection || 'back'
    }
  });
}

/**
 * Check if camera is currently active.
 */
export async function isCameraActive(): Promise<CameraResult> {
  return await invoke('plugin:o19-foundframe-tauri|is_camera_active');
}

/**
 * Request camera permissions.
 */
export async function requestCameraPermissions(): Promise<CameraPermissionResult> {
  return await invoke('plugin:o19-foundframe-tauri|request_camera_permissions');
}

/**
 * Check camera permission status.
 */
export async function checkCameraPermissions(): Promise<Pick<CameraPermissionResult, 'camera'>> {
  return await invoke('plugin:o19-foundframe-tauri|check_camera_permissions');
}

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
export const QR_SCANNED_EVENT = 'qr-scanned';

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
export const PHOTO_CAPTURED_EVENT = 'photo-captured';
