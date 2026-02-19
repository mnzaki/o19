package ty.circulari.o19;

import android.os.Binder;
import android.os.IBinder;
import android.os.IInterface;
import android.os.Parcel;
import android.os.RemoteException;

/**
 * Auto-generated AIDL interface stub.
 * DO NOT EDIT MANUALLY - Generated from AIDL
 */
public interface IFoundframeRadicle extends IInterface {
    
    public static abstract class Stub extends Binder implements IFoundframeRadicle {
        private static final String DESCRIPTOR = "ty.circulari.o19.IFoundframeRadicle";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IFoundframeRadicle asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IFoundframeRadicle)) {
                return ((IFoundframeRadicle) iin);
            }
            return new Proxy(obj);
        }
        
        @Override
        public IBinder asBinder() {
            return this;
        }
        
        @Override
        protected boolean onTransact(int code, Parcel data, Parcel reply, int flags) throws RemoteException {
            switch (code) {
                case INTERFACE_TRANSACTION: {
                    reply.writeString(DESCRIPTOR);
                    return true;
                }
                // Transaction dispatch handled by native layer
                default:
                    return super.onTransact(code, data, reply, flags);
            }
        }
        
        // Native method declarations
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
        private native String nativeAddMediaLink(String directory, String url, String title, String mimeType, String subpath);
        private native String nativeAddPerson(String displayName, String handle);
        private native String nativeAddConversation(String conversationId, String title);
        private native String nativeAddTextNote(String directory, String content, String title, String subpath);
        private native void nativeSubscribeEvents(IEventCallback callback);
        private native void nativeUnsubscribeEvents(IEventCallback callback);
        
        private static class Proxy implements IFoundframeRadicle {
            private final IBinder mRemote;
            
            Proxy(IBinder remote) {
                mRemote = remote;
            }
            
            @Override
            public IBinder asBinder() {
                return mRemote;
            }
            
            public String getInterfaceDescriptor() {
                return DESCRIPTOR;
            }
            
            String getNodeId() throws RemoteException;
    boolean isNodeRunning() throws RemoteException;
    String getNodeAlias() throws RemoteException;
    boolean createRepository(String name) throws RemoteException;
    String[] listRepositories() throws RemoteException;
    boolean followDevice(String deviceId) throws RemoteException;
    String[] listFollowers() throws RemoteException;
    String generatePairingCode() throws RemoteException;
    boolean confirmPairing(String deviceId, String code) throws RemoteException;
    void unpairDevice(String deviceId);
    String addPost(String content, String title) throws RemoteException;
    String addBookmark(String url, String title, String notes) throws RemoteException;
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath) throws RemoteException;
    String addPerson(String displayName, String handle) throws RemoteException;
    String addConversation(String conversationId, String title) throws RemoteException;
    String addTextNote(String directory, String content, String title, String subpath) throws RemoteException;
    void subscribeEvents(IEventCallback callback);
    void unsubscribeEvents(IEventCallback callback);
        }
    }
    
    // Interface methods
    String getNodeId() throws RemoteException;
    boolean isNodeRunning() throws RemoteException;
    String getNodeAlias() throws RemoteException;
    boolean createRepository(String name) throws RemoteException;
    String[] listRepositories() throws RemoteException;
    boolean followDevice(String deviceId) throws RemoteException;
    String[] listFollowers() throws RemoteException;
    String generatePairingCode() throws RemoteException;
    boolean confirmPairing(String deviceId, String code) throws RemoteException;
    void unpairDevice(String deviceId);
    String addPost(String content, String title) throws RemoteException;
    String addBookmark(String url, String title, String notes) throws RemoteException;
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath) throws RemoteException;
    String addPerson(String displayName, String handle) throws RemoteException;
    String addConversation(String conversationId, String title) throws RemoteException;
    String addTextNote(String directory, String content, String title, String subpath) throws RemoteException;
    void subscribeEvents(IEventCallback callback);
    void unsubscribeEvents(IEventCallback callback);
}
