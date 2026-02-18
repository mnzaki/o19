/**
 * Device port - repository interface for device pairing operations
 */

import { BasePort, type BasePort as BasePortType } from './base.port.js';

/** Device pairing information */
export interface PairedDevice {
  nodeId: string;
  alias: string;
  paired: boolean;
}

/** QR code data for pairing */
export interface PairingQrData {
  url: string;
  emojiIdentity: string;
  nodeIdHex: string;
}

/** Scanned pairing data from QR code */
export interface ScannedPairingData {
  emojiIdentity: string;
  deviceName: string;
  nodeIdHex: string;
  nodeId: string;
}

/** Device port interface - for pairing operations */
export interface DevicePort extends BasePortType {
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

export abstract class DeviceAdaptor extends BasePort implements DevicePort {
  generatePairingQr(_deviceName: string): Promise<PairingQrData> {
    this.throwNotImplemented('DeviceAdaptor.generatePairingQr');
  }
  
  parsePairingUrl(_url: string): Promise<ScannedPairingData> {
    this.throwNotImplemented('DeviceAdaptor.parsePairingUrl');
  }
  
  confirmPairing(_nodeIdHex: string, _alias: string): Promise<PairedDevice> {
    this.throwNotImplemented('DeviceAdaptor.confirmPairing');
  }
  
  listPairedDevices(): Promise<PairedDevice[]> {
    this.throwNotImplemented('DeviceAdaptor.listPairedDevices');
  }
  
  checkFollowersAndPair(): Promise<PairedDevice[]> {
    this.throwNotImplemented('DeviceAdaptor.checkFollowersAndPair');
  }
  
  unpairDevice(_nodeIdHex: string): Promise<void> {
    this.throwNotImplemented('DeviceAdaptor.unpairDevice');
  }
}
