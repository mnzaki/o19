/**
 * Auto-generated Device Adaptor from IDeviceMgmt.aidl
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleDeviceAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Device, CreateDevice } from '@o19/foundframe-front/domain';
import type { StreamEntryResult } from '../index.js';

export class TauriDeviceAdaptor extends DrizzleDeviceAdaptor {
  constructor(db: BaseSQLiteDatabase<any, any>) {
    super(db);
  }

  async create(data: CreateDevice): Promise<Device> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|generate_pairing_code', {
      
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Device;
  }

    async generatePairingCode(): Promise<string> {
    const result = await invoke<string>('plugin:o19-foundframe-tauri|generate_pairing_code', {  });
    return result;
  }
  async create(data: CreateDevice): Promise<Device> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|confirm_pairing', {
      deviceId: data.deviceId,
      code: data.code
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Device;
  }

    async confirmPairing(deviceId?: string, code?: string): Promise<boolean> {
    const result = await invoke<boolean>('plugin:o19-foundframe-tauri|confirm_pairing', { deviceId, code });
    return result;
  }
  async create(data: CreateDevice): Promise<Device> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|unpair_device', {
      deviceId: data.deviceId
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Device;
  }

    async unpairDevice(deviceId?: string): Promise<void> {
    await invoke<void>('plugin:o19-foundframe-tauri|unpair_device', { deviceId });;
  }
  async create(data: CreateDevice): Promise<Device> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|follow_device', {
      deviceId: data.deviceId
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Device;
  }

    async followDevice(deviceId?: string): Promise<boolean> {
    const result = await invoke<boolean>('plugin:o19-foundframe-tauri|follow_device', { deviceId });
    return result;
  }
  async create(data: CreateDevice): Promise<Device> {
    const result = await invoke<StreamEntryResult>('plugin:o19-foundframe-tauri|list_followers', {
      
    });
    return {
      id: result.id ?? 0,
      // TODO: Map other fields from data
      createdAt: new Date(result.seenAt)
    } as Device;
  }

    async listFollowers(): Promise<string[]> {
    const result = await invoke<string[]>('plugin:o19-foundframe-tauri|list_followers', {  });
    return result;
  }
}
