//! Auto-generated Tauri commands from #aidl.interface_name
//!
//! DO NOT EDIT MANUALLY - Generated from AIDL
use tauri::{AppHandle, Manager, Runtime};
use crate::{Result, models::*};
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn on_event<R: Runtime>(
    app: AppHandle<R>,
    event_json: String,
) -> Result<()> {
    app.platform().on_event(event_json).await
}
/// Register all generated commands with Tauri
pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![on_event])
}
/// Command names for TypeScript integration
pub mod plugin_commands {
    pub const ON_EVENT: &str = "plugin:o19-foundframe-tauri|on_event";
}
