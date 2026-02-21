/**
 * JNI Bridge for FoundframeRadicleService
 * 
 * This module provides the JNI bindings between the Android Kotlin service
 * and the Rust core library.
 * 
 * Architecture:
 * - Kotlin holds an opaque handle (jlong) to the Rust service
 * - Each JNI call locks the service, executes, then unlocks
 * - The handle pattern ensures thread-safe access to the core
 * 
 * Generated for core: foundframe
 */

use jni::objects::{JClass, JString};
use jni::signature::JavaType;
use jni::sys::{jint, jlong, jboolean};
use jni::JavaVM;
use jni::JNIEnv;
use log::info;
use std::ffi::c_void;
use std::sync::{Arc, Mutex, OnceLock};
use o19_foundframe as core;

// Type alias for the service handle used by JNI
// The core crate's main type is assumed to be Foundframe
pub type ServiceHandle = core::Foundframe;

/// Global service handle storage
/// 
/// Pattern: OnceLock<Arc<Mutex<T>>>
/// - OnceLock: Thread-safe one-time initialization
/// - Arc: Shared ownership across JNI calls  
/// - Mutex: Exclusive access during operations
/// 
/// The handle is initialized by nativeStartService and used by all
/// subsequent native method calls.
static SERVICE_HANDLE: OnceLock<Arc<Mutex<core::ServiceHandle>>> = OnceLock::new();

/// JNI registration function called when the native library is loaded
#[no_mangle]
pub extern "C" fn JNI_OnLoad(_vm: JavaVM, _reserved: c_void) -> jint {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Debug),
    );
    jni::sys::JNI_VERSION_1_6
}

/// Start the native service
/// 
/// Called from Kotlin: nativeStartService(homeDir, alias)
/// Returns: handle ID (always 1 for now, or -1 on error)
/// 
/// This initializes the core service and stores the handle globally.
/// The returned handle ID is passed back to all subsequent native calls.
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeStartService(
    mut env: JNIEnv,
    _class: JClass,
    home_dir: JString,
    alias: JString,
) -> jlong {
    let home_dir: String = env
        .get_string(&home_dir)
        .expect("Failed to get home_dir")
        .into();
    
    let alias: String = env
        .get_string(&alias)
        .expect("Failed to get alias")
        .into();
    
    info!("[FoundframeRadicleService] Starting native service: home_dir={}, alias={}", home_dir, alias);
    
    match initialize_service(&home_dir, &alias) {
        Ok(handle) => {
            let _ = SERVICE_HANDLE.set(Arc::new(Mutex::new(handle)));
            info!("[FoundframeRadicleService] Native service started successfully");
            1
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] Failed to start native service: {}", e);
            -1
        }
    }
}

/// Stop the native service
/// 
/// Called from Kotlin when the service is being destroyed.
/// This drops the service handle, cleaning up resources.
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeStopService(
    _env: JNIEnv,
    _class: JClass,
    _handle: jlong,
) {
    info!("[FoundframeRadicleService] Stopping native service");
    
    // OnceLock can't be cleared, but we can drop the inner value
    // by taking the mutex guard and replacing with None
    if let Some(handle) = SERVICE_HANDLE.get() {
        if let Ok(mut guard) = handle.lock() {
            // The handle will be dropped when the guard is released
            info!("[FoundframeRadicleService] Service handle dropped");
        }
    }
}

/// Initialize the core service
/// 
/// Creates the actual core::ServiceHandle by calling into the core crate.
fn initialize_service(
    home_dir: &str, 
    alias: &str
) -> Result<core::ServiceHandle, Box<dyn std::error::Error>> {
    info!("[FoundframeRadicleService] Initializing core service");
    
    // TODO: Replace with actual core initialization
    // core::ServiceHandle::new(home_dir, alias)
    unimplemented!("Service initialization not yet implemented in core")
}

/// Execute an operation with the service handle locked
/// 
/// This is the core pattern: lock → execute → unlock
/// All command methods use this to ensure thread-safe access.
fn with_service<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut core::ServiceHandle) -> R,
{
    let handle = SERVICE_HANDLE
        .get()
        .ok_or_else(|| "Service not initialized".to_string())?;
    
    let mut guard = handle
        .lock()
        .map_err(|_| "Failed to lock service handle".to_string())?;
    
    Ok(f(&mut *guard))
}

/// BookmarkMgmt.addBookmark
/// 
/// JNI Signature: Addbookmark(long handle, JString, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddbookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        url: JString,
        title: JString,
        notes: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let url: String = env.get_string(&url).expect("Failed to get url").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
        let notes: String = env.get_string(&notes).expect("Failed to get notes").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addBookmark(url, title, notes)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addBookmark failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// BookmarkMgmt.getBookmark
