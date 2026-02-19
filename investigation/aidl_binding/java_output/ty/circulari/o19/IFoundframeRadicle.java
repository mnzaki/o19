/*
 * This file is auto-generated.  DO NOT MODIFY.
 * Using: /home/mnzaki/Android/Sdk/build-tools/35.0.1/aidl --lang=java -o java_output -I /home/mnzaki/Projects/circulari.ty/o19/crates/android/android/aidl /home/mnzaki/Projects/circulari.ty/o19/crates/android/android/aidl/ty/circulari/o19/IFoundframeRadicle.aidl
 */
package ty.circulari.o19;
public interface IFoundframeRadicle extends android.os.IInterface
{
  /** Default implementation for IFoundframeRadicle. */
  public static class Default implements ty.circulari.o19.IFoundframeRadicle
  {
    // Node lifecycle and info
    @Override public java.lang.String getNodeId() throws android.os.RemoteException
    {
      return null;
    }
    @Override public boolean isNodeRunning() throws android.os.RemoteException
    {
      return false;
    }
    @Override public java.lang.String getNodeAlias() throws android.os.RemoteException
    {
      return null;
    }
    // PKB operations (no DB - just git/Radicle operations)
    @Override public boolean createRepository(java.lang.String name) throws android.os.RemoteException
    {
      return false;
    }
    @Override public java.lang.String[] listRepositories() throws android.os.RemoteException
    {
      return null;
    }
    @Override public boolean followDevice(java.lang.String deviceId) throws android.os.RemoteException
    {
      return false;
    }
    @Override public java.lang.String[] listFollowers() throws android.os.RemoteException
    {
      return null;
    }
    // Device pairing
    @Override public java.lang.String generatePairingCode() throws android.os.RemoteException
    {
      return null;
    }
    @Override public boolean confirmPairing(java.lang.String deviceId, java.lang.String code) throws android.os.RemoteException
    {
      return false;
    }
    @Override public void unpairDevice(java.lang.String deviceId) throws android.os.RemoteException
    {
    }
    // Write operations - Content creation
    // All return the PKB URL reference to the created content
    // Add a post to the stream
    @Override public java.lang.String addPost(java.lang.String content, java.lang.String title) throws android.os.RemoteException
    {
      return null;
    }
    // Add a bookmark to the stream
    @Override public java.lang.String addBookmark(java.lang.String url, java.lang.String title, java.lang.String notes) throws android.os.RemoteException
    {
      return null;
    }
    // Add a media link to the stream
    @Override public java.lang.String addMediaLink(java.lang.String directory, java.lang.String url, java.lang.String title, java.lang.String mimeType, java.lang.String subpath) throws android.os.RemoteException
    {
      return null;
    }
    // Add a person to the stream
    @Override public java.lang.String addPerson(java.lang.String displayName, java.lang.String handle) throws android.os.RemoteException
    {
      return null;
    }
    // Add a conversation to the stream
    @Override public java.lang.String addConversation(java.lang.String conversationId, java.lang.String title) throws android.os.RemoteException
    {
      return null;
    }
    // Add a text note to a specific directory
    @Override public java.lang.String addTextNote(java.lang.String directory, java.lang.String content, java.lang.String title, java.lang.String subpath) throws android.os.RemoteException
    {
      return null;
    }
    // Event subscription (serialized callbacks for simplicity)
    @Override public void subscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException
    {
    }
    @Override public void unsubscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException
    {
    }
    @Override
    public android.os.IBinder asBinder() {
      return null;
    }
  }
  /** Local-side IPC implementation stub class. */
  public static abstract class Stub extends android.os.Binder implements ty.circulari.o19.IFoundframeRadicle
  {
    /** Construct the stub at attach it to the interface. */
    @SuppressWarnings("this-escape")
    public Stub()
    {
      this.attachInterface(this, DESCRIPTOR);
    }
    /**
     * Cast an IBinder object into an ty.circulari.o19.IFoundframeRadicle interface,
     * generating a proxy if needed.
     */
    public static ty.circulari.o19.IFoundframeRadicle asInterface(android.os.IBinder obj)
    {
      if ((obj==null)) {
        return null;
      }
      android.os.IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
      if (((iin!=null)&&(iin instanceof ty.circulari.o19.IFoundframeRadicle))) {
        return ((ty.circulari.o19.IFoundframeRadicle)iin);
      }
      return new ty.circulari.o19.IFoundframeRadicle.Stub.Proxy(obj);
    }
    @Override public android.os.IBinder asBinder()
    {
      return this;
    }
    @Override public boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException
    {
      java.lang.String descriptor = DESCRIPTOR;
      if (code >= android.os.IBinder.FIRST_CALL_TRANSACTION && code <= android.os.IBinder.LAST_CALL_TRANSACTION) {
        data.enforceInterface(descriptor);
      }
      if (code == INTERFACE_TRANSACTION) {
        reply.writeString(descriptor);
        return true;
      }
      switch (code)
      {
        case TRANSACTION_getNodeId:
        {
          java.lang.String _result = this.getNodeId();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_isNodeRunning:
        {
          boolean _result = this.isNodeRunning();
          reply.writeNoException();
          reply.writeInt(((_result)?(1):(0)));
          break;
        }
        case TRANSACTION_getNodeAlias:
        {
          java.lang.String _result = this.getNodeAlias();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_createRepository:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          boolean _result = this.createRepository(_arg0);
          reply.writeNoException();
          reply.writeInt(((_result)?(1):(0)));
          break;
        }
        case TRANSACTION_listRepositories:
        {
          java.lang.String[] _result = this.listRepositories();
          reply.writeNoException();
          reply.writeStringArray(_result);
          break;
        }
        case TRANSACTION_followDevice:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          boolean _result = this.followDevice(_arg0);
          reply.writeNoException();
          reply.writeInt(((_result)?(1):(0)));
          break;
        }
        case TRANSACTION_listFollowers:
        {
          java.lang.String[] _result = this.listFollowers();
          reply.writeNoException();
          reply.writeStringArray(_result);
          break;
        }
        case TRANSACTION_generatePairingCode:
        {
          java.lang.String _result = this.generatePairingCode();
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_confirmPairing:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          boolean _result = this.confirmPairing(_arg0, _arg1);
          reply.writeNoException();
          reply.writeInt(((_result)?(1):(0)));
          break;
        }
        case TRANSACTION_unpairDevice:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          this.unpairDevice(_arg0);
          reply.writeNoException();
          break;
        }
        case TRANSACTION_addPost:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _result = this.addPost(_arg0, _arg1);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_addBookmark:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _arg2;
          _arg2 = data.readString();
          java.lang.String _result = this.addBookmark(_arg0, _arg1, _arg2);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_addMediaLink:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _arg2;
          _arg2 = data.readString();
          java.lang.String _arg3;
          _arg3 = data.readString();
          java.lang.String _arg4;
          _arg4 = data.readString();
          java.lang.String _result = this.addMediaLink(_arg0, _arg1, _arg2, _arg3, _arg4);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_addPerson:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _result = this.addPerson(_arg0, _arg1);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_addConversation:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _result = this.addConversation(_arg0, _arg1);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_addTextNote:
        {
          java.lang.String _arg0;
          _arg0 = data.readString();
          java.lang.String _arg1;
          _arg1 = data.readString();
          java.lang.String _arg2;
          _arg2 = data.readString();
          java.lang.String _arg3;
          _arg3 = data.readString();
          java.lang.String _result = this.addTextNote(_arg0, _arg1, _arg2, _arg3);
          reply.writeNoException();
          reply.writeString(_result);
          break;
        }
        case TRANSACTION_subscribeEvents:
        {
          ty.circulari.o19.IEventCallback _arg0;
          _arg0 = ty.circulari.o19.IEventCallback.Stub.asInterface(data.readStrongBinder());
          this.subscribeEvents(_arg0);
          break;
        }
        case TRANSACTION_unsubscribeEvents:
        {
          ty.circulari.o19.IEventCallback _arg0;
          _arg0 = ty.circulari.o19.IEventCallback.Stub.asInterface(data.readStrongBinder());
          this.unsubscribeEvents(_arg0);
          break;
        }
        default:
        {
          return super.onTransact(code, data, reply, flags);
        }
      }
      return true;
    }
    private static class Proxy implements ty.circulari.o19.IFoundframeRadicle
    {
      private android.os.IBinder mRemote;
      Proxy(android.os.IBinder remote)
      {
        mRemote = remote;
      }
      @Override public android.os.IBinder asBinder()
      {
        return mRemote;
      }
      public java.lang.String getInterfaceDescriptor()
      {
        return DESCRIPTOR;
      }
      // Node lifecycle and info
      @Override public java.lang.String getNodeId() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getNodeId, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public boolean isNodeRunning() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        boolean _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_isNodeRunning, _data, _reply, 0);
          _reply.readException();
          _result = (0!=_reply.readInt());
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public java.lang.String getNodeAlias() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_getNodeAlias, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // PKB operations (no DB - just git/Radicle operations)
      @Override public boolean createRepository(java.lang.String name) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        boolean _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(name);
          boolean _status = mRemote.transact(Stub.TRANSACTION_createRepository, _data, _reply, 0);
          _reply.readException();
          _result = (0!=_reply.readInt());
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public java.lang.String[] listRepositories() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String[] _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_listRepositories, _data, _reply, 0);
          _reply.readException();
          _result = _reply.createStringArray();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public boolean followDevice(java.lang.String deviceId) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        boolean _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(deviceId);
          boolean _status = mRemote.transact(Stub.TRANSACTION_followDevice, _data, _reply, 0);
          _reply.readException();
          _result = (0!=_reply.readInt());
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public java.lang.String[] listFollowers() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String[] _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_listFollowers, _data, _reply, 0);
          _reply.readException();
          _result = _reply.createStringArray();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Device pairing
      @Override public java.lang.String generatePairingCode() throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          boolean _status = mRemote.transact(Stub.TRANSACTION_generatePairingCode, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public boolean confirmPairing(java.lang.String deviceId, java.lang.String code) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        boolean _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(deviceId);
          _data.writeString(code);
          boolean _status = mRemote.transact(Stub.TRANSACTION_confirmPairing, _data, _reply, 0);
          _reply.readException();
          _result = (0!=_reply.readInt());
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      @Override public void unpairDevice(java.lang.String deviceId) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(deviceId);
          boolean _status = mRemote.transact(Stub.TRANSACTION_unpairDevice, _data, _reply, 0);
          _reply.readException();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
      }
      // Write operations - Content creation
      // All return the PKB URL reference to the created content
      // Add a post to the stream
      @Override public java.lang.String addPost(java.lang.String content, java.lang.String title) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(content);
          _data.writeString(title);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addPost, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Add a bookmark to the stream
      @Override public java.lang.String addBookmark(java.lang.String url, java.lang.String title, java.lang.String notes) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(url);
          _data.writeString(title);
          _data.writeString(notes);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addBookmark, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Add a media link to the stream
      @Override public java.lang.String addMediaLink(java.lang.String directory, java.lang.String url, java.lang.String title, java.lang.String mimeType, java.lang.String subpath) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(directory);
          _data.writeString(url);
          _data.writeString(title);
          _data.writeString(mimeType);
          _data.writeString(subpath);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addMediaLink, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Add a person to the stream
      @Override public java.lang.String addPerson(java.lang.String displayName, java.lang.String handle) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(displayName);
          _data.writeString(handle);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addPerson, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Add a conversation to the stream
      @Override public java.lang.String addConversation(java.lang.String conversationId, java.lang.String title) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(conversationId);
          _data.writeString(title);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addConversation, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Add a text note to a specific directory
      @Override public java.lang.String addTextNote(java.lang.String directory, java.lang.String content, java.lang.String title, java.lang.String subpath) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        android.os.Parcel _reply = android.os.Parcel.obtain();
        java.lang.String _result;
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeString(directory);
          _data.writeString(content);
          _data.writeString(title);
          _data.writeString(subpath);
          boolean _status = mRemote.transact(Stub.TRANSACTION_addTextNote, _data, _reply, 0);
          _reply.readException();
          _result = _reply.readString();
        }
        finally {
          _reply.recycle();
          _data.recycle();
        }
        return _result;
      }
      // Event subscription (serialized callbacks for simplicity)
      @Override public void subscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_subscribeEvents, _data, null, android.os.IBinder.FLAG_ONEWAY);
        }
        finally {
          _data.recycle();
        }
      }
      @Override public void unsubscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException
      {
        android.os.Parcel _data = android.os.Parcel.obtain();
        try {
          _data.writeInterfaceToken(DESCRIPTOR);
          _data.writeStrongInterface(callback);
          boolean _status = mRemote.transact(Stub.TRANSACTION_unsubscribeEvents, _data, null, android.os.IBinder.FLAG_ONEWAY);
        }
        finally {
          _data.recycle();
        }
      }
    }
    static final int TRANSACTION_getNodeId = (android.os.IBinder.FIRST_CALL_TRANSACTION + 0);
    static final int TRANSACTION_isNodeRunning = (android.os.IBinder.FIRST_CALL_TRANSACTION + 1);
    static final int TRANSACTION_getNodeAlias = (android.os.IBinder.FIRST_CALL_TRANSACTION + 2);
    static final int TRANSACTION_createRepository = (android.os.IBinder.FIRST_CALL_TRANSACTION + 3);
    static final int TRANSACTION_listRepositories = (android.os.IBinder.FIRST_CALL_TRANSACTION + 4);
    static final int TRANSACTION_followDevice = (android.os.IBinder.FIRST_CALL_TRANSACTION + 5);
    static final int TRANSACTION_listFollowers = (android.os.IBinder.FIRST_CALL_TRANSACTION + 6);
    static final int TRANSACTION_generatePairingCode = (android.os.IBinder.FIRST_CALL_TRANSACTION + 7);
    static final int TRANSACTION_confirmPairing = (android.os.IBinder.FIRST_CALL_TRANSACTION + 8);
    static final int TRANSACTION_unpairDevice = (android.os.IBinder.FIRST_CALL_TRANSACTION + 9);
    static final int TRANSACTION_addPost = (android.os.IBinder.FIRST_CALL_TRANSACTION + 10);
    static final int TRANSACTION_addBookmark = (android.os.IBinder.FIRST_CALL_TRANSACTION + 11);
    static final int TRANSACTION_addMediaLink = (android.os.IBinder.FIRST_CALL_TRANSACTION + 12);
    static final int TRANSACTION_addPerson = (android.os.IBinder.FIRST_CALL_TRANSACTION + 13);
    static final int TRANSACTION_addConversation = (android.os.IBinder.FIRST_CALL_TRANSACTION + 14);
    static final int TRANSACTION_addTextNote = (android.os.IBinder.FIRST_CALL_TRANSACTION + 15);
    static final int TRANSACTION_subscribeEvents = (android.os.IBinder.FIRST_CALL_TRANSACTION + 16);
    static final int TRANSACTION_unsubscribeEvents = (android.os.IBinder.FIRST_CALL_TRANSACTION + 17);
  }
  /** @hide */
  public static final java.lang.String DESCRIPTOR = "ty.circulari.o19.IFoundframeRadicle";
  // Node lifecycle and info
  public java.lang.String getNodeId() throws android.os.RemoteException;
  public boolean isNodeRunning() throws android.os.RemoteException;
  public java.lang.String getNodeAlias() throws android.os.RemoteException;
  // PKB operations (no DB - just git/Radicle operations)
  public boolean createRepository(java.lang.String name) throws android.os.RemoteException;
  public java.lang.String[] listRepositories() throws android.os.RemoteException;
  public boolean followDevice(java.lang.String deviceId) throws android.os.RemoteException;
  public java.lang.String[] listFollowers() throws android.os.RemoteException;
  // Device pairing
  public java.lang.String generatePairingCode() throws android.os.RemoteException;
  public boolean confirmPairing(java.lang.String deviceId, java.lang.String code) throws android.os.RemoteException;
  public void unpairDevice(java.lang.String deviceId) throws android.os.RemoteException;
  // Write operations - Content creation
  // All return the PKB URL reference to the created content
  // Add a post to the stream
  public java.lang.String addPost(java.lang.String content, java.lang.String title) throws android.os.RemoteException;
  // Add a bookmark to the stream
  public java.lang.String addBookmark(java.lang.String url, java.lang.String title, java.lang.String notes) throws android.os.RemoteException;
  // Add a media link to the stream
  public java.lang.String addMediaLink(java.lang.String directory, java.lang.String url, java.lang.String title, java.lang.String mimeType, java.lang.String subpath) throws android.os.RemoteException;
  // Add a person to the stream
  public java.lang.String addPerson(java.lang.String displayName, java.lang.String handle) throws android.os.RemoteException;
  // Add a conversation to the stream
  public java.lang.String addConversation(java.lang.String conversationId, java.lang.String title) throws android.os.RemoteException;
  // Add a text note to a specific directory
  public java.lang.String addTextNote(java.lang.String directory, java.lang.String content, java.lang.String title, java.lang.String subpath) throws android.os.RemoteException;
  // Event subscription (serialized callbacks for simplicity)
  public void subscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException;
  public void unsubscribeEvents(ty.circulari.o19.IEventCallback callback) throws android.os.RemoteException;
}
