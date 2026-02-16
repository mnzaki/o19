// IFoundframeRadicle.aidl
// Pure Rust Binder IPC interface for the Foundframe Radicle singleton service

package ty.circulari.o19;

import ty.circulari.o19.IEventCallback;

interface IFoundframeRadicle {
    // Node lifecycle and info
    String getNodeId();
    boolean isNodeRunning();
    String getNodeAlias();
    
    // PKB operations (no DB - just git/Radicle operations)
    boolean createRepository(String name);
    String[] listRepositories();
    boolean followDevice(String deviceId);
    String[] listFollowers();
    
    // Device pairing
    String generatePairingCode();
    boolean confirmPairing(String deviceId, String code);
    void unpairDevice(String deviceId);
    
    // Event subscription (serialized callbacks for simplicity)
    oneway void subscribeEvents(IEventCallback callback);
    oneway void unsubscribeEvents(IEventCallback callback);
}
