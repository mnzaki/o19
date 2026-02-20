//! Auto-generated Tauri commands from #aidl.interface_name
//!
//! DO NOT EDIT MANUALLY - Generated from AIDL
use tauri::{AppHandle, Manager, Runtime};
use crate::{O19Extension, Result, models::*};
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_media_link<R: Runtime>(
    app: AppHandle<R>,
    directory: String,
    url: String,
    title: Option<String>,
    mime_type: Option<String>,
    subpath: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_media_link(directory, url, title, mime_type, subpath)
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_bookmark<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    title: Option<String>,
    notes: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_bookmark(url, title, notes)
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_post<R: Runtime>(
    app: AppHandle<R>,
    content: String,
    title: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_post(content, title)
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_person<R: Runtime>(
    app: AppHandle<R>,
    display_name: String,
    handle: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_person(display_name, handle)
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_conversation<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
    title: Option<String>,
) -> Result<StreamEntryResult> {
    app.platform().add_conversation(conversation_id, title)
}
/// Register all generated commands with Tauri
pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .invoke_handler(
            tauri::generate_handler![
                add_media_link, add_bookmark, add_post, add_person, add_conversation
            ],
        )
}
/// Command names for TypeScript integration
pub mod plugin_commands {
    pub const ADD_MEDIA_LINK: &str = "plugin:o19-foundframe-tauri|add_media_link";
    pub const ADD_BOOKMARK: &str = "plugin:o19-foundframe-tauri|add_bookmark";
    pub const ADD_POST: &str = "plugin:o19-foundframe-tauri|add_post";
    pub const ADD_PERSON: &str = "plugin:o19-foundframe-tauri|add_person";
    pub const ADD_CONVERSATION: &str = "plugin:o19-foundframe-tauri|add_conversation";
}
