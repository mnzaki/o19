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
public interface IEventMgmt extends IInterface {
    
    public static abstract class Stub extends Binder implements IEventMgmt {
        private static final String DESCRIPTOR = "ty.circulari.o19.IEventMgmt";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IEventMgmt asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IEventMgmt)) {
                return ((IEventMgmt) iin);
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
        private native void nativeSubscribeEvents(IEventCallback callback);
        private native void nativeUnsubscribeEvents(IEventCallback callback);
        private native boolean nativeSupportsEvents();
        
        private static class Proxy implements IEventMgmt {
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
            
            void subscribeEvents(IEventCallback callback);
    void unsubscribeEvents(IEventCallback callback);
    boolean supportsEvents() throws RemoteException;
        }
    }
    
    // Interface methods
    void subscribeEvents(IEventCallback callback);
    void unsubscribeEvents(IEventCallback callback);
    boolean supportsEvents() throws RemoteException;
}
