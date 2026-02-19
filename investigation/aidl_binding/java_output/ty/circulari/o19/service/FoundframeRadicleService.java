package ty.circulari.o19.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Process;
import android.util.Log;

import ty.circulari.o19.IFoundframeRadicle;

/**
 * FoundframeRadicle service - runs in :foundframe process
 * 
 * This service provides access to the Radicle/Foundframe functionality
 * through AIDL. The actual implementation is in Rust, accessed via JNI.
 */
public class FoundframeRadicleService extends Service {
    private static final String TAG = "FoundframeService";
    
    static {
        // Load the native library
        System.loadLibrary("foundframe");
    }
    
    // Service binder that delegates to native methods
    private final IFoundframeRadicle.Stub binder = new IFoundframeRadicle.Stub() {
        @Override
        public String getNodeId() {
            return nativeGetNodeId();
        }
        
        @Override
        public boolean isNodeRunning() {
            return nativeIsNodeRunning();
        }
        
        @Override
        public String getNodeAlias() {
            return nativeGetNodeAlias();
        }
        
        @Override
        public boolean createRepository(String name) {
            return nativeCreateRepository(name);
        }
        
        @Override
        public String[] listRepositories() {
            return nativeListRepositories();
        }
        
        @Override
        public boolean followDevice(String deviceId) {
            return nativeFollowDevice(deviceId);
        }
        
        @Override
        public String[] listFollowers() {
            return nativeListFollowers();
        }
        
        @Override
        public String generatePairingCode() {
            return nativeGeneratePairingCode();
        }
        
        @Override
        public boolean confirmPairing(String deviceId, String code) {
            return nativeConfirmPairing(deviceId, code);
        }
        
        @Override
        public void unpairDevice(String deviceId) {
            nativeUnpairDevice(deviceId);
        }
        
        @Override
        public String addPost(String content, String title) {
            return nativeAddPost(content, title);
        }
        
        @Override
        public String addBookmark(String url, String title, String notes) {
            return nativeAddBookmark(url, title, notes);
        }
        
        @Override
        public String addMediaLink(String directory, String url, String title, 
                                    String mimeType, String subpath) {
            return nativeAddMediaLink(directory, url, title, mimeType, subpath);
        }
        
        @Override
        public String addPerson(String displayName, String handle) {
            return nativeAddPerson(displayName, handle);
        }
        
        @Override
        public String addConversation(String conversationId, String title) {
            return nativeAddConversation(conversationId, title);
        }
        
        @Override
        public String addTextNote(String directory, String content, String title, String subpath) {
            return nativeAddTextNote(directory, content, title, subpath);
        }
        
        @Override
        public void subscribeEvents(ty.circulari.o19.IEventCallback callback) {
            nativeSubscribeEvents(callback);
        }
        
        @Override
        public void unsubscribeEvents(ty.circulari.o19.IEventCallback callback) {
            nativeUnsubscribeEvents(callback);
        }
    };
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Service created in process " + Process.myPid());
        
        // Initialize the Rust service
        String radicleHome = getFilesDir().getAbsolutePath() + "/.radicle";
        String nodeAlias = "deardiary";
        
        nativeStartService(radicleHome, nodeAlias);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        Log.i(TAG, "onBind called");
        return binder;
    }
    
    @Override
    public boolean onUnbind(Intent intent) {
        Log.i(TAG, "onUnbind called");
        return super.onUnbind(intent);
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.i(TAG, "Service destroyed");
    }
    
    // Native methods - implemented in Rust (aidl_service.rs)
    private native void nativeStartService(String radicleHome, String nodeAlias);
    private native String nativeGetNodeId();
    private native boolean nativeIsNodeRunning();
    private native String nativeGetNodeAlias();
    private native boolean nativeCreateRepository(String name);
    private native String[] nativeListRepositories();
    private native boolean nativeFollowDevice(String deviceId);
    private native String[] nativeListFollowers();
    private native String nativeGeneratePairingCode();
    private native boolean nativeConfirmPairing(String deviceId, String code);
    private native void nativeUnpairDevice(String deviceId);
    private native String nativeAddPost(String content, String title);
    private native String nativeAddBookmark(String url, String title, String notes);
    private native String nativeAddMediaLink(String directory, String url, String title, 
                                              String mimeType, String subpath);
    private native String nativeAddPerson(String displayName, String handle);
    private native String nativeAddConversation(String conversationId, String title);
    private native String nativeAddTextNote(String directory, String content, String title, String subpath);
    private native void nativeSubscribeEvents(ty.circulari.o19.IEventCallback callback);
    private native void nativeUnsubscribeEvents(ty.circulari.o19.IEventCallback callback);
}
