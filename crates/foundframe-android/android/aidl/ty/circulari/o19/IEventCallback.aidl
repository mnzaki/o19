// IEventCallback.aidl
// Callback interface for FoundframeRadicle events
// Events are serialized as JSON strings for simplicity

package ty.circulari.o19;

interface IEventCallback {
    // Event is a JSON string representing FoundframeEvent
    // Types: NodeStarted, NodeStopped, PeerConnected, PeerDisconnected,
    //        RepositorySynced, EntryPulled, etc.
    oneway void onEvent(String eventJson);
}
