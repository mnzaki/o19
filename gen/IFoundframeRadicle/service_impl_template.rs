//! Service Implementation Template
//!
//! Copy this file and implement the methods for your service.

use crate::generated::jni_glue::{FoundframeRadicle, init_service};

/// Your service implementation
pub struct FoundframeRadicleImpl {
    // Add your fields here
}

impl FoundframeRadicleImpl {
    pub fn new() -> Self {
        Self {
            // Initialize fields
        }
    }
}

impl FoundframeRadicle for FoundframeRadicleImpl {
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

    fn create_repository(&self, _name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement createRepository
        Ok(false)
    }

    fn list_repositories(&self, ) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement listRepositories
        Ok(())
    }

    fn follow_device(&self, _deviceId: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement followDevice
        Ok(false)
    }

    fn list_followers(&self, ) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement listFollowers
        Ok(())
    }

    fn generate_pairing_code(&self, ) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement generatePairingCode
        Ok(String::new())
    }

    fn confirm_pairing(&self, _deviceId: &str, _code: &str) -> Result<bool, Box<dyn std::error::Error>> {
        // TODO: Implement confirmPairing
        Ok(false)
    }

    fn unpair_device(&self, _deviceId: &str) -> () {
        // TODO: Implement unpairDevice
        
    }

    fn add_post(&self, _content: &str, _title: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addPost
        Ok(String::new())
    }

    fn add_bookmark(&self, _url: &str, _title: &str, _notes: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addBookmark
        Ok(String::new())
    }

    fn add_media_link(&self, _directory: &str, _url: &str, _title: &str, _mimeType: &str, _subpath: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addMediaLink
        Ok(String::new())
    }

    fn add_person(&self, _displayName: &str, _handle: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addPerson
        Ok(String::new())
    }

    fn add_conversation(&self, _conversationId: &str, _title: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addConversation
        Ok(String::new())
    }

    fn add_text_note(&self, _directory: &str, _content: &str, _title: &str, _subpath: &str) -> Result<String, Box<dyn std::error::Error>> {
        // TODO: Implement addTextNote
        Ok(String::new())
    }

    fn subscribe_events(&self, _callback: &IEventCallback) -> () {
        // TODO: Implement subscribeEvents
        
    }

    fn unsubscribe_events(&self, _callback: &IEventCallback) -> () {
        // TODO: Implement unsubscribeEvents
        
    }
}

/// Call this to initialize the service before any AIDL calls
pub fn init() {
    init_service(FoundframeRadicleImpl::new());
}
