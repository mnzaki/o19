//! Platform Trait
//!
//! Auto-generated from IEventCallback

#[async_trait::async_trait]
pub trait EventCallback: Send + Sync {
    async fn on_event(&self) -> ();
}
