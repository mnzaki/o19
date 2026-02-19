//! Type conversion utilities for JNI
//!
//! Provides traits and types for converting between Java and Rust types.

use jni::objects::JString;
use jni::signature::JavaType;
use jni::JNIEnv;

/// Trait for types that can be converted from Rust to JNI arguments
pub trait IntoJniArg {
    /// The JNI type that represents this Rust type
    fn jni_type() -> JavaType;
    
    /// Convert to a JNI value
    fn into_jni(self, env: &mut JNIEnv) -> jni::sys::jvalue;
}

/// Trait for types that can be converted from JNI to Rust
pub trait FromJni<'a>: Sized {
    /// The JNI type that represents this Rust type
    fn jni_type() -> JavaType;
    
    /// Convert from a JNI value
    unsafe fn from_jni(env: &mut JNIEnv, value: jni::sys::jvalue) -> Self;
}

// Implementations for primitive types

impl IntoJniArg for bool {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Boolean)
    }
    
    fn into_jni(self, _env: &mut JNIEnv) -> jni::sys::jvalue {
        jni::sys::jvalue { z: self as u8 }
    }
}

impl<'a> FromJni<'a> for bool {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Boolean)
    }
    
    unsafe fn from_jni(_env: &mut JNIEnv, value: jni::sys::jvalue) -> Self {
        value.z != 0
    }
}

impl IntoJniArg for i32 {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Int)
    }
    
    fn into_jni(self, _env: &mut JNIEnv) -> jni::sys::jvalue {
        jni::sys::jvalue { i: self }
    }
}

impl<'a> FromJni<'a> for i32 {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Int)
    }
    
    unsafe fn from_jni(_env: &mut JNIEnv, value: jni::sys::jvalue) -> Self {
        value.i
    }
}

impl IntoJniArg for i64 {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Long)
    }
    
    fn into_jni(self, _env: &mut JNIEnv) -> jni::sys::jvalue {
        jni::sys::jvalue { j: self }
    }
}

impl<'a> FromJni<'a> for i64 {
    fn jni_type() -> JavaType {
        JavaType::Primitive(jni::signature::Primitive::Long)
    }
    
    unsafe fn from_jni(_env: &mut JNIEnv, value: jni::sys::jvalue) -> Self {
        value.j
    }
}

// String handling

pub struct JniString<'a>(pub &'a str);

impl<'a> IntoJniArg for JniString<'a> {
    fn jni_type() -> JavaType {
        JavaType::Object("java/lang/String".to_string())
    }
    
    fn into_jni(self, env: &mut JNIEnv) -> jni::sys::jvalue {
        let jstring = env.new_string(self.0).expect("Failed to create Java string");
        jni::sys::jvalue { l: jstring.into_raw() }
    }
}

impl<'a> IntoJniArg for &'a str {
    fn jni_type() -> JavaType {
        JavaType::Object("java/lang/String".to_string())
    }
    
    fn into_jni(self, env: &mut JNIEnv) -> jni::sys::jvalue {
        let jstring = env.new_string(self).expect("Failed to create Java string");
        jni::sys::jvalue { l: jstring.into_raw() }
    }
}

impl<'a> FromJni<'a> for String {
    fn jni_type() -> JavaType {
        JavaType::Object("java/lang/String".to_string())
    }
    
    unsafe fn from_jni(env: &mut JNIEnv, value: jni::sys::jvalue) -> Self {
        let jstring = JString::from_raw(value.l);
        env.get_string(&jstring)
            .expect("Failed to get Java string")
            .into()
    }
}

// Optional types

impl<T: IntoJniArg> IntoJniArg for Option<T> {
    fn jni_type() -> JavaType {
        T::jni_type()
    }
    
    fn into_jni(self, env: &mut JNIEnv) -> jni::sys::jvalue {
        match self {
            Some(v) => v.into_jni(env),
            None => jni::sys::jvalue { l: std::ptr::null_mut() },
        }
    }
}

/// Helper to build JNI method signatures
pub struct MethodSig {
    sig: String,
}

impl MethodSig {
    pub fn new() -> Self {
        Self { sig: String::new() }
    }
    
    pub fn arg<T: IntoJniArg>(mut self) -> Self {
        self.sig.push_str(&jni_type_sig(&T::jni_type()));
        self
    }
    
    pub fn ret<T: IntoJniArg>(mut self) -> Self {
        self.sig.push_str(&jni_type_sig(&T::jni_type()));
        self
    }
    
    pub fn ret_void(mut self) -> Self {
        self.sig.push('V');
        self
    }
    
    pub fn build(self) -> String {
        self.sig
    }
}

/// Convert JavaType to JNI signature string
fn jni_type_sig(ty: &JavaType) -> String {
    use jni::signature::Primitive;
    
    match ty {
        JavaType::Primitive(p) => match p {
            Primitive::Boolean => "Z".to_string(),
            Primitive::Byte => "B".to_string(),
            Primitive::Char => "C".to_string(),
            Primitive::Short => "S".to_string(),
            Primitive::Int => "I".to_string(),
            Primitive::Long => "J".to_string(),
            Primitive::Float => "F".to_string(),
            Primitive::Double => "D".to_string(),
            Primitive::Void => "V".to_string(),
        },
        JavaType::Object(class) => format!("L{};", class.replace('.', "/")),
        JavaType::Array(inner) => format!("[{}", jni_type_sig(inner)),
        _ => "Ljava/lang/Object;".to_string(),
    }
}
