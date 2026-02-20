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
public interface IEventCallback extends IInterface {
    
    public static abstract class Stub extends Binder implements IEventCallback {
        private static final String DESCRIPTOR = "ty.circulari.o19.IEventCallback";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IEventCallback asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IEventCallback)) {
                return ((IEventCallback) iin);
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
        private native void nativeOnEvent(String eventType, String eventData);
        private native void nativeOnStatusChange(String status, String details);
        private native void nativeOnSyncComplete(String repositoryId, boolean success);
        
        private static class Proxy implements IEventCallback {
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
            
            void onEvent(String eventType, String eventData);
    void onStatusChange(String status, String details);
    void onSyncComplete(String repositoryId, boolean success);
        }
    }
    
    // Interface methods
    void onEvent(String eventType, String eventData);
    void onStatusChange(String status, String details);
    void onSyncComplete(String repositoryId, boolean success);
}
