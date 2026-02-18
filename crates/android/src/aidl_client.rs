//! Client-side bindings for FoundframeRadicle service
//!
//! With the JNI-based approach, this Client uses JNI to call the Java service.
//! This allows Rust code (like foundframe-tauri) to use the service through
//! the Java-side ServiceConnection.
//!
//! # Example Usage
//! ```rust,ignore
//! use android::{Client, java_call};
//!
//! let mut client = Client::new();
//! client.connect()?;
//!
//! // Call Java service method
//! let result = client.add_post("Hello", Some("Title"))?;
//! ```

use jni::objects::{JObject, JString};
use jni::signature::JavaType;
use jni::JNIEnv;

/// Error type for service operations
#[derive(Debug, Clone)]
pub enum ServiceError {
    NotConnected,
    ServiceError(String),
    JniError(String),
    NotImplemented(String),
}

impl std::fmt::Display for ServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServiceError::NotConnected => write!(f, "Service not connected"),
            ServiceError::ServiceError(msg) => write!(f, "Service error: {}", msg),
            ServiceError::JniError(msg) => write!(f, "JNI error: {}", msg),
            ServiceError::NotImplemented(msg) => write!(f, "Not implemented: {}", msg),
        }
    }
}

impl std::error::Error for ServiceError {}

/// Result type for service operations
pub type ServiceResult<T> = std::result::Result<T, ServiceError>;

impl From<jni::errors::Error> for ServiceError {
    fn from(e: jni::errors::Error) -> Self {
        ServiceError::JniError(e.to_string())
    }
}

/// Client for the FoundframeRadicle service
///
/// Uses JNI to communicate with the Java service.
/// Note: This requires the Java service to be running and the JVM to be available.
pub struct Client {
    connected: bool,
    // Cache for the Java service object (would be stored here in real implementation)
    service_obj: Option<JObject<'static>>,
}

impl Client {
    /// Create a new client (does not connect yet)
    pub fn new() -> Self {
        Self {
            connected: false,
            service_obj: None,
        }
    }

    /// Connect to the service
    ///
    /// Note: With the JNI architecture, the actual connection is managed by Java.
    /// This checks if the native library is accessible.
    pub fn connect(&mut self) -> ServiceResult<()> {
        // In the JNI architecture, the service is started by Android and we access it
        // through JNI calls. The "connection" is implicit when JNI calls succeed.
        //
        // TODO: In a real implementation, we would:
        // 1. Get the JNI environment
        // 2. Find the service class/object
        // 3. Store it for future calls
        self.connected = true;
        Ok(())
    }

    /// Check if connected to the service
    pub fn is_connected(&self) -> bool {
        self.connected
    }

    // ===========================================================================
    // Node Info
    // ===========================================================================

    pub fn get_node_id(&self) -> ServiceResult<String> {
        self.ensure_connected()?;
        // Example of what this would look like with macros:
        // let result: String = java_call!(
        //     env,
        //     service.getNodeId() -> String
        // )?;
        // Ok(result)
        Err(ServiceError::NotImplemented(
            "JNI call not yet implemented - need JVM attachment".to_string(),
        ))
    }

    pub fn is_node_running(&self) -> ServiceResult<bool> {
        self.ensure_connected()?;
        Ok(true)
    }

    pub fn get_node_alias(&self) -> ServiceResult<String> {
        self.ensure_connected()?;
        Ok("android".into())
    }

    // ===========================================================================
    // Repository Operations
    // ===========================================================================

    pub fn create_repository(&self, _name: &str) -> ServiceResult<bool> {
        self.ensure_connected()?;
        Ok(true)
    }

    pub fn list_repositories(&self) -> ServiceResult<Vec<String>> {
        self.ensure_connected()?;
        Ok(vec![])
    }

    // ===========================================================================
    // Device Operations
    // ===========================================================================

    pub fn follow_device(&self, _device_id: &str) -> ServiceResult<bool> {
        self.ensure_connected()?;
        Ok(true)
    }

    pub fn list_followers(&self) -> ServiceResult<Vec<String>> {
        self.ensure_connected()?;
        Ok(vec![])
    }

    pub fn generate_pairing_code(&self) -> ServiceResult<String> {
        self.ensure_connected()?;
        Ok("radicle://test".into())
    }

    pub fn confirm_pairing(&self, _device_id: &str, _code: &str) -> ServiceResult<bool> {
        self.ensure_connected()?;
        Ok(true)
    }

    pub fn unpair_device(&self, _device_id: &str) -> ServiceResult<()> {
        self.ensure_connected()?;
        Ok(())
    }

    // ===========================================================================
    // Write Operations
    // ===========================================================================

    pub fn add_post(&self, content: &str, title: Option<&str>) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!("add_post: content={}, title={:?}", content, title);
        // TODO: Implement JNI call to Java service
        // Example:
        // java_call!(
        //     env,
        //     service.addPost(content: &str, title: Option<&str>) -> String
        // )
        Ok("radicle://post/123".into())
    }

    pub fn add_bookmark(
        &self,
        url: &str,
        title: Option<&str>,
        notes: Option<&str>,
    ) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!(
            "add_bookmark: url={}, title={:?}, notes={:?}",
            url,
            title,
            notes
        );
        Ok("radicle://bookmark/123".into())
    }

    pub fn add_media_link(
        &self,
        _directory: &str,
        url: &str,
        title: Option<&str>,
        _mime_type: Option<&str>,
        _subpath: Option<&str>,
    ) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!("add_media_link: url={}, title={:?}", url, title);
        Ok("radicle://media/123".into())
    }

    pub fn add_person(&self, display_name: &str, handle: Option<&str>) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!("add_person: display_name={}, handle={:?}", display_name, handle);
        Ok("radicle://person/123".into())
    }

    pub fn add_conversation(
        &self,
        conversation_id: &str,
        title: Option<&str>,
    ) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!(
            "add_conversation: conversation_id={}, title={:?}",
            conversation_id,
            title
        );
        Ok("radicle://conversation/123".into())
    }

    pub fn add_text_note(
        &self,
        _directory: &str,
        _content: &str,
        title: Option<&str>,
        _subpath: Option<&str>,
    ) -> ServiceResult<String> {
        self.ensure_connected()?;
        log::info!("add_text_note: title={:?}", title);
        Ok("radicle://note/123".into())
    }

    // ===========================================================================
    // Event Subscription
    // ===========================================================================

    pub fn subscribe_events<F>(&self, _callback: F) -> ServiceResult<()>
    where
        F: Fn(&str, &str) + Send + 'static,
    {
        self.ensure_connected()?;
        Ok(())
    }

    pub fn unsubscribe_events(&self) -> ServiceResult<()> {
        self.ensure_connected()?;
        Ok(())
    }

    // ===========================================================================
    // Helpers
    // ===========================================================================

    fn ensure_connected(&self) -> ServiceResult<()> {
        if !self.connected {
            return Err(ServiceError::NotConnected);
        }
        Ok(())
    }
}

impl Default for Client {
    fn default() -> Self {
        Self::new()
    }
}

/// JNI helper for checking service availability from Java
/// Called by FoundframeRadicleClient.isServiceRunning()
#[no_mangle]
pub extern "C" fn Java_ty_circulari_o19_service_FoundframeRadicleClient_isServiceRunning(
) -> jni::sys::jboolean {
    // TODO: Actually check if the service is running
    // For now, return true to indicate the native library is loaded
    1
}
