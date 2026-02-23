// IEventCallback.aidl
// Callback interface for foundframe events

package ty.circulari.o19;

interface IEventCallback {
    // Event is a JSON string representing FoundframeRadicleEvent
    oneway void onEvent(String eventJson);
}