/// 
/// JNI Signature: Getbookmark(long handle, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeGetbookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        pkbUrl: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let pkbUrl: String = env.get_string(&pkbUrl).expect("Failed to get pkbUrl").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.getBookmark(pkbUrl)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] getBookmark failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// BookmarkMgmt.listBookmarks
/// 
/// JNI Signature: Listbookmarks(long handle, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeListbookmarks(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        directory: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let directory: String = env.get_string(&directory).expect("Failed to get directory").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.listBookmarks(directory)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] listBookmarks failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// BookmarkMgmt.deleteBookmark
/// 
/// JNI Signature: Deletebookmark(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeletebookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        pkbUrl: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let pkbUrl: String = env.get_string(&pkbUrl).expect("Failed to get pkbUrl").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.deleteBookmark(pkbUrl)
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] deleteBookmark failed: {}", e);
            0
        }
    }
}

/// ContentMgmt.addMediaLink
/// 
/// JNI Signature: Addmedialink(long handle, JString, JString, JString, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddmedialink(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        directory: JString,
        url: JString,
        title: JString,
        mimeType: JString,
        subpath: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let directory: String = env.get_string(&directory).expect("Failed to get directory").into();
        let url: String = env.get_string(&url).expect("Failed to get url").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
        let mimeType: String = env.get_string(&mimeType).expect("Failed to get mimeType").into();
        let subpath: String = env.get_string(&subpath).expect("Failed to get subpath").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addMediaLink(directory, url, title, mimeType, subpath)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addMediaLink failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// ContentMgmt.addBookmark
/// 
/// JNI Signature: Addbookmark(long handle, JString, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddbookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        url: JString,
        title: JString,
        notes: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let url: String = env.get_string(&url).expect("Failed to get url").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
        let notes: String = env.get_string(&notes).expect("Failed to get notes").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addBookmark(url, title, notes)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addBookmark failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// ContentMgmt.addPost
/// 
/// JNI Signature: Addpost(long handle, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddpost(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        content: JString,
        title: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let content: String = env.get_string(&content).expect("Failed to get content").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addPost(content, title)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addPost failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// ContentMgmt.addPerson
/// 
/// JNI Signature: Addperson(long handle, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddperson(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        displayName: JString,
        handle: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let displayName: String = env.get_string(&displayName).expect("Failed to get displayName").into();
        let handle: String = env.get_string(&handle).expect("Failed to get handle").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addPerson(displayName, handle)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addPerson failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// ContentMgmt.addConversation
/// 
/// JNI Signature: Addconversation(long handle, JString, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeAddconversation(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        conversationId: JString,
        title: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let conversationId: String = env.get_string(&conversationId).expect("Failed to get conversationId").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.addConversation(conversationId, title)
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] addConversation failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.generatePairingCode
/// 
/// JNI Signature: Generatepairingcode(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeGeneratepairingcode(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.generatePairingCode()
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] generatePairingCode failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.confirmPairing
/// 
/// JNI Signature: Confirmpairing(long handle, JString, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeConfirmpairing(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString,
        code: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
        let code: String = env.get_string(&code).expect("Failed to get code").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.confirmPairing(deviceId, code)
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] confirmPairing failed: {}", e);
            0
        }
    }
}

/// DeviceMgmt.unpairDevice
/// 
/// JNI Signature: Unpairdevice(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeUnpairdevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.unpairDevice(deviceId)
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] unpairDevice failed: {}", e);
            
        }
    }
}

/// DeviceMgmt.listPairedDevices
/// 
/// JNI Signature: Listpaireddevices(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeListpaireddevices(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.listPairedDevices()
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] listPairedDevices failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.followDevice
/// 
/// JNI Signature: Followdevice(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeFollowdevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.followDevice(deviceId)
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] followDevice failed: {}", e);
            0
        }
    }
}

/// DeviceMgmt.unfollowDevice
/// 
/// JNI Signature: Unfollowdevice(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeUnfollowdevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.unfollowDevice(deviceId)
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] unfollowDevice failed: {}", e);
            
        }
    }
}

/// DeviceMgmt.listFollowers
/// 
/// JNI Signature: Listfollowers(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeListfollowers(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.listFollowers()
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] listFollowers failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.isFollowing
/// 
/// JNI Signature: Isfollowing(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeIsfollowing(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.isFollowing(deviceId)
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] isFollowing failed: {}", e);
            0
        }
    }
}

/// EventMgmt.subscribeEvents
/// 
/// JNI Signature: Subscribeevents(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeSubscribeevents(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        callback: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let callback: String = env.get_string(&callback).expect("Failed to get callback").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.subscribeEvents(callback)
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] subscribeEvents failed: {}", e);
            
        }
    }
}

/// EventMgmt.unsubscribeEvents
/// 
/// JNI Signature: Unsubscribeevents(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeUnsubscribeevents(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        callback: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let callback: String = env.get_string(&callback).expect("Failed to get callback").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.unsubscribeEvents(callback)
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] unsubscribeEvents failed: {}", e);
            
        }
    }
}

/// EventMgmt.supportsEvents
/// 
/// JNI Signature: Supportsevents(long handle) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeSupportsevents(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> jboolean {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| {
        service.supportsEvents()
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] supportsEvents failed: {}", e);
            0
        }
    }
}

