//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn EventCallback + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: EventCallback + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn EventCallback + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait EventCallback: Send + Sync {
    fn on_event(&self, eventType: &str, eventData: &str) -> ();
    fn on_status_change(&self, status: &str, details: &str) -> ();
    fn on_sync_complete(&self, repositoryId: &str, success: bool) -> ();
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventCallback_nativeOnEvent(
    mut env: JNIEnv,
    _class: JClass,
    eventType: JString,
    eventData: JString,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let eventType_rust: String = env
        .get_string(&eventType)
        .expect("Invalid UTF-8")
        .into();
    let eventData_rust: String = env
        .get_string(&eventData)
        .expect("Invalid UTF-8")
        .into();
    service.on_event(eventType_rust, eventData_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventCallback_nativeOnStatusChange(
    mut env: JNIEnv,
    _class: JClass,
    status: JString,
    details: JString,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let status_rust: String = env.get_string(&status).expect("Invalid UTF-8").into();
    let details_rust: String = env.get_string(&details).expect("Invalid UTF-8").into();
    service.on_status_change(status_rust, details_rust);
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventCallback_nativeOnSyncComplete(
    mut env: JNIEnv,
    _class: JClass,
    repositoryId: JString,
    success: jboolean,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let repositoryId_rust: String = env
        .get_string(&repositoryId)
        .expect("Invalid UTF-8")
        .into();
    let success_rust = success != 0;
    service.on_sync_complete(repositoryId_rust, success_rust);
}
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_EventCallbackClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
