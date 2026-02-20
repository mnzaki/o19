//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn DeviceMgmt + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: DeviceMgmt + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn DeviceMgmt + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait DeviceMgmt: Send + Sync {
    fn generate_pairing_code(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn confirm_pairing(
        &self,
        deviceId: &str,
        code: &str,
    ) -> Result<bool, Box<dyn std::error::Error>>;
    fn unpair_device(&self, deviceId: &str) -> ();
    fn list_paired_devices(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn follow_device(&self, deviceId: &str) -> Result<bool, Box<dyn std::error::Error>>;
    fn unfollow_device(&self, deviceId: &str) -> ();
    fn list_followers(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn is_following(&self, deviceId: &str) -> Result<bool, Box<dyn std::error::Error>>;
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeGeneratePairingCode(
    mut env: JNIEnv,
    _class: JClass,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let result = service.generate_pairing_code();
    match result {
        Ok(s) => {
            let jstring = env.new_string(s).expect("Failed to create Java string");
            jstring.into_raw()
        }
        Err(e) => {
            env.throw_new("java/lang/RuntimeException", &format!("{}", e)).ok();
            std::ptr::null_mut()
        }
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeConfirmPairing(
    mut env: JNIEnv,
    _class: JClass,
    deviceId: JString,
    code: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let deviceId_rust: String = env.get_string(&deviceId).expect("Invalid UTF-8").into();
    let code_rust: String = env.get_string(&code).expect("Invalid UTF-8").into();
    let result = service.confirm_pairing(deviceId_rust, code_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeUnpairDevice(
    mut env: JNIEnv,
    _class: JClass,
    deviceId: JString,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let deviceId_rust: String = env.get_string(&deviceId).expect("Invalid UTF-8").into();
    service.unpair_device(deviceId_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeListPairedDevices(
    mut env: JNIEnv,
    _class: JClass,
) -> jobject {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let result = service.list_paired_devices();
    unimplemented!("Complex return type conversion")
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeFollowDevice(
    mut env: JNIEnv,
    _class: JClass,
    deviceId: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let deviceId_rust: String = env.get_string(&deviceId).expect("Invalid UTF-8").into();
    let result = service.follow_device(deviceId_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeUnfollowDevice(
    mut env: JNIEnv,
    _class: JClass,
    deviceId: JString,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let deviceId_rust: String = env.get_string(&deviceId).expect("Invalid UTF-8").into();
    service.unfollow_device(deviceId_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeListFollowers(
    mut env: JNIEnv,
    _class: JClass,
) -> jobject {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let result = service.list_followers();
    unimplemented!("Complex return type conversion")
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IDeviceMgmt_nativeIsFollowing(
    mut env: JNIEnv,
    _class: JClass,
    deviceId: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let deviceId_rust: String = env.get_string(&deviceId).expect("Invalid UTF-8").into();
    let result = service.is_following(deviceId_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_DeviceMgmtClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
