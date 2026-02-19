package ty.circulari.o19.service;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import ty.circulari.o19.IFoundframeRadicle;
import ty.circulari.o19.IEventCallback;

/**
 * Client helper for connecting to FoundframeRadicleService
 * 
 * Usage:
 * <pre>
 * FoundframeRadicleClient client = new FoundframeRadicleClient(context);
 * client.connect(new FoundframeRadicleClient.ConnectionCallback() {
 *     @Override
 *     public void onConnected(IFoundframeRadicle service) {
 *         // Use the service
 *         String nodeId = service.getNodeId();
 *     }
 *     
 *     @Override
 *     public void onDisconnected() {
 *         // Handle disconnect
 *     }
 *     
 *     @Override
 *     public void onError(String error) {
 *         // Handle error
 *     }
 * });
 * </pre>
 */
public class FoundframeRadicleClient {
    private static final String TAG = "FoundframeClient";
    
    private final Context context;
    private IFoundframeRadicle service;
    private ConnectionCallback callback;
    private boolean bound = false;
    
    public interface ConnectionCallback {
        void onConnected(IFoundframeRadicle service);
        void onDisconnected();
        void onError(String error);
    }
    
    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            Log.i(TAG, "Service connected");
            service = IFoundframeRadicle.Stub.asInterface(binder);
            bound = true;
            if (callback != null) {
                callback.onConnected(service);
            }
        }
        
        @Override
        public void onServiceDisconnected(ComponentName name) {
            Log.i(TAG, "Service disconnected");
            service = null;
            bound = false;
            if (callback != null) {
                callback.onDisconnected();
            }
        }
    };
    
    public FoundframeRadicleClient(Context context) {
        this.context = context.getApplicationContext();
    }
    
    /**
     * Connect to the FoundframeRadicleService
     * 
     * @param callback Callback for connection events
     * @return true if bind request was sent successfully
     */
    public boolean connect(ConnectionCallback callback) {
        this.callback = callback;
        
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            "ty.circulari.DearDiary",
            "ty.circulari.o19.service.FoundframeRadicleService"
        ));
        
        try {
            bound = context.bindService(intent, connection, Context.BIND_AUTO_CREATE);
            if (!bound) {
                callback.onError("Failed to bind to service");
            }
            return bound;
        } catch (SecurityException e) {
            callback.onError("Security exception: " + e.getMessage());
            return false;
        }
    }
    
    /**
     * Disconnect from the service
     */
    public void disconnect() {
        if (bound) {
            context.unbindService(connection);
            bound = false;
            service = null;
        }
    }
    
    /**
     * Check if currently connected to the service
     */
    public boolean isConnected() {
        return bound && service != null;
    }
    
    /**
     * Get the service interface (null if not connected)
     */
    public IFoundframeRadicle getService() {
        return service;
    }
    
    /**
     * Convenience method to check if native library is loaded
     */
    public static boolean isNativeLibraryLoaded() {
        try {
            System.loadLibrary("foundframe");
            return isServiceRunning();
        } catch (UnsatisfiedLinkError e) {
            return false;
        }
    }
    
    /**
     * Check if the FoundframeRadicle service is running
     */
    private static native boolean isServiceRunning();
}
