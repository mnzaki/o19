//! JNI Macro System
//!
//! Provides ergonomic macros for JNI bindings between Rust and Java.
//!
//! # Examples
//!
//! ## Calling Java from Rust:
//! ```rust,ignore
//! use android::{java_call, jni_sig};
//!
//! // Call a Java method
//! let result: String = java_call!(
//!     env, service, "addPost", [content_jvalue, title_jvalue], String
//! )?;
//! ```
//!
//! ## Converting arguments and returns:
//! ```rust,ignore
//! use android::{jni_arg, jni_ret, with_service_or_throw};
//!
//! #[no_mangle]
//! pub extern "C" fn Java_..._nativeAddPost(
//!     mut env: JNIEnv,
//!     _class: JClass,
//!     content: JString,
//!     title: JString,
//! ) -> jstring {
//!     let service = with_service_or_throw!(env);
//!     let content = jni_arg!(env, content: String);
//!     let title = jni_arg!(env, title: String);
//!     
//!     let result = service.add_post(&content, Some(&title));
//!     jni_ret!(env, result => String)
//! }
//! ```

pub mod calls;
pub mod exports;
pub mod types;

// Macros are automatically exported at crate root via #[macro_export]
