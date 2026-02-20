//! Platform Trait
//!
//! Auto-generated from INodeMgmt

pub trait NodeMgmt: Send + Sync {
    fn get_node_id(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn is_node_running(&self) -> Result<bool, Box<dyn std::error::Error>>;
    fn get_node_alias(&self) -> Result<String, Box<dyn std::error::Error>>;
    fn start_node(&self, alias: String) -> Result<bool, Box<dyn std::error::Error>>;
    fn stop_node(&self) -> ();
}
