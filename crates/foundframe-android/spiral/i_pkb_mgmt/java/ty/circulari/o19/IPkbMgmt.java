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
public interface IPkbMgmt extends IInterface {
    
    public static abstract class Stub extends Binder implements IPkbMgmt {
        private static final String DESCRIPTOR = "ty.circulari.o19.IPkbMgmt";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IPkbMgmt asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IPkbMgmt)) {
                return ((IPkbMgmt) iin);
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
        private native boolean nativeCreateRepository(String name);
        private native String[] nativeListRepositories();
        private native String nativeGetDefaultRepository();
        private native boolean nativeSetDefaultRepository(String name);
        
        private static class Proxy implements IPkbMgmt {
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
            
            boolean createRepository(String name) throws RemoteException;
    String[] listRepositories() throws RemoteException;
    String getDefaultRepository() throws RemoteException;
    boolean setDefaultRepository(String name) throws RemoteException;
        }
    }
    
    // Interface methods
    boolean createRepository(String name) throws RemoteException;
    String[] listRepositories() throws RemoteException;
    String getDefaultRepository() throws RemoteException;
    boolean setDefaultRepository(String name) throws RemoteException;
}
