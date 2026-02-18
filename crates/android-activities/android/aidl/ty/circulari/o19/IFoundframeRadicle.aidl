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
    
    // Write operations - Content creation
    // All return the PKB URL reference to the created content
    
    // Add a post to the stream
    String addPost(String content, String title);
    
    // Add a bookmark to the stream
    String addBookmark(String url, String title, String notes);
    
    // Add a media link to the stream
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath);
    
    // Add a person to the stream
    String addPerson(String displayName, String handle);
    
    // Add a conversation to the stream
    String addConversation(String conversationId, String title);
    
    // Add a text note to a specific directory
    String addTextNote(String directory, String content, String title, String subpath);
    
    // Event subscription (serialized callbacks for simplicity)
    oneway void subscribeEvents(IEventCallback callback);
    oneway void unsubscribeEvents(IEventCallback callback);
}
