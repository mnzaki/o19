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
    fn on_event(&self, eventJson: &str) -> ();
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IEventCallback_nativeOnEvent(
    mut env: JNIEnv,
    _class: JClass,
    eventJson: JString,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    let eventJson_rust: String = env
        .get_string(&eventJson)
        .expect("Invalid UTF-8")
        .into();
    service.on_event(eventJson_rust);
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
