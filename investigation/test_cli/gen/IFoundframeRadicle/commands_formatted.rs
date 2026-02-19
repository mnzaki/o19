//! Auto-generated Tauri commands from IFoundframeRadicle
//!
//! DO NOT EDIT MANUALLY - Generated from AIDL

use tauri::{AppHandle, Manager, Runtime};
use crate::{Result, models::*};

/// # Command: is_node_running
///
/// Auto-generated from AIDL method: isNodeRunning
///
/// Delegates to Platform::is_node_running
#[tauri::command]
pub(crate) async fn is_node_running<R: Runtime>(
    app: AppHandle<R>,
) -> Result<bool> {
    app.platform().is_node_running().await
}

/// # Command: create_repository
///
/// Auto-generated from AIDL method: createRepository
///
/// Delegates to Platform::create_repository
#[tauri::command]
pub(crate) async fn create_repository<R: Runtime>(
    app: AppHandle<R>,
    name: String,
) -> Result<bool> {
    app.platform().create_repository(name).await
}

/// # Command: list_repositories
///
/// Auto-generated from AIDL method: listRepositories
///
/// Delegates to Platform::list_repositories
#[tauri::command]
pub(crate) async fn list_repositories<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().list_repositories().await
}

/// # Command: follow_device
///
/// Auto-generated from AIDL method: followDevice
///
/// Delegates to Platform::follow_device
#[tauri::command]
pub(crate) async fn follow_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> Result<bool> {
    app.platform().follow_device(device_id).await
}

/// # Command: list_followers
///
/// Auto-generated from AIDL method: listFollowers
///
/// Delegates to Platform::list_followers
#[tauri::command]
pub(crate) async fn list_followers<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().list_followers().await
}

/// # Command: generate_pairing_code
///
/// Auto-generated from AIDL method: generatePairingCode
///
/// Delegates to Platform::generate_pairing_code
#[tauri::command]
pub(crate) async fn generate_pairing_code<R: Runtime>(
    app: AppHandle<R>,
) -> Result<StreamEntryResult> {
    app.platform().generate_pairing_code().await
}

/// # Command: confirm_pairing
///
/// Auto-generated from AIDL method: confirmPairing
///
/// Delegates to Platform::confirm_pairing
#[tauri::command]
pub(crate) async fn confirm_pairing<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
    code: String,
) -> Result<bool> {
    app.platform().confirm_pairing(device_id, code).await
}

/// # Command: unpair_device
///
/// Auto-generated from AIDL method: unpairDevice
///
/// Delegates to Platform::unpair_device
#[tauri::command]
pub(crate) async fn unpair_device<R: Runtime>(
    app: AppHandle<R>,
    device_id: String,
) -> Result<()> {
    app.platform().unpair_device(device_id).await
}

/// # Command: add_post
///
/// Auto-generated from AIDL method: addPost
///
/// Delegates to Platform::add_post
#[tauri::command]
pub(crate) async fn add_post<R: Runtime>(
    app: AppHandle<R>,
    content: String,
    title: String,
) -> Result<StreamEntryResult> {
    app.platform().add_post(content, title).await
}

/// # Command: add_bookmark
///
/// Auto-generated from AIDL method: addBookmark
///
/// Delegates to Platform::add_bookmark
#[tauri::command]
pub(crate) async fn add_bookmark<R: Runtime>(
    app: AppHandle<R>,
    url: String,
    title: String,
    notes: String,
) -> Result<StreamEntryResult> {
    app.platform().add_bookmark(url, title, notes).await
}

// ... more commands for add_media_link, add_person, add_conversation, add_text_note

/// Register all generated commands with Tauri
pub fn register_commands<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        is_node_running,
        create_repository,
        list_repositories,
        follow_device,
        list_followers,
        generate_pairing_code,
        confirm_pairing,
        unpair_device,
        add_post,
        add_bookmark,
        // ... etc
    ])
}

/// Command names for TypeScript integration
pub mod plugin_commands {
    pub const ADD_POST: &str = "plugin:o19-foundframe-tauri|add_post";
    pub const ADD_BOOKMARK: &str = "plugin:o19-foundframe-tauri|add_bookmark";
    // ... etc
}
