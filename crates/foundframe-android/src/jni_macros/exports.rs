//! Macros for exporting Rust functions to Java

/// Export a Rust function as a JNI native method
///
/// # Syntax
/// ```rust,ignore
/// #[jni_export("java.package.ClassName", "methodName")]
/// fn rust_function_name(env: JNIEnv, class: JClass, ...) -> ...
/// ```
///
/// # Example
/// ```rust,ignore
/// #[jni_export("ty.circulari.o19.service.FoundframeRadicleService", "nativeAddPost")]
/// fn native_add_post(
///     mut env: JNIEnv,
///     _class: JClass,
///     content: JString,
///     title: JString,
/// ) -> jstring {
///     // Implementation
/// }
/// ```
pub use jni::objects::{JClass, JString};
pub use jni::sys::{jboolean, jint, jlong, jstring};
pub use jni::JNIEnv;

/// Convert a Java class path to JNI-mangled name
pub fn jni_mangle_class(class: &str) -> String {
    class.replace('.', "_")
}

/// Helper macro to convert JNI arguments
#[macro_export]
macro_rules! jni_arg {
    // Convert JString to String
    ($env:expr, $arg:ident: String) => {
        $env.get_string(&$arg)
            .expect("Invalid UTF-8 in string argument")
            .to_string()
    };
    
    // Convert JString to &str (requires lifetime management)
    ($env:expr, $arg:ident: &str) => {
        $env.get_string(&$arg)
            .expect("Invalid UTF-8 in string argument")
            .to_str()
            .expect("Invalid UTF-8")
    };
    
    // Pass through primitives
    ($env:expr, $arg:ident: bool) => { $arg != 0 };
    ($env:expr, $arg:ident: i32) => { $arg };
    ($env:expr, $arg:ident: i64) => { $arg };
}

/// Helper macro to convert Rust result to JNI return value
#[macro_export]
macro_rules! jni_ret {
    // String to jstring
    ($env:expr, $result:expr => String) => {{
        match $result {
            Ok(s) => {
                let jstring = $env.new_string(s)
                    .expect("Failed to create Java string");
                jstring.into_raw()
            }
            Err(e) => {
                $env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                    .ok();
                std::ptr::null_mut()
            }
        }
    }};
    
    // &str to jstring
    ($env:expr, $result:expr => &str) => {{
        match $result {
            Ok(s) => {
                let jstring = $env.new_string(s)
                    .expect("Failed to create Java string");
                jstring.into_raw()
            }
            Err(e) => {
                $env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                    .ok();
                std::ptr::null_mut()
            }
        }
    }};
    
    // bool to jboolean
    ($env:expr, $result:expr => bool) => {{
        match $result {
            Ok(b) => b as jni::sys::jboolean,
            Err(e) => {
                $env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                    .ok();
                0
            }
        }
    }};
    
    // i32 to jint
    ($env:expr, $result:expr => i32) => {{
        match $result {
            Ok(i) => i,
            Err(e) => {
                $env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                    .ok();
                0
            }
        }
    }};
    
    // () to void
    ($env:expr, $result:expr => ()) => {{
        if let Err(e) = $result {
            $env.throw_new("java/lang/RuntimeException", &format!("{}", e))
                .ok();
        }
    }};
}

/// Get the service instance or throw Java exception
#[macro_export]
macro_rules! with_service_or_throw {
    ($env:expr) => {
        match $crate::aidl_service::get_service() {
            Some(s) => s,
            None => {
                $env.throw_new("java/lang/IllegalStateException", "Service not initialized")
                    .ok();
                return std::ptr::null_mut();
            }
        }
    };
}

// Re-export
pub use crate::jni_arg;
pub use crate::jni_ret;
pub use crate::with_service_or_throw;
