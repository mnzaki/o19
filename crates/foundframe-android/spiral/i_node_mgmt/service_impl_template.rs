//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{NodeMgmt, init_service};

/// Your service implementation
pub struct NodeMgmtImpl {
    // Add your fields here
}

impl NodeMgmtImpl {
    pub fn new() -> Self {
        Self {
            // Initialize fields
        }
    }
}

impl NodeMgmt for NodeMgmtImpl {
    fn get_node_id(&self, ) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement getNodeId
        Ok(String::new())
    }
    fn is_node_running(&self, ) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement isNodeRunning
        Ok(false)
    }
    fn get_node_alias(&self, ) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement getNodeAlias
        Ok(String::new())
    }
    fn start_node(&self, _alias: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement startNode
        Ok(false)
    }
    fn stop_node(&self, ) -> () {
        // TODO: Implement stopNode
        
    }
}

/// Call this to initialize the service before any AIDL calls
pub fn init() {
    init_service(NodeMgmtImpl::new());
}
