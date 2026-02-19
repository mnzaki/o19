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
pub(crate) async fn is_node_running<R: Runtime>(app: AppHandle<R>) -> Result<bool> {
    app.platform().is_node_running().await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn create_repository<R: Runtime>(
    app: AppHandle<R>,
    name: String,
) -> Result<bool> {
    app.platform().create_repository(name).await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn list_repositories<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().list_repositories().await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn follow_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> Result<bool> {
    app.platform().follow_device(device_id).await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn list_followers<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().list_followers().await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn generate_pairing_code<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().generate_pairing_code().await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn confirm_pairing<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    code: String,
) -> Result<bool> {
    app.platform().confirm_pairing(device_id, code).await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn unpair_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> Result<()> {
    app.platform().unpair_device(device_id).await
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
    title: String,
) -> Result<StreamEntryResult> {
    app.platform().add_post(content, title).await
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
    title: String,
    notes: String,
) -> Result<StreamEntryResult> {
    app.platform().add_bookmark(url, title, notes).await
}
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
    title: String,
    mime_type: String,
    subpath: String,
) -> Result<StreamEntryResult> {
    app.platform().add_media_link(directory, url, title, mime_type, subpath).await
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
    handle: String,
) -> Result<StreamEntryResult> {
    app.platform().add_person(display_name, handle).await
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
    title: String,
) -> Result<StreamEntryResult> {
    app.platform().add_conversation(conversation_id, title).await
}
/// # Command: #cmd_name
///
/// Auto-generated from AIDL method: #method_name
///
/// Delegates to Platform::#platform_method
#[tauri::command]
pub(crate) async fn add_text_note<R: Runtime>(
    app: AppHandle<R>,
    directory: String,
    content: String,
    title: String,
    subpath: String,
) -> Result<StreamEntryResult> {
    app.platform().add_text_note(directory, content, title, subpath).await
}
/// Register all generated commands with Tauri
pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .invoke_handler(
            tauri::generate_handler![
                is_node_running, create_repository, list_repositories, follow_device,
                list_followers, generate_pairing_code, confirm_pairing, unpair_device,
                add_post, add_bookmark, add_media_link, add_person, add_conversation,
                add_text_note
            ],
        )
}
/// Command names for TypeScript integration
pub mod plugin_commands {
    pub const IS_NODE_RUNNING: &str = "plugin:o19-foundframe-tauri|is_node_running";
    pub const CREATE_REPOSITORY: &str = "plugin:o19-foundframe-tauri|create_repository";
    pub const LIST_REPOSITORIES: &str = "plugin:o19-foundframe-tauri|list_repositories";
    pub const FOLLOW_DEVICE: &str = "plugin:o19-foundframe-tauri|follow_device";
    pub const LIST_FOLLOWERS: &str = "plugin:o19-foundframe-tauri|list_followers";
    pub const GENERATE_PAIRING_CODE: &str = "plugin:o19-foundframe-tauri|generate_pairing_code";
    pub const CONFIRM_PAIRING: &str = "plugin:o19-foundframe-tauri|confirm_pairing";
    pub const UNPAIR_DEVICE: &str = "plugin:o19-foundframe-tauri|unpair_device";
    pub const ADD_POST: &str = "plugin:o19-foundframe-tauri|add_post";
    pub const ADD_BOOKMARK: &str = "plugin:o19-foundframe-tauri|add_bookmark";
    pub const ADD_MEDIA_LINK: &str = "plugin:o19-foundframe-tauri|add_media_link";
    pub const ADD_PERSON: &str = "plugin:o19-foundframe-tauri|add_person";
    pub const ADD_CONVERSATION: &str = "plugin:o19-foundframe-tauri|add_conversation";
    pub const ADD_TEXT_NOTE: &str = "plugin:o19-foundframe-tauri|add_text_note";
}
