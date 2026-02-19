// IEventMgmt.aidl
// Management: Event Subscription
//
// Real-time event streaming from the service to clients.

package ty.circulari.o19;

import ty.circulari.o19.IEventCallback;

/**
 * Management: EventMgmt
 * 
 * Provides real-time notifications for PKB events, sync status,
 * and content updates through a callback interface.
 */
interface IEventMgmt {
    
    /** Subscribe to events from the service */
    oneway void subscribeEvents(IEventCallback callback);
    
    /** Unsubscribe from events */
    oneway void unsubscribeEvents(IEventCallback callback);
    
    /** Check if events are supported */
    boolean supportsEvents();
}
