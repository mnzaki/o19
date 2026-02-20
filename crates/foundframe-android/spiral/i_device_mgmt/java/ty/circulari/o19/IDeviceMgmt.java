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
public interface IDeviceMgmt extends IInterface {
    
    public static abstract class Stub extends Binder implements IDeviceMgmt {
        private static final String DESCRIPTOR = "ty.circulari.o19.IDeviceMgmt";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IDeviceMgmt asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IDeviceMgmt)) {
                return ((IDeviceMgmt) iin);
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
        private native String nativeGeneratePairingCode();
        private native boolean nativeConfirmPairing(String deviceId, String code);
        private native void nativeUnpairDevice(String deviceId);
        private native String[] nativeListPairedDevices();
        private native boolean nativeFollowDevice(String deviceId);
        private native void nativeUnfollowDevice(String deviceId);
        private native String[] nativeListFollowers();
        private native boolean nativeIsFollowing(String deviceId);
        
        private static class Proxy implements IDeviceMgmt {
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
            
            String generatePairingCode() throws RemoteException;
    boolean confirmPairing(String deviceId, String code) throws RemoteException;
    void unpairDevice(String deviceId);
    String[] listPairedDevices() throws RemoteException;
    boolean followDevice(String deviceId) throws RemoteException;
    void unfollowDevice(String deviceId);
    String[] listFollowers() throws RemoteException;
    boolean isFollowing(String deviceId) throws RemoteException;
        }
    }
    
    // Interface methods
    String generatePairingCode() throws RemoteException;
    boolean confirmPairing(String deviceId, String code) throws RemoteException;
    void unpairDevice(String deviceId);
    String[] listPairedDevices() throws RemoteException;
    boolean followDevice(String deviceId) throws RemoteException;
    void unfollowDevice(String deviceId);
    String[] listFollowers() throws RemoteException;
    boolean isFollowing(String deviceId) throws RemoteException;
}
