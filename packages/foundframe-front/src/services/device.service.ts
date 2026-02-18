/**
 * Device Service
 * 
 * Business logic for device pairing operations.
 * Delegates to DevicePort for actual operations.
 */

import type { DevicePort, PairedDevice, PairingQrData, ScannedPairingData } from '../ports/device.port.js';

export interface IDeviceService {
  /** Generate a pairing QR code for this device */
  generatePairingQr(deviceName: string): Promise<PairingQrData>;
  
  /** Parse a pairing URL scanned from another device */
  parsePairingUrl(url: string): Promise<ScannedPairingData>;
  
  /** Confirm pairing with a scanned device */
  confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDevice>;
  
  /** List all paired devices */
  listPairedDevices(): Promise<PairedDevice[]>;
  
  /** Check followers and auto-pair */
  checkFollowersAndPair(): Promise<PairedDevice[]>;
  
  /** Unpair a device */
  unpairDevice(nodeIdHex: string): Promise<void>;
}

export class DeviceService implements IDeviceService {
  constructor(private port: DevicePort) {}

  async generatePairingQr(deviceName: string): Promise<PairingQrData> {
    return this.port.generatePairingQr(deviceName);
  }

  async parsePairingUrl(url: string): Promise<ScannedPairingData> {
    return this.port.parsePairingUrl(url);
  }

  async confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDevice> {
    return this.port.confirmPairing(nodeIdHex, alias);
  }

  async listPairedDevices(): Promise<PairedDevice[]> {
    return this.port.listPairedDevices();
  }

  async checkFollowersAndPair(): Promise<PairedDevice[]> {
    return this.port.checkFollowersAndPair();
  }

  async unpairDevice(nodeIdHex: string): Promise<void> {
    return this.port.unpairDevice(nodeIdHex);
  }
}
