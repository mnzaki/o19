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
public interface IContentMgmt extends IInterface {
    
    public static abstract class Stub extends Binder implements IContentMgmt {
        private static final String DESCRIPTOR = "ty.circulari.o19.IContentMgmt";
        
        static {
            System.loadLibrary("foundframe");
        }
        
        public Stub() {
            this.attachInterface(this, DESCRIPTOR);
        }
        
        public static IContentMgmt asInterface(IBinder obj) {
            if (obj == null) {
                return null;
            }
            IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
            if ((iin != null) && (iin instanceof IContentMgmt)) {
                return ((IContentMgmt) iin);
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
        private native String nativeAddMediaLink(String directory, String url, String title, String mimeType, String subpath);
        private native String nativeAddBookmark(String url, String title, String notes);
        private native String nativeAddPost(String content, String title);
        private native String nativeAddPerson(String displayName, String handle);
        private native String nativeAddConversation(String conversationId, String title);
        
        private static class Proxy implements IContentMgmt {
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
            
            String addMediaLink(String directory, String url, String title, String mimeType, String subpath) throws RemoteException;
    String addBookmark(String url, String title, String notes) throws RemoteException;
    String addPost(String content, String title) throws RemoteException;
    String addPerson(String displayName, String handle) throws RemoteException;
    String addConversation(String conversationId, String title) throws RemoteException;
        }
    }
    
    // Interface methods
    String addMediaLink(String directory, String url, String title, String mimeType, String subpath) throws RemoteException;
    String addBookmark(String url, String title, String notes) throws RemoteException;
    String addPost(String content, String title) throws RemoteException;
    String addPerson(String displayName, String handle) throws RemoteException;
    String addConversation(String conversationId, String title) throws RemoteException;
}
