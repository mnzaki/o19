package ty.circulari.o19.service;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.Process;
import android.util.Log;

import ty.circulari.o19.IPkbMgmt;

/**
 * Auto-generated client helper for IPkbMgmt.
 * DO NOT EDIT MANUALLY - Generated from AIDL
 */
public class PkbMgmtClient {
    private static final String TAG = "O19-ANDROID";
    
    static {
        System.loadLibrary("foundframe");
    }
    
    private final Context context;
    private IPkbMgmt service;
    private ConnectionCallback callback;
    private boolean bound = false;
    
    public interface ConnectionCallback {
        void onConnected(IPkbMgmt service);
        void onDisconnected();
        void onError(String error);
    }
    
    private final ServiceConnection connection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder binder) {
            Log.i(TAG, "[PkbMgmtClient] Service connected");
            service = IPkbMgmt.Stub.asInterface(binder);
            bound = true;
            if (callback != null) {
                callback.onConnected(service);
            }
        }
        
        @Override
        public void onServiceDisconnected(ComponentName name) {
            Log.i(TAG, "[PkbMgmtClient] Service disconnected");
            service = null;
            bound = false;
            if (callback != null) {
                callback.onDisconnected();
            }
        }
    };
    
    public PkbMgmtClient(Context context) {
        this.context = context.getApplicationContext();
    }
    
    /**
     * Connect to the service
     */
    public boolean connect(ConnectionCallback callback) {
        this.callback = callback;
        
        Intent intent = new Intent();
        intent.setComponent(new ComponentName(
            context.getPackageName(),
            "ty.circulari.o19.service.PkbMgmtService"
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
     * Check if currently connected
     */
    public boolean isConnected() {
        return bound && service != null;
    }
    
    /**
     * Get the service interface (null if not connected)
     */
    public IPkbMgmt getService() {
        return service;
    }
    
    /**
     * Ensure the service is started
     */
    public boolean ensureStarted(String alias) {
        Log.i(TAG, "[PkbMgmtClient] ensureStarted() called in pid " + Process.myPid());
        
        if (isServiceRunning()) {
            Log.d(TAG, "[PkbMgmtClient] Service already running");
            return true;
        }
        
        Log.i(TAG, "[PkbMgmtClient] Starting PkbMgmtService with alias: " + alias);
        
        Intent intent = new Intent(context, PkbMgmtService.class);
        intent.putExtra("alias", alias);
        context.startService(intent);
        
        // Wait a bit for service to start
        int attempts = 0;
        while (attempts < 10) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
            Log.d(TAG, "[PkbMgmtClient] Checking if service started (attempt " + (attempts + 1) + "/10)");
            if (isServiceRunning()) {
                Log.i(TAG, "[PkbMgmtClient] Service started successfully after " + (attempts + 1) + " attempts");
                return true;
            }
            attempts++;
        }
        
        Log.e(TAG, "[PkbMgmtClient] Service failed to start after 10 attempts");
        return false;
    }
    
    /**
     * Check if service is running
     */
    public boolean isRunning() {
        return isServiceRunning();
    }
    
    /**
     * Native method to check if service is running
     */
    private static native boolean isServiceRunning();
}
