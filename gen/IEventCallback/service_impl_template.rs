//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{EventCallback, init_service};

/// Your service implementation
pub struct EventCallbackImpl {
    // Add your fields here
}

impl EventCallbackImpl {
    pub fn new() -> Self {
        Self {
            // Initialize fields
        }
    }
}

impl EventCallback for EventCallbackImpl {
    fn on_event(&self, _eventJson: &str) -> () {
        // TODO: Implement onEvent
        
    }
}

/// Call this to initialize the service before any AIDL calls
pub fn init() {
    init_service(EventCallbackImpl::new());
}
