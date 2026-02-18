/**
 * Tauri Device Adaptor
 * 
 * Implements DevicePort by invoking Tauri commands.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */

import { DeviceAdaptor, type DevicePort, type PairedDevice, type PairingQrData, type ScannedPairingData } from '@o19/foundframe-front/ports';
import { invoke } from '@tauri-apps/api/core';

// Response types from Tauri (snake_case from Rust)
interface GeneratePairingQrResponse {
  url: string;
  emoji_identity: string;
  node_id_hex: string;
}

interface ScannedPairingResponse {
  emojiIdentity: string;
  deviceName: string;
  nodeIdHex: string;
  nodeId: string;
}

interface PairedDeviceInfo {
  nodeId: string;
  alias: string;
  paired: boolean;
}

export class TauriDeviceAdaptor extends DeviceAdaptor implements DevicePort {
  async generatePairingQr(deviceName: string): Promise<PairingQrData> {
    const result = await invoke<GeneratePairingQrResponse>('plugin:o19-foundframe-tauri|generate_pairing_qr', { 
      deviceName 
    });
    
    // Convert snake_case to camelCase
    return {
      url: result.url,
      emojiIdentity: result.emoji_identity,
      nodeIdHex: result.node_id_hex
    };
  }

  async parsePairingUrl(url: string): Promise<ScannedPairingData> {
    const result = await invoke<ScannedPairingResponse>('plugin:o19-foundframe-tauri|parse_pairing_url', { 
      url 
    });
    
    return {
      emojiIdentity: result.emojiIdentity,
      deviceName: result.deviceName,
      nodeIdHex: result.nodeIdHex,
      nodeId: result.nodeId
    };
  }

  async confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDevice> {
    const result = await invoke<PairedDeviceInfo>('plugin:o19-foundframe-tauri|confirm_pairing', { 
      nodeIdHex, 
      alias 
    });
    
    return {
      nodeId: result.nodeId,
      alias: result.alias,
      paired: result.paired
    };
  }

  async listPairedDevices(): Promise<PairedDevice[]> {
    const results = await invoke<PairedDeviceInfo[]>('plugin:o19-foundframe-tauri|list_paired_devices');
    
    return results.map(r => ({
      nodeId: r.nodeId,
      alias: r.alias,
      paired: r.paired
    }));
  }

  async checkFollowersAndPair(): Promise<PairedDevice[]> {
    const results = await invoke<PairedDeviceInfo[]>('plugin:o19-foundframe-tauri|check_followers_and_pair');
    
    return results.map(r => ({
      nodeId: r.nodeId,
      alias: r.alias,
      paired: r.paired
    }));
  }

  async unpairDevice(nodeIdHex: string): Promise<void> {
    await invoke<void>('plugin:o19-foundframe-tauri|unpair_device', { 
      nodeIdHex 
    });
  }
}
