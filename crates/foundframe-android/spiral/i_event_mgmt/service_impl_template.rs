//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{EventMgmt, init_service};

/// Your service implementation
pub struct EventMgmtImpl {
    // Add your fields here
}

impl EventMgmtImpl {
    pub fn new() -> Self {
        Self {
            // Initialize fields
        }
    }
}

impl EventMgmt for EventMgmtImpl {
    fn subscribe_events(&self, _callback: &IEventCallback) -> () {
        // TODO: Implement subscribeEvents
        
    }
    fn unsubscribe_events(&self, _callback: &IEventCallback) -> () {
        // TODO: Implement unsubscribeEvents
        
    }
    fn supports_events(&self, ) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement supportsEvents
        Ok(false)
    }
}

/// Call this to initialize the service before any AIDL calls
pub fn init() {
    init_service(EventMgmtImpl::new());
}
