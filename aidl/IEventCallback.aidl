// IEventCallback.aidl
// Callback interface for events
//
// Passed to IEventMgmt.subscribeEvents() to receive notifications.

package ty.circulari.o19;

/**
 * Callback for PKB events.
 * 
 * Implement this interface to receive real-time notifications
 * about content changes, sync status, and other events.
 */
interface IEventCallback {
    
    /** Called when an event occurs */
    oneway void onEvent(String eventType, String eventData);
    
    /** Called when the service status changes */
    oneway void onStatusChange(String status, String details);
    
    /** Called when sync completes for a repository */
    oneway void onSyncComplete(String repositoryId, boolean success);
}
