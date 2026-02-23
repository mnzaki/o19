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

/// BookmarkMgmt.bookmark_addBookmark
/// 
/// JNI Signature: BookmarkAddBookmark(long handle, JString, JString, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeBookmarkAddBookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        url: JString,
        title: JString,
        notes: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let url: String = env.get_string(&url).expect("Failed to get url").into();
        let title: String = env.get_string(&title).expect("Failed to get title").into();
        let notes: String = env.get_string(&notes).expect("Failed to get notes").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.thestream.as_ref().ok_or("thestream not initialized")?;
                let mut __service = __field.lock().map_err(|_| "thestream mutex poisoned")?;
                Ok(__service.add_bookmark(url, title, notes))
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] bookmark_add_bookmark failed: {}", e);
            
        }
    }
}

/// BookmarkMgmt.bookmark_getBookmarkByUrl
/// 
/// JNI Signature: BookmarkGetBookmarkByUrl(long handle, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeBookmarkGetBookmarkByUrl(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        pkbUrl: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let pkbUrl: String = env.get_string(&pkbUrl).expect("Failed to get pkbUrl").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.thestream.as_ref().ok_or("thestream not initialized")?;
                let mut __service = __field.lock().map_err(|_| "thestream mutex poisoned")?;
                Ok(__service.get_bookmark_by_url(pkbUrl))
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] bookmark_get_bookmark_by_url failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// BookmarkMgmt.bookmark_listBookmarks
/// 
/// JNI Signature: BookmarkListBookmarks(long handle, JString) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeBookmarkListBookmarks(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        directory: JString
    
) -> JString {
    
    // Convert JNI parameters to Rust types
        let directory: String = env.get_string(&directory).expect("Failed to get directory").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.thestream.as_ref().ok_or("thestream not initialized")?;
                let mut __service = __field.lock().map_err(|_| "thestream mutex poisoned")?;
                Ok(__service.list_bookmarks(directory))
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] bookmark_list_bookmarks failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// BookmarkMgmt.bookmark_deleteBookmark
/// 
/// JNI Signature: BookmarkDeleteBookmark(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeBookmarkDeleteBookmark(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        pkbUrl: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let pkbUrl: String = env.get_string(&pkbUrl).expect("Failed to get pkbUrl").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.thestream.as_ref().ok_or("thestream not initialized")?;
                let mut __service = __field.lock().map_err(|_| "thestream mutex poisoned")?;
                Ok(__service.delete_bookmark(pkbUrl))
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] bookmark_delete_bookmark failed: {}", e);
            0
        }
    }
}

/// DeviceMgmt.device_generatePairingCode
/// 
/// JNI Signature: DeviceGeneratePairingCode(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceGeneratePairingCode(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.generate_pairing_code())
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_generate_pairing_code failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.device_confirmPairing
/// 
/// JNI Signature: DeviceConfirmPairing(long handle, JString, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceConfirmPairing(
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
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.confirm_pairing(deviceId, code))
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_confirm_pairing failed: {}", e);
            0
        }
    }
}

/// DeviceMgmt.device_unpairDevice
/// 
/// JNI Signature: DeviceUnpairDevice(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceUnpairDevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.unpair_device(deviceId))
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_unpair_device failed: {}", e);
            
        }
    }
}

/// DeviceMgmt.device_listPairedDevices
/// 
/// JNI Signature: DeviceListPairedDevices(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceListPairedDevices(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.list_paired_devices())
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_list_paired_devices failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.device_followDevice
/// 
/// JNI Signature: DeviceFollowDevice(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceFollowDevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.follow_device(deviceId))
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_follow_device failed: {}", e);
            0
        }
    }
}

/// DeviceMgmt.device_unfollowDevice
/// 
/// JNI Signature: DeviceUnfollowDevice(long handle, JString) -> ()
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceUnfollowDevice(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> () {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.unfollow_device(deviceId))
    }) {
        Ok(result) => {
            
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_unfollow_device failed: {}", e);
            
        }
    }
}

/// DeviceMgmt.device_listFollowers
/// 
/// JNI Signature: DeviceListFollowers(long handle) -> JString
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceListFollowers(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
    
) -> JString {
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.list_followers())
    }) {
        Ok(result) => {
            env.new_string(&result).expect("Failed to create Java string").into_raw()
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_list_followers failed: {}", e);
            std::ptr::null_mut()
        }
    }
}

/// DeviceMgmt.device_isFollowing
/// 
/// JNI Signature: DeviceIsFollowing(long handle, JString) -> jboolean
/// 
/// This function:
/// 1. Locks the service handle (Mutex::lock)
/// 2. Calls the core method on the handle
/// 3. Converts the result to JNI types
/// 4. Unlocks the handle (when guard drops)
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleService_nativeDeviceIsFollowing(
    mut env: JNIEnv,
    _class: JClass,
    _handle: jlong,
        deviceId: JString
    
) -> jboolean {
    
    // Convert JNI parameters to Rust types
        let deviceId: String = env.get_string(&deviceId).expect("Failed to get deviceId").into();
    
    
    
    // Lock handle → execute → unlock
    match with_service(|service| -> Result<_, String> {
        // Access service field with proper error handling
                let __field = service.device_manager.as_ref().ok_or("device_manager not initialized")?;
                let mut __service = __field.lock().map_err(|_| "device_manager mutex poisoned")?;
                Ok(__service.is_following(deviceId))
    }) {
        Ok(result) => {
            result as jboolean
        }
        Err(e) => {
            log::error!("[FoundframeRadicleService] device_is_following failed: {}", e);
            0
        }
    }
}

