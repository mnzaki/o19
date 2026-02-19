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
    String addPost(String content, String title);
    String addBookmark(String url, String title, String notes);
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath);
    String addPerson(String displayName, String handle);
    String addConversation(String conversationId, String title);
    String addTextNote(String directory, String content, String title, String subpath);
    
    // Event subscription
    void subscribeEvents(IEventCallback callback);
    void unsubscribeEvents(IEventCallback callback);
}
