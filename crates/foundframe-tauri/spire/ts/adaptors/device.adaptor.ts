/**
 * Tauri Device Adaptor
 *
 * Generated adaptor that invokes Tauri commands for Device operations.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */

import { invoke } from '@tauri-apps/api/core';
import { DrizzleDeviceAdaptor } from '@o19/foundframe-drizzle/adaptors';
import type { DevicePort } from '@o19/foundframe-front/ports';
import type { Device } from '@o19/foundframe-front/domain';

export class TauriDeviceAdaptor extends DrizzleDeviceAdaptor implements DevicePort {
  /**
   * DeviceMgmt.device_generatePairingCode
   */
  async generatePairingCode(): Promise<string> {
    return invoke<string>('device_generatePairingCode', {
    });
  }

  /**
   * DeviceMgmt.device_confirmPairing
   */
  async confirmPairing(deviceId: , code: ): Promise<boolean> {
    return invoke<boolean>('device_confirmPairing', {
      deviceId,
      code,
    });
  }

  /**
   * DeviceMgmt.device_unpairDevice
   */
  async unpairDevice(deviceId: ): Promise<void> {
    await invoke<void>('device_unpairDevice', {
      deviceId,
    });
  }

  /**
   * DeviceMgmt.device_listPairedDevices
   */
  async listPairedDevices(): Promise<string[]> {
    return invoke<string[]>('device_listPairedDevices', {
    });
  }

  /**
   * DeviceMgmt.device_followDevice
   */
  async followDevice(deviceId: ): Promise<boolean> {
    return invoke<boolean>('device_followDevice', {
      deviceId,
    });
  }

  /**
   * DeviceMgmt.device_unfollowDevice
   */
  async unfollowDevice(deviceId: ): Promise<void> {
    await invoke<void>('device_unfollowDevice', {
      deviceId,
    });
  }

  /**
   * DeviceMgmt.device_listFollowers
   */
  async listFollowers(): Promise<string[]> {
    return invoke<string[]>('device_listFollowers', {
    });
  }

  /**
   * DeviceMgmt.device_isFollowing
   */
  async isFollowing(deviceId: ): Promise<boolean> {
    return invoke<boolean>('device_isFollowing', {
      deviceId,
    });
  }

}
