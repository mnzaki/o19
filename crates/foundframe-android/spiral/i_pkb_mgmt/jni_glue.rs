//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn PkbMgmt + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: PkbMgmt + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn PkbMgmt + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait PkbMgmt: Send + Sync {
    fn create_repository(&self, name: &str) -> Result<bool, Box<dyn std::error::Error>>;
    fn list_repositories(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn get_default_repository(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn set_default_repository(
        &self,
        name: &str,
    ) -> Result<bool, Box<dyn std::error::Error>>;
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IPkbMgmt_nativeCreateRepository(
    mut env: JNIEnv,
    _class: JClass,
    name: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let name_rust: String = env.get_string(&name).expect("Invalid UTF-8").into();
    let result = service.create_repository(name_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IPkbMgmt_nativeListRepositories(
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
    let result = service.list_repositories();
    unimplemented!("Complex return type conversion")
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IPkbMgmt_nativeGetDefaultRepository(
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
    let result = service.get_default_repository();
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
pub extern "C" fn Java_ty_circulari_o19_IPkbMgmt_nativeSetDefaultRepository(
    mut env: JNIEnv,
    _class: JClass,
    name: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let name_rust: String = env.get_string(&name).expect("Invalid UTF-8").into();
    let result = service.set_default_repository(name_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_PkbMgmtClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
