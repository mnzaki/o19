//! android: FoundframeRadicle service for Android
//!
//! This crate provides the Rust side of the FoundframeRadicle service.
//!
//! Architecture (JNI-based):
//! 1. Android Java Service (FoundframeRadicleService.java) starts in :foundframe process
//! 2. Java Service loads native library (libfoundframe.so)
//! 3. Java calls nativeStartService() to initialize Rust service
//! 4. Client binds to Java Service, gets IFoundframeRadicle.Stub
//! 5. Java Stub calls native methods (nativeGetNodeId, etc.)
//! 6. JNI functions dispatch to FoundframeService implementation
//!
//! Note: This replaces the NDK Binder approach which doesn't work for regular apps
//! (ServiceManager registration is restricted to system/platform apps).

// JNI Macros for clean bindings
// These are defined with #[macro_export] so they're available at crate root
#[macro_use]
pub mod jni_macros;

// Service and client modules
pub mod aidl_client;
pub mod aidl_service;

// Re-export the main types
pub use aidl_client::{Client, ServiceError, ServiceResult};
pub use aidl_service::{get_service, init_service, FoundframeService};

// Macros are automatically available at crate root:
// - java_call! - Call Java methods from Rust
// - jni_sig! - Build JNI signatures
// - jni_arg! - Convert JNI args to Rust
// - jni_ret! - Convert Rust results to JNI
// - with_service_or_throw! - Get service or throw Java exception
