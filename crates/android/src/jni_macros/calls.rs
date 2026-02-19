//! Macros for calling Java methods from Rust

/// Call a Java method from Rust
///
/// # Syntax
/// ```rust,ignore
/// java_call!(env, object, "methodName", "(Ljava/lang/String;)Ljava/lang/String;", [arg1, arg2])
/// ```
#[macro_export]
macro_rules! java_call {
    // Method call with signature string
    ($env:expr, $obj:expr, $method:expr, $sig:expr, [$($arg:expr),*]) => {{
        || -> Result<jni::objects::JValueOwned, jni::errors::Error> {
            let args: Vec<jni::objects::JValue> = vec![$($arg),*];
            
            $env.call_method(
                &$obj,
                $method,
                $sig,
                &args[..],
            )
        }()
    }};
}

/// Build a simple JNI signature
#[macro_export]
macro_rules! jni_sig {
    // Simple signature with arg types and return type
    ($($arg:tt),* ; $ret:tt) => {{
        let mut sig = String::from("(");
        $(
            sig.push_str($crate::jni_type!($arg));
        )*
        sig.push(')');
        sig.push_str($crate::jni_type!($ret));
        sig
    }};
}

/// Get JNI type character for common types
#[macro_export]
macro_rules! jni_type {
    (bool) => { "Z" };
    (byte) => { "B" };
    (char) => { "C" };
    (short) => { "S" };
    (int) => { "I" };
    (long) => { "J" };
    (float) => { "F" };
    (double) => { "D" };
    (void) => { "V" };
    (String) => { "Ljava/lang/String;" };
    (Object) => { "Ljava/lang/Object;" };
    ([$elem:tt]) => { concat!("[", $crate::jni_type!($elem)) };
}

/// Convert a JNI JValue to a Rust type
#[macro_export]
macro_rules! jni_to_rust {
    ($env:expr, $val:expr, String) => {{
        let jstring = $val.l()?;
        let s: String = $env.get_string(&jstring)?.into();
        Ok(s)
    }};
    ($env:expr, $val:expr, bool) => {{
        Ok($val.z()?)
    }};
    ($env:expr, $val:expr, i32) => {{
        Ok($val.i()?)
    }};
    ($env:expr, $val:expr, i64) => {{
        Ok($val.j()?)
    }};
}

// No pub use needed - macros are exported at crate root
