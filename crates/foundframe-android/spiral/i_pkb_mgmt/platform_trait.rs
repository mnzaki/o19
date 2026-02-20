//! Platform Trait
//!
//! Auto-generated from IPkbMgmt

pub trait PkbMgmt: Send + Sync {
    fn create_repository(&self, name: String) -> Result<bool, Box<dyn std::error::Error>>;
    fn list_repositories(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn get_default_repository(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn set_default_repository(&self, name: String) -> Result<bool, Box<dyn std::error::Error>>;
}
