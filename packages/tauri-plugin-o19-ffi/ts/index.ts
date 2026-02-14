import { invoke } from '@tauri-apps/api/core';
import { createDrizzleAdaptors, createServices as createDomainServices } from '@o19/foundframe-drizzle';
import { createDrizzleProxy } from './drizzleProxy.js';
import { TauriPreviewAdaptor } from './adaptors/preview.adaptor.js';

export function createServices(dbName = "database.db") {
  const db = createDrizzleProxy(dbName);
  const adaptors = createDrizzleAdaptors(db);
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
  const bytes = await invoke<number[]>('plugin:o19-ffi|convert_jpeg_to_webp', {
    payload: { jpeg }
  });

  return Uint8Array.from(bytes);
}

export async function compressWebpToSize(webp: Uint8Array, maxSize: number): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('plugin:o19-ffi|compress_webp_to_size', {
    payload: { webp, maxSize }
  });

  return Uint8Array.from(bytes);
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return await invoke('plugin:o19-ffi|request_permissions')
}
