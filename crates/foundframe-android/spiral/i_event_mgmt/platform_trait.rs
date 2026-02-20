//! Platform Trait
//!
//! Auto-generated from IEventMgmt

pub trait EventMgmt: Send + Sync {
    fn subscribe_events(&self, callback: String) -> ();
    fn unsubscribe_events(&self, callback: String) -> ();
    fn supports_events(&self) -> Result<bool, Box<dyn std::error::Error>>;
}
