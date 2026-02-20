//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn EventMgmt + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: EventMgmt + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn EventMgmt + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait EventMgmt: Send + Sync {
    fn subscribe_events(&self, callback: &IEventCallback) -> ();
    fn unsubscribe_events(&self, callback: &IEventCallback) -> ();
    fn supports_events(&self) -> Result<bool, Box<dyn std::error::Error>>;
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventMgmt_nativeSubscribeEvents(
    mut env: JNIEnv,
    _class: JClass,
    callback: JObject,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let callback_rust = unimplemented!("Complex type conversion");
    service.subscribe_events(callback_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventMgmt_nativeUnsubscribeEvents(
    mut env: JNIEnv,
    _class: JClass,
    callback: JObject,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let callback_rust = unimplemented!("Complex type conversion");
    service.unsubscribe_events(callback_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventMgmt_nativeSupportsEvents(
    mut env: JNIEnv,
    _class: JClass,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let result = service.supports_events();
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_EventMgmtClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
