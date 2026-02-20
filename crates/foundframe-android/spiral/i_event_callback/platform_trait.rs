//! Platform Trait
//!
//! Auto-generated from IEventCallback

pub trait EventCallback: Send + Sync {
    fn on_event(&self, event_type: String, event_data: String) -> ();
    fn on_status_change(&self, status: String, details: String) -> ();
    fn on_sync_complete(&self, repository_id: String, success: bool) -> ();
}
