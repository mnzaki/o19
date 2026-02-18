import { invoke } from '@tauri-apps/api/core';
import { createServices as createDomainServices } from '@o19/foundframe-front';
import { createDrizzleProxy } from './drizzleProxy.js';
import { createTauriAdaptors } from './adaptors/index.js';
import { TauriPreviewAdaptor } from './adaptors/preview.adaptor.js';

export { createTauriAdaptors, type StreamEntryResult, type AddMediaLinkParams, type AddTextNoteParams } from './adaptors/index.js';
export { TauriBookmarkAdaptor, TauriPostAdaptor, TauriMediaAdaptor, TauriPersonAdaptor, TauriConversationAdaptor, TauriStreamAdaptor } from './adaptors/index.js';

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
  const bytes = await invoke<number[]>('plugin:o19-ff|convert_jpeg_to_webp', {
    payload: { jpeg }
  });

  return Uint8Array.from(bytes);
}

export async function compressWebpToSize(webp: Uint8Array, maxSize: number): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('plugin:o19-ff|compress_webp_to_size', {
    payload: { webp, maxSize }
  });

  return Uint8Array.from(bytes);
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return await invoke('plugin:o19-ff|request_permissions')
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
  return await invoke('plugin:o19-ff|generate_pairing_qr', { deviceName });
}

export async function parsePairingUrl(url: string): Promise<ScannedPairingData> {
  return await invoke('plugin:o19-ff|parse_pairing_url', { url });
}

export async function confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDeviceInfo> {
  return await invoke('plugin:o19-ff|confirm_pairing', { nodeIdHex, alias });
}

export async function listPairedDevices(): Promise<PairedDeviceInfo[]> {
  return await invoke('plugin:o19-ff|list_paired_devices');
}

export async function checkFollowersAndPair(): Promise<PairedDeviceInfo[]> {
  return await invoke('plugin:o19-ff|check_followers_and_pair');
}

export async function unpairDevice(nodeIdHex: string): Promise<void> {
  return await invoke('plugin:o19-ff|unpair_device', { nodeIdHex });
}
