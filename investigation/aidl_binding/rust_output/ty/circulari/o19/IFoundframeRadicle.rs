/*
 * This file is auto-generated.  DO NOT MODIFY.
 * Using: /home/mnzaki/Android/Sdk/build-tools/35.0.1/aidl --lang=rust -o rust_output -I /home/mnzaki/Projects/circulari.ty/o19/crates/android/android/aidl /home/mnzaki/Projects/circulari.ty/o19/crates/android/android/aidl/ty/circulari/o19/IFoundframeRadicle.aidl
 */
#![forbid(unsafe_code)]
#![cfg_attr(rustfmt, rustfmt_skip)]
#![allow(non_upper_case_globals)]
#![allow(non_snake_case)]
#[allow(unused_imports)] use binder::binder_impl::IBinderInternal;
use binder::declare_binder_interface;
declare_binder_interface! {
  IFoundframeRadicle["ty.circulari.o19.IFoundframeRadicle"] {
    native: BnFoundframeRadicle(on_transact),
    proxy: BpFoundframeRadicle {
    },
    async: IFoundframeRadicleAsync,
  }
}
pub trait IFoundframeRadicle: binder::Interface + Send {
  fn get_descriptor() -> &'static str where Self: Sized { "ty.circulari.o19.IFoundframeRadicle" }
  fn r#getNodeId(&self) -> binder::Result<String>;
  fn r#isNodeRunning(&self) -> binder::Result<bool>;
  fn r#getNodeAlias(&self) -> binder::Result<String>;
  fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool>;
  fn r#listRepositories(&self) -> binder::Result<Vec<String>>;
  fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool>;
  fn r#listFollowers(&self) -> binder::Result<Vec<String>>;
  fn r#generatePairingCode(&self) -> binder::Result<String>;
  fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool>;
  fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()>;
  fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String>;
  fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String>;
  fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String>;
  fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String>;
  fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String>;
  fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String>;
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()>;
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()>;
  fn getDefaultImpl() -> IFoundframeRadicleDefaultRef where Self: Sized {
    DEFAULT_IMPL.lock().unwrap().clone()
  }
  fn setDefaultImpl(d: IFoundframeRadicleDefaultRef) -> IFoundframeRadicleDefaultRef where Self: Sized {
    std::mem::replace(&mut *DEFAULT_IMPL.lock().unwrap(), d)
  }
}
pub trait IFoundframeRadicleAsync<P>: binder::Interface + Send {
  fn get_descriptor() -> &'static str where Self: Sized { "ty.circulari.o19.IFoundframeRadicle" }
  fn r#getNodeId<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#isNodeRunning<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<bool>>;
  fn r#getNodeAlias<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#createRepository<'a>(&'a self, _arg_name: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>>;
  fn r#listRepositories<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<Vec<String>>>;
  fn r#followDevice<'a>(&'a self, _arg_deviceId: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>>;
  fn r#listFollowers<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<Vec<String>>>;
  fn r#generatePairingCode<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#confirmPairing<'a>(&'a self, _arg_deviceId: &'a str, _arg_code: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>>;
  fn r#unpairDevice<'a>(&'a self, _arg_deviceId: &'a str) -> binder::BoxFuture<'a, binder::Result<()>>;
  fn r#addPost<'a>(&'a self, _arg_content: &'a str, _arg_title: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#addBookmark<'a>(&'a self, _arg_url: &'a str, _arg_title: &'a str, _arg_notes: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#addMediaLink<'a>(&'a self, _arg_directory: &'a str, _arg_url: &'a str, _arg_title: &'a str, _arg_mimeType: &'a str, _arg_subpath: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#addPerson<'a>(&'a self, _arg_displayName: &'a str, _arg_handle: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#addConversation<'a>(&'a self, _arg_conversationId: &'a str, _arg_title: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#addTextNote<'a>(&'a self, _arg_directory: &'a str, _arg_content: &'a str, _arg_title: &'a str, _arg_subpath: &'a str) -> binder::BoxFuture<'a, binder::Result<String>>;
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> std::future::Ready<binder::Result<()>>;
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> std::future::Ready<binder::Result<()>>;
}
#[::async_trait::async_trait]
pub trait IFoundframeRadicleAsyncServer: binder::Interface + Send {
  fn get_descriptor() -> &'static str where Self: Sized { "ty.circulari.o19.IFoundframeRadicle" }
  async fn r#getNodeId(&self) -> binder::Result<String>;
  async fn r#isNodeRunning(&self) -> binder::Result<bool>;
  async fn r#getNodeAlias(&self) -> binder::Result<String>;
  async fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool>;
  async fn r#listRepositories(&self) -> binder::Result<Vec<String>>;
  async fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool>;
  async fn r#listFollowers(&self) -> binder::Result<Vec<String>>;
  async fn r#generatePairingCode(&self) -> binder::Result<String>;
  async fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool>;
  async fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()>;
  async fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String>;
  async fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String>;
  async fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String>;
  async fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String>;
  async fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String>;
  async fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String>;
  async fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()>;
  async fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()>;
}
impl BnFoundframeRadicle {
  /// Create a new async binder service.
  pub fn new_async_binder<T, R>(inner: T, rt: R, features: binder::BinderFeatures) -> binder::Strong<dyn IFoundframeRadicle>
  where
    T: IFoundframeRadicleAsyncServer + binder::Interface + Send + Sync + 'static,
    R: binder::binder_impl::BinderAsyncRuntime + Send + Sync + 'static,
  {
    struct Wrapper<T, R> {
      _inner: T,
      _rt: R,
    }
    impl<T, R> binder::Interface for Wrapper<T, R> where T: binder::Interface, R: Send + Sync + 'static {
      fn as_binder(&self) -> binder::SpIBinder { self._inner.as_binder() }
      fn dump(&self, _writer: &mut dyn std::io::Write, _args: &[&std::ffi::CStr]) -> std::result::Result<(), binder::StatusCode> { self._inner.dump(_writer, _args) }
    }
    impl<T, R> IFoundframeRadicle for Wrapper<T, R>
    where
      T: IFoundframeRadicleAsyncServer + Send + Sync + 'static,
      R: binder::binder_impl::BinderAsyncRuntime + Send + Sync + 'static,
    {
      fn r#getNodeId(&self) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#getNodeId())
      }
      fn r#isNodeRunning(&self) -> binder::Result<bool> {
        self._rt.block_on(self._inner.r#isNodeRunning())
      }
      fn r#getNodeAlias(&self) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#getNodeAlias())
      }
      fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool> {
        self._rt.block_on(self._inner.r#createRepository(_arg_name))
      }
      fn r#listRepositories(&self) -> binder::Result<Vec<String>> {
        self._rt.block_on(self._inner.r#listRepositories())
      }
      fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool> {
        self._rt.block_on(self._inner.r#followDevice(_arg_deviceId))
      }
      fn r#listFollowers(&self) -> binder::Result<Vec<String>> {
        self._rt.block_on(self._inner.r#listFollowers())
      }
      fn r#generatePairingCode(&self) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#generatePairingCode())
      }
      fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool> {
        self._rt.block_on(self._inner.r#confirmPairing(_arg_deviceId, _arg_code))
      }
      fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()> {
        self._rt.block_on(self._inner.r#unpairDevice(_arg_deviceId))
      }
      fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addPost(_arg_content, _arg_title))
      }
      fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addBookmark(_arg_url, _arg_title, _arg_notes))
      }
      fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath))
      }
      fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addPerson(_arg_displayName, _arg_handle))
      }
      fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addConversation(_arg_conversationId, _arg_title))
      }
      fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String> {
        self._rt.block_on(self._inner.r#addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath))
      }
      fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
        self._rt.block_on(self._inner.r#subscribeEvents(_arg_callback))
      }
      fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
        self._rt.block_on(self._inner.r#unsubscribeEvents(_arg_callback))
      }
    }
    let wrapped = Wrapper { _inner: inner, _rt: rt };
    Self::new_binder(wrapped, features)
  }
}
pub trait IFoundframeRadicleDefault: Send + Sync {
  fn r#getNodeId(&self) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#isNodeRunning(&self) -> binder::Result<bool> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#getNodeAlias(&self) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#listRepositories(&self) -> binder::Result<Vec<String>> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#listFollowers(&self) -> binder::Result<Vec<String>> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#generatePairingCode(&self) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
    Err(binder::StatusCode::UNKNOWN_TRANSACTION.into())
  }
}
pub mod transactions {
  pub const r#getNodeId: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 0;
  pub const r#isNodeRunning: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 1;
  pub const r#getNodeAlias: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 2;
  pub const r#createRepository: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 3;
  pub const r#listRepositories: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 4;
  pub const r#followDevice: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 5;
  pub const r#listFollowers: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 6;
  pub const r#generatePairingCode: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 7;
  pub const r#confirmPairing: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 8;
  pub const r#unpairDevice: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 9;
  pub const r#addPost: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 10;
  pub const r#addBookmark: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 11;
  pub const r#addMediaLink: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 12;
  pub const r#addPerson: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 13;
  pub const r#addConversation: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 14;
  pub const r#addTextNote: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 15;
  pub const r#subscribeEvents: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 16;
  pub const r#unsubscribeEvents: binder::binder_impl::TransactionCode = binder::binder_impl::FIRST_CALL_TRANSACTION + 17;
}
pub type IFoundframeRadicleDefaultRef = Option<std::sync::Arc<dyn IFoundframeRadicleDefault>>;
static DEFAULT_IMPL: std::sync::Mutex<IFoundframeRadicleDefaultRef> = std::sync::Mutex::new(None);
impl BpFoundframeRadicle {
  fn build_parcel_getNodeId(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_getNodeId(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#getNodeId();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_isNodeRunning(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_isNodeRunning(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<bool> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#isNodeRunning();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: bool = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_getNodeAlias(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_getNodeAlias(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#getNodeAlias();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_createRepository(&self, _arg_name: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_name)?;
    Ok(aidl_data)
  }
  fn read_response_createRepository(&self, _arg_name: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<bool> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#createRepository(_arg_name);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: bool = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_listRepositories(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_listRepositories(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<Vec<String>> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#listRepositories();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: Vec<String> = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_followDevice(&self, _arg_deviceId: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_deviceId)?;
    Ok(aidl_data)
  }
  fn read_response_followDevice(&self, _arg_deviceId: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<bool> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#followDevice(_arg_deviceId);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: bool = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_listFollowers(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_listFollowers(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<Vec<String>> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#listFollowers();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: Vec<String> = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_generatePairingCode(&self) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    Ok(aidl_data)
  }
  fn read_response_generatePairingCode(&self, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#generatePairingCode();
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_deviceId)?;
    aidl_data.write(_arg_code)?;
    Ok(aidl_data)
  }
  fn read_response_confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<bool> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#confirmPairing(_arg_deviceId, _arg_code);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: bool = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_deviceId)?;
    Ok(aidl_data)
  }
  fn read_response_unpairDevice(&self, _arg_deviceId: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<()> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#unpairDevice(_arg_deviceId);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    Ok(())
  }
  fn build_parcel_addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_content)?;
    aidl_data.write(_arg_title)?;
    Ok(aidl_data)
  }
  fn read_response_addPost(&self, _arg_content: &str, _arg_title: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addPost(_arg_content, _arg_title);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_url)?;
    aidl_data.write(_arg_title)?;
    aidl_data.write(_arg_notes)?;
    Ok(aidl_data)
  }
  fn read_response_addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addBookmark(_arg_url, _arg_title, _arg_notes);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_directory)?;
    aidl_data.write(_arg_url)?;
    aidl_data.write(_arg_title)?;
    aidl_data.write(_arg_mimeType)?;
    aidl_data.write(_arg_subpath)?;
    Ok(aidl_data)
  }
  fn read_response_addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_displayName)?;
    aidl_data.write(_arg_handle)?;
    Ok(aidl_data)
  }
  fn read_response_addPerson(&self, _arg_displayName: &str, _arg_handle: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addPerson(_arg_displayName, _arg_handle);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_conversationId)?;
    aidl_data.write(_arg_title)?;
    Ok(aidl_data)
  }
  fn read_response_addConversation(&self, _arg_conversationId: &str, _arg_title: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addConversation(_arg_conversationId, _arg_title);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_directory)?;
    aidl_data.write(_arg_content)?;
    aidl_data.write(_arg_title)?;
    aidl_data.write(_arg_subpath)?;
    Ok(aidl_data)
  }
  fn read_response_addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<String> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath);
      }
    }
    let _aidl_reply = _aidl_reply?;
    let _aidl_status: binder::Status = _aidl_reply.read()?;
    if !_aidl_status.is_ok() { return Err(_aidl_status); }
    let _aidl_return: String = _aidl_reply.read()?;
    Ok(_aidl_return)
  }
  fn build_parcel_subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_callback)?;
    Ok(aidl_data)
  }
  fn read_response_subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<()> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#subscribeEvents(_arg_callback);
      }
    }
    let _aidl_reply = _aidl_reply?;
    Ok(())
  }
  fn build_parcel_unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<binder::binder_impl::Parcel> {
    let mut aidl_data = self.binder.prepare_transact()?;
    aidl_data.write(_arg_callback)?;
    Ok(aidl_data)
  }
  fn read_response_unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>, _aidl_reply: std::result::Result<binder::binder_impl::Parcel, binder::StatusCode>) -> binder::Result<()> {
    if let Err(binder::StatusCode::UNKNOWN_TRANSACTION) = _aidl_reply {
      if let Some(_aidl_default_impl) = <Self as IFoundframeRadicle>::getDefaultImpl() {
        return _aidl_default_impl.r#unsubscribeEvents(_arg_callback);
      }
    }
    let _aidl_reply = _aidl_reply?;
    Ok(())
  }
}
impl IFoundframeRadicle for BpFoundframeRadicle {
  fn r#getNodeId(&self) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_getNodeId()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#getNodeId, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_getNodeId(_aidl_reply)
  }
  fn r#isNodeRunning(&self) -> binder::Result<bool> {
    let _aidl_data = self.build_parcel_isNodeRunning()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#isNodeRunning, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_isNodeRunning(_aidl_reply)
  }
  fn r#getNodeAlias(&self) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_getNodeAlias()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#getNodeAlias, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_getNodeAlias(_aidl_reply)
  }
  fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool> {
    let _aidl_data = self.build_parcel_createRepository(_arg_name)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#createRepository, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_createRepository(_arg_name, _aidl_reply)
  }
  fn r#listRepositories(&self) -> binder::Result<Vec<String>> {
    let _aidl_data = self.build_parcel_listRepositories()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#listRepositories, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_listRepositories(_aidl_reply)
  }
  fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool> {
    let _aidl_data = self.build_parcel_followDevice(_arg_deviceId)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#followDevice, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_followDevice(_arg_deviceId, _aidl_reply)
  }
  fn r#listFollowers(&self) -> binder::Result<Vec<String>> {
    let _aidl_data = self.build_parcel_listFollowers()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#listFollowers, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_listFollowers(_aidl_reply)
  }
  fn r#generatePairingCode(&self) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_generatePairingCode()?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#generatePairingCode, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_generatePairingCode(_aidl_reply)
  }
  fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool> {
    let _aidl_data = self.build_parcel_confirmPairing(_arg_deviceId, _arg_code)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#confirmPairing, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_confirmPairing(_arg_deviceId, _arg_code, _aidl_reply)
  }
  fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()> {
    let _aidl_data = self.build_parcel_unpairDevice(_arg_deviceId)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#unpairDevice, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_unpairDevice(_arg_deviceId, _aidl_reply)
  }
  fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addPost(_arg_content, _arg_title)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addPost, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addPost(_arg_content, _arg_title, _aidl_reply)
  }
  fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addBookmark(_arg_url, _arg_title, _arg_notes)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addBookmark, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addBookmark(_arg_url, _arg_title, _arg_notes, _aidl_reply)
  }
  fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addMediaLink, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath, _aidl_reply)
  }
  fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addPerson(_arg_displayName, _arg_handle)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addPerson, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addPerson(_arg_displayName, _arg_handle, _aidl_reply)
  }
  fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addConversation(_arg_conversationId, _arg_title)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addConversation, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addConversation(_arg_conversationId, _arg_title, _aidl_reply)
  }
  fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String> {
    let _aidl_data = self.build_parcel_addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#addTextNote, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath, _aidl_reply)
  }
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
    let _aidl_data = self.build_parcel_subscribeEvents(_arg_callback)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#subscribeEvents, _aidl_data, binder::binder_impl::FLAG_ONEWAY | binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_subscribeEvents(_arg_callback, _aidl_reply)
  }
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> {
    let _aidl_data = self.build_parcel_unsubscribeEvents(_arg_callback)?;
    let _aidl_reply = self.binder.submit_transact(transactions::r#unsubscribeEvents, _aidl_data, binder::binder_impl::FLAG_ONEWAY | binder::binder_impl::FLAG_PRIVATE_LOCAL);
    self.read_response_unsubscribeEvents(_arg_callback, _aidl_reply)
  }
}
impl<P: binder::BinderAsyncPool> IFoundframeRadicleAsync<P> for BpFoundframeRadicle {
  fn r#getNodeId<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_getNodeId() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#getNodeId, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_getNodeId(_aidl_reply)
      }
    )
  }
  fn r#isNodeRunning<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<bool>> {
    let _aidl_data = match self.build_parcel_isNodeRunning() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#isNodeRunning, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_isNodeRunning(_aidl_reply)
      }
    )
  }
  fn r#getNodeAlias<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_getNodeAlias() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#getNodeAlias, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_getNodeAlias(_aidl_reply)
      }
    )
  }
  fn r#createRepository<'a>(&'a self, _arg_name: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>> {
    let _aidl_data = match self.build_parcel_createRepository(_arg_name) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#createRepository, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_createRepository(_arg_name, _aidl_reply)
      }
    )
  }
  fn r#listRepositories<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<Vec<String>>> {
    let _aidl_data = match self.build_parcel_listRepositories() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#listRepositories, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_listRepositories(_aidl_reply)
      }
    )
  }
  fn r#followDevice<'a>(&'a self, _arg_deviceId: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>> {
    let _aidl_data = match self.build_parcel_followDevice(_arg_deviceId) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#followDevice, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_followDevice(_arg_deviceId, _aidl_reply)
      }
    )
  }
  fn r#listFollowers<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<Vec<String>>> {
    let _aidl_data = match self.build_parcel_listFollowers() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#listFollowers, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_listFollowers(_aidl_reply)
      }
    )
  }
  fn r#generatePairingCode<'a>(&'a self) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_generatePairingCode() {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#generatePairingCode, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_generatePairingCode(_aidl_reply)
      }
    )
  }
  fn r#confirmPairing<'a>(&'a self, _arg_deviceId: &'a str, _arg_code: &'a str) -> binder::BoxFuture<'a, binder::Result<bool>> {
    let _aidl_data = match self.build_parcel_confirmPairing(_arg_deviceId, _arg_code) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#confirmPairing, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_confirmPairing(_arg_deviceId, _arg_code, _aidl_reply)
      }
    )
  }
  fn r#unpairDevice<'a>(&'a self, _arg_deviceId: &'a str) -> binder::BoxFuture<'a, binder::Result<()>> {
    let _aidl_data = match self.build_parcel_unpairDevice(_arg_deviceId) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#unpairDevice, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_unpairDevice(_arg_deviceId, _aidl_reply)
      }
    )
  }
  fn r#addPost<'a>(&'a self, _arg_content: &'a str, _arg_title: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addPost(_arg_content, _arg_title) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addPost, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addPost(_arg_content, _arg_title, _aidl_reply)
      }
    )
  }
  fn r#addBookmark<'a>(&'a self, _arg_url: &'a str, _arg_title: &'a str, _arg_notes: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addBookmark(_arg_url, _arg_title, _arg_notes) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addBookmark, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addBookmark(_arg_url, _arg_title, _arg_notes, _aidl_reply)
      }
    )
  }
  fn r#addMediaLink<'a>(&'a self, _arg_directory: &'a str, _arg_url: &'a str, _arg_title: &'a str, _arg_mimeType: &'a str, _arg_subpath: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addMediaLink, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath, _aidl_reply)
      }
    )
  }
  fn r#addPerson<'a>(&'a self, _arg_displayName: &'a str, _arg_handle: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addPerson(_arg_displayName, _arg_handle) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addPerson, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addPerson(_arg_displayName, _arg_handle, _aidl_reply)
      }
    )
  }
  fn r#addConversation<'a>(&'a self, _arg_conversationId: &'a str, _arg_title: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addConversation(_arg_conversationId, _arg_title) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addConversation, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addConversation(_arg_conversationId, _arg_title, _aidl_reply)
      }
    )
  }
  fn r#addTextNote<'a>(&'a self, _arg_directory: &'a str, _arg_content: &'a str, _arg_title: &'a str, _arg_subpath: &'a str) -> binder::BoxFuture<'a, binder::Result<String>> {
    let _aidl_data = match self.build_parcel_addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return Box::pin(std::future::ready(Err(err))),
    };
    let binder = self.binder.clone();
    P::spawn(
      move || binder.submit_transact(transactions::r#addTextNote, _aidl_data, binder::binder_impl::FLAG_PRIVATE_LOCAL),
      move |_aidl_reply| async move {
        self.read_response_addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath, _aidl_reply)
      }
    )
  }
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> std::future::Ready<binder::Result<()>> {
    let _aidl_data = match self.build_parcel_subscribeEvents(_arg_callback) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return std::future::ready(Err(err)),
    };
    let _aidl_reply = self.binder.submit_transact(transactions::r#subscribeEvents, _aidl_data, binder::binder_impl::FLAG_ONEWAY | binder::binder_impl::FLAG_PRIVATE_LOCAL);
    std::future::ready(self.read_response_subscribeEvents(_arg_callback, _aidl_reply))
  }
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> std::future::Ready<binder::Result<()>> {
    let _aidl_data = match self.build_parcel_unsubscribeEvents(_arg_callback) {
      Ok(_aidl_data) => _aidl_data,
      Err(err) => return std::future::ready(Err(err)),
    };
    let _aidl_reply = self.binder.submit_transact(transactions::r#unsubscribeEvents, _aidl_data, binder::binder_impl::FLAG_ONEWAY | binder::binder_impl::FLAG_PRIVATE_LOCAL);
    std::future::ready(self.read_response_unsubscribeEvents(_arg_callback, _aidl_reply))
  }
}
impl IFoundframeRadicle for binder::binder_impl::Binder<BnFoundframeRadicle> {
  fn r#getNodeId(&self) -> binder::Result<String> { self.0.r#getNodeId() }
  fn r#isNodeRunning(&self) -> binder::Result<bool> { self.0.r#isNodeRunning() }
  fn r#getNodeAlias(&self) -> binder::Result<String> { self.0.r#getNodeAlias() }
  fn r#createRepository(&self, _arg_name: &str) -> binder::Result<bool> { self.0.r#createRepository(_arg_name) }
  fn r#listRepositories(&self) -> binder::Result<Vec<String>> { self.0.r#listRepositories() }
  fn r#followDevice(&self, _arg_deviceId: &str) -> binder::Result<bool> { self.0.r#followDevice(_arg_deviceId) }
  fn r#listFollowers(&self) -> binder::Result<Vec<String>> { self.0.r#listFollowers() }
  fn r#generatePairingCode(&self) -> binder::Result<String> { self.0.r#generatePairingCode() }
  fn r#confirmPairing(&self, _arg_deviceId: &str, _arg_code: &str) -> binder::Result<bool> { self.0.r#confirmPairing(_arg_deviceId, _arg_code) }
  fn r#unpairDevice(&self, _arg_deviceId: &str) -> binder::Result<()> { self.0.r#unpairDevice(_arg_deviceId) }
  fn r#addPost(&self, _arg_content: &str, _arg_title: &str) -> binder::Result<String> { self.0.r#addPost(_arg_content, _arg_title) }
  fn r#addBookmark(&self, _arg_url: &str, _arg_title: &str, _arg_notes: &str) -> binder::Result<String> { self.0.r#addBookmark(_arg_url, _arg_title, _arg_notes) }
  fn r#addMediaLink(&self, _arg_directory: &str, _arg_url: &str, _arg_title: &str, _arg_mimeType: &str, _arg_subpath: &str) -> binder::Result<String> { self.0.r#addMediaLink(_arg_directory, _arg_url, _arg_title, _arg_mimeType, _arg_subpath) }
  fn r#addPerson(&self, _arg_displayName: &str, _arg_handle: &str) -> binder::Result<String> { self.0.r#addPerson(_arg_displayName, _arg_handle) }
  fn r#addConversation(&self, _arg_conversationId: &str, _arg_title: &str) -> binder::Result<String> { self.0.r#addConversation(_arg_conversationId, _arg_title) }
  fn r#addTextNote(&self, _arg_directory: &str, _arg_content: &str, _arg_title: &str, _arg_subpath: &str) -> binder::Result<String> { self.0.r#addTextNote(_arg_directory, _arg_content, _arg_title, _arg_subpath) }
  fn r#subscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> { self.0.r#subscribeEvents(_arg_callback) }
  fn r#unsubscribeEvents(&self, _arg_callback: &binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback>) -> binder::Result<()> { self.0.r#unsubscribeEvents(_arg_callback) }
}
fn on_transact(_aidl_service: &dyn IFoundframeRadicle, _aidl_code: binder::binder_impl::TransactionCode, _aidl_data: &binder::binder_impl::BorrowedParcel<'_>, _aidl_reply: &mut binder::binder_impl::BorrowedParcel<'_>) -> std::result::Result<(), binder::StatusCode> {
  match _aidl_code {
    transactions::r#getNodeId => {
      let _aidl_return = _aidl_service.r#getNodeId();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#isNodeRunning => {
      let _aidl_return = _aidl_service.r#isNodeRunning();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#getNodeAlias => {
      let _aidl_return = _aidl_service.r#getNodeAlias();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#createRepository => {
      let _arg_name: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#createRepository(&_arg_name);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#listRepositories => {
      let _aidl_return = _aidl_service.r#listRepositories();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#followDevice => {
      let _arg_deviceId: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#followDevice(&_arg_deviceId);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#listFollowers => {
      let _aidl_return = _aidl_service.r#listFollowers();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#generatePairingCode => {
      let _aidl_return = _aidl_service.r#generatePairingCode();
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#confirmPairing => {
      let _arg_deviceId: String = _aidl_data.read()?;
      let _arg_code: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#confirmPairing(&_arg_deviceId, &_arg_code);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#unpairDevice => {
      let _arg_deviceId: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#unpairDevice(&_arg_deviceId);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addPost => {
      let _arg_content: String = _aidl_data.read()?;
      let _arg_title: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addPost(&_arg_content, &_arg_title);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addBookmark => {
      let _arg_url: String = _aidl_data.read()?;
      let _arg_title: String = _aidl_data.read()?;
      let _arg_notes: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addBookmark(&_arg_url, &_arg_title, &_arg_notes);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addMediaLink => {
      let _arg_directory: String = _aidl_data.read()?;
      let _arg_url: String = _aidl_data.read()?;
      let _arg_title: String = _aidl_data.read()?;
      let _arg_mimeType: String = _aidl_data.read()?;
      let _arg_subpath: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addMediaLink(&_arg_directory, &_arg_url, &_arg_title, &_arg_mimeType, &_arg_subpath);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addPerson => {
      let _arg_displayName: String = _aidl_data.read()?;
      let _arg_handle: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addPerson(&_arg_displayName, &_arg_handle);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addConversation => {
      let _arg_conversationId: String = _aidl_data.read()?;
      let _arg_title: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addConversation(&_arg_conversationId, &_arg_title);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#addTextNote => {
      let _arg_directory: String = _aidl_data.read()?;
      let _arg_content: String = _aidl_data.read()?;
      let _arg_title: String = _aidl_data.read()?;
      let _arg_subpath: String = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#addTextNote(&_arg_directory, &_arg_content, &_arg_title, &_arg_subpath);
      match &_aidl_return {
        Ok(_aidl_return) => {
          _aidl_reply.write(&binder::Status::from(binder::StatusCode::OK))?;
          _aidl_reply.write(_aidl_return)?;
        }
        Err(_aidl_status) => _aidl_reply.write(_aidl_status)?
      }
      Ok(())
    }
    transactions::r#subscribeEvents => {
      let _arg_callback: binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback> = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#subscribeEvents(&_arg_callback);
      Ok(())
    }
    transactions::r#unsubscribeEvents => {
      let _arg_callback: binder::Strong<dyn crate::mangled::_2_ty_9_circulari_3_o19_14_IEventCallback> = _aidl_data.read()?;
      let _aidl_return = _aidl_service.r#unsubscribeEvents(&_arg_callback);
      Ok(())
    }
    _ => Err(binder::StatusCode::UNKNOWN_TRANSACTION)
  }
}
pub(crate) mod mangled {
 pub use super::r#IFoundframeRadicle as _2_ty_9_circulari_3_o19_18_IFoundframeRadicle;
}
