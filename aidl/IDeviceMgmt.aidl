// IDeviceMgmt.aidl
// Management: Device and Social Graph
//
// Handles device pairing, social following, and the trust graph.

package ty.circulari.o19;

/**
 * Management: DeviceMgmt
 * 
 * Manages the social aspect of the PKB—devices that are paired,
 * people that are followed, and the web of trust.
 */
interface IDeviceMgmt {
    
    // ==================== Device Pairing ====================
    
    /** Generate a pairing code for device discovery */
    String generatePairingCode();
    
    /** Confirm pairing with a device */
    boolean confirmPairing(String deviceId, String code);
    
    /** Remove a paired device */
    void unpairDevice(String deviceId);
    
    /** List all paired devices */
    String[] listPairedDevices();
    
    // ==================== Social Graph ====================
    
    /** Follow a device/person by their ID */
    boolean followDevice(String deviceId);
    
    /** Unfollow a device/person */
    void unfollowDevice(String deviceId);
    
    /** List all devices/people being followed */
    String[] listFollowers();
    
    /** Check if we're following a specific device */
    boolean isFollowing(String deviceId);
}
