/**
 * Tauri Device Adaptor
 *
 * Implements DevicePort by invoking Tauri commands.
 * Delegates to the Platform implementation (local on desktop, service on Android).
 */
import { DeviceAdaptor, type DevicePort, type PairedDevice, type PairingQrData, type ScannedPairingData } from '@o19/foundframe-front/ports';
export declare class TauriDeviceAdaptor extends DeviceAdaptor implements DevicePort {
    generatePairingQr(deviceName: string): Promise<PairingQrData>;
    parsePairingUrl(url: string): Promise<ScannedPairingData>;
    confirmPairing(nodeIdHex: string, alias: string): Promise<PairedDevice>;
    listPairedDevices(): Promise<PairedDevice[]>;
    checkFollowersAndPair(): Promise<PairedDevice[]>;
    unpairDevice(nodeIdHex: string): Promise<void>;
}
//# sourceMappingURL=device.adaptor.d.ts.map