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
public interface INodeMgmt extends IInterface {
    
    public static abstract class Stub extends Binder implements INodeMgmt {
        private static final String DESCRIPTOR = "ty.circulari.o19.INodeMgmt";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static INodeMgmt asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof INodeMgmt)) {
                return ((INodeMgmt) iin);
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
        private native boolean nativeStartNode(String alias);
        private native void nativeStopNode();
        
        private static class Proxy implements INodeMgmt {
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
    boolean startNode(String alias) throws RemoteException;
    void stopNode();
        }
    }
    
    // Interface methods
    String getNodeId() throws RemoteException;
    boolean isNodeRunning() throws RemoteException;
    String getNodeAlias() throws RemoteException;
    boolean startNode(String alias) throws RemoteException;
    void stopNode();
}
