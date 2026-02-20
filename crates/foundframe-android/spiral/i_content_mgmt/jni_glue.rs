//! Auto-generated JNI glue code
//! DO NOT EDIT MANUALLY - Generated from AIDL
use jni::objects::{JClass, JObject, JString};
use jni::sys::{jboolean, jbyte, jchar, jdouble, jfloat, jint, jlong, jshort, jstring};
use jni::JNIEnv;
use std::sync::OnceLock;
/// Global service instance
static SERVICE_INSTANCE: OnceLock<std::sync::Arc<dyn ContentMgmt + Send + Sync>> = OnceLock::new();
/// Initialize the service instance
pub fn init_service<S>(service: S)
where
    S: ContentMgmt + Send + Sync + 'static,
{
    let _ = SERVICE_INSTANCE.set(std::sync::Arc::new(service));
}
/// Get the service instance
fn get_service() -> Option<std::sync::Arc<dyn ContentMgmt + Send + Sync>> {
    SERVICE_INSTANCE.get().cloned()
}
/// Service trait - implement this for your service
pub trait ContentMgmt: Send + Sync {
    fn add_media_link(
        &self,
        directory: &str,
        url: &str,
        title: &str,
        mimeType: &str,
        subpath: &str,
    ) -> Result<String, Box<dyn std::error::Error>>;
    fn add_bookmark(
        &self,
        url: &str,
        title: &str,
        notes: &str,
    ) -> Result<String, Box<dyn std::error::Error>>;
    fn add_post(
        &self,
        content: &str,
        title: &str,
    ) -> Result<String, Box<dyn std::error::Error>>;
    fn add_person(
        &self,
        displayName: &str,
        handle: &str,
    ) -> Result<String, Box<dyn std::error::Error>>;
    fn add_conversation(
        &self,
        conversationId: &str,
        title: &str,
    ) -> Result<String, Box<dyn std::error::Error>>;
}
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_IContentMgmt_nativeAddMediaLink(
    mut env: JNIEnv,
    _class: JClass,
    directory: JString,
    url: JString,
    title: JString,
    mimeType: JString,
    subpath: JString,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let directory_rust: String = env
        .get_string(&directory)
        .expect("Invalid UTF-8")
        .into();
    let url_rust: String = env.get_string(&url).expect("Invalid UTF-8").into();
    let title_rust: String = env.get_string(&title).expect("Invalid UTF-8").into();
    let mimeType_rust: String = env.get_string(&mimeType).expect("Invalid UTF-8").into();
    let subpath_rust: String = env.get_string(&subpath).expect("Invalid UTF-8").into();
    let result = service
        .add_media_link(
            directory_rust,
            url_rust,
            title_rust,
            mimeType_rust,
            subpath_rust,
        );
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
pub extern "C" fn Java_ty_circulari_o19_IContentMgmt_nativeAddBookmark(
    mut env: JNIEnv,
    _class: JClass,
    url: JString,
    title: JString,
    notes: JString,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let url_rust: String = env.get_string(&url).expect("Invalid UTF-8").into();
    let title_rust: String = env.get_string(&title).expect("Invalid UTF-8").into();
    let notes_rust: String = env.get_string(&notes).expect("Invalid UTF-8").into();
    let result = service.add_bookmark(url_rust, title_rust, notes_rust);
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
pub extern "C" fn Java_ty_circulari_o19_IContentMgmt_nativeAddPost(
    mut env: JNIEnv,
    _class: JClass,
    content: JString,
    title: JString,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let content_rust: String = env.get_string(&content).expect("Invalid UTF-8").into();
    let title_rust: String = env.get_string(&title).expect("Invalid UTF-8").into();
    let result = service.add_post(content_rust, title_rust);
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
pub extern "C" fn Java_ty_circulari_o19_IContentMgmt_nativeAddPerson(
    mut env: JNIEnv,
    _class: JClass,
    displayName: JString,
    handle: JString,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let displayName_rust: String = env
        .get_string(&displayName)
        .expect("Invalid UTF-8")
        .into();
    let handle_rust: String = env.get_string(&handle).expect("Invalid UTF-8").into();
    let result = service.add_person(displayName_rust, handle_rust);
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
pub extern "C" fn Java_ty_circulari_o19_IContentMgmt_nativeAddConversation(
    mut env: JNIEnv,
    _class: JClass,
    conversationId: JString,
    title: JString,
) -> jstring {
    let service = match get_service() {
        Some(s) => s,
        None => {
            env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                .ok();
            return std::ptr::null_mut();
        }
    };
    let conversationId_rust: String = env
        .get_string(&conversationId)
        .expect("Invalid UTF-8")
        .into();
    let title_rust: String = env.get_string(&title).expect("Invalid UTF-8").into();
    let result = service.add_conversation(conversationId_rust, title_rust);
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
/// JNI helper: Check if service is running
/// Called from Java: {}Client.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_ContentMgmtClient_isServiceRunning(
    _env: JNIEnv,
    _class: JClass,
) -> jboolean {
    1
}
