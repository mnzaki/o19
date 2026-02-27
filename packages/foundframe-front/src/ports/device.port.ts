/**
 * Device port - repository interface for device pairing operations
 */

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
export interface DevicePort {
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
