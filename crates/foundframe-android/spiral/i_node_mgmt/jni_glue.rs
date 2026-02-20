//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn NodeMgmt + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: NodeMgmt + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn NodeMgmt + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait NodeMgmt: Send + Sync {
    fn get_node_id(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn is_node_running(&self) -> Result<bool, Box<dyn std::error::Error>>;
    fn get_node_alias(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn start_node(&self, alias: &str) -> Result<bool, Box<dyn std::error::Error>>;
    fn stop_node(&self) -> ();
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_INodeMgmt_nativeGetNodeId(
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
    let result = service.get_node_id();
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
pub extern "C" fn Java_ty_circulari_o19_INodeMgmt_nativeIsNodeRunning(
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
    let result = service.is_node_running();
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_INodeMgmt_nativeGetNodeAlias(
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
    let result = service.get_node_alias();
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
pub extern "C" fn Java_ty_circulari_o19_INodeMgmt_nativeStartNode(
    mut env: JNIEnv,
    _class: JClass,
    alias: JString,
) -> jboolean {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return 0;
        }
    };
    let alias_rust: String = env.get_string(&alias).expect("Invalid UTF-8").into();
    let result = service.start_node(alias_rust);
    match result {
        Ok(v) => v as jboolean,
        Err(_) => 0,
    }
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_INodeMgmt_nativeStopNode(
    mut env: JNIEnv,
    _class: JClass,
) {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return;
        }
    };
    service.stop_node();
}
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_NodeMgmtClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
