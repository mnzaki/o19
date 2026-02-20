//! Platform Trait
//!
//! Auto-generated from IContentMgmt

pub trait ContentMgmt: Send + Sync {
    fn add_media_link(&self, directory: String, url: String, title: Option<String>, mime_type: Option<String>, subpath: Option<String>) -> Result<String, Box<dyn std::error::Error>>;
    fn add_bookmark(&self, url: String, title: Option<String>, notes: Option<String>) -> Result<String, Box<dyn std::error::Error>>;
    fn add_post(&self, content: String, title: Option<String>) -> Result<String, Box<dyn std::error::Error>>;
    fn add_person(&self, display_name: String, handle: Option<String>) -> Result<String, Box<dyn std::error::Error>>;
    fn add_conversation(&self, conversation_id: String, title: Option<String>) -> Result<String, Box<dyn std::error::Error>>;
}
