//! Platform Trait
//!
//! Auto-generated from IFoundframeRadicle

#[async_trait::async_trait]
pub trait FoundframeRadicle: Send + Sync {
    async fn get_node_id(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn is_node_running(&self) -> Result<bool, Box<dyn std::error::Error>>;
    async fn get_node_alias(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn create_repository(&self) -> Result<bool, Box<dyn std::error::Error>>;
    async fn list_repositories(&self) -> Result<(), Box<dyn std::error::Error>>;
    async fn follow_device(&self) -> Result<bool, Box<dyn std::error::Error>>;
    async fn list_followers(&self) -> Result<(), Box<dyn std::error::Error>>;
    async fn generate_pairing_code(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn confirm_pairing(&self) -> Result<bool, Box<dyn std::error::Error>>;
    async fn unpair_device(&self) -> ();
    async fn add_post(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn add_bookmark(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn add_media_link(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn add_person(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn add_conversation(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn add_text_note(&self) -> Result<String, Box<dyn std::error::Error>>;
    async fn subscribe_events(&self) -> ();
    async fn unsubscribe_events(&self) -> ();
}
