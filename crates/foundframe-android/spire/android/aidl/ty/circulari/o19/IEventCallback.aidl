// IEventCallback.aidl
// Callback interface for foundframe events

package ty.circulari.o19;

interface IEventCallback {
    // Event is a JSON string representing FoundframeEvent
    oneway void onEvent(String eventJson);
}