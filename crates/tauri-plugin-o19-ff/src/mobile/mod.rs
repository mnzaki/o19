//! Mobile Platform Implementations
//!
//! - Android: Uses Binder IPC to RemoteFoundframe service
//! - iOS: Not implemented (returns errors)

#[cfg(target_os = "android")]
mod android;
#[cfg(target_os = "ios")]
mod ios;

#[cfg(target_os = "android")]
pub use android::{AndroidPlatform, init};
#[cfg(target_os = "ios")]
pub use ios::{IosPlatform, init};
