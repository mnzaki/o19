//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{PkbMgmt, init_service};

/// Your service implementation
pub struct PkbMgmtImpl {
    // Add your fields here
}

impl PkbMgmtImpl {
    pub fn new() -> Self {
        Self {
            // Initialize fields
        }
    }
}

impl PkbMgmt for PkbMgmtImpl {
    fn create_repository(&self, _name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement createRepository
        Ok(false)
    }
    fn list_repositories(&self, ) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement listRepositories
        Ok(())
    }
    fn get_default_repository(&self, ) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement getDefaultRepository
        Ok(String::new())
    }
    fn set_default_repository(&self, _name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement setDefaultRepository
        Ok(false)
    }
}

/// Call this to initialize the service before any AIDL calls
pub fn init() {
    init_service(PkbMgmtImpl::new());
}
