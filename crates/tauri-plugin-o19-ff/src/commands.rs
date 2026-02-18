use crate::{Error, O19Extension, Result, models::*, sql_proxy};
use caesium::{
  SupportedFileTypes, compress_to_size_in_memory, convert_in_memory, parameters::CSParameters,
};
use o19_foundframe::preview;
use tauri::{AppHandle, Manager, Runtime};

#[tauri::command]
pub(crate) async fn ping() -> String {
  "pong".to_string()
}

#[tauri::command]
pub(crate) async fn run_sql<R: Runtime>(
  app: AppHandle<R>,
  query: sql_proxy::SqlQuery,
) -> Result<Vec<sql_proxy::SqlRow>> {
  let db = app.db().clone();

  let result = std::thread::spawn(move || sql_proxy::execute_sql_with_db(db, query))
    .join()
    .map_err(|e| Error::Other(format!("SQL execution panicked: {:?}", e)))?;

  Ok(result?)
}

// ============================================================================
// TheStream Commands - Adding content to the stream (via Platform)
// ============================================================================

#[tauri::command]
pub(crate) async fn add_text_note<R: Runtime>(
  app: AppHandle<R>,
  directory: String,
  content: String,
  title: Option<String>,
  subpath: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_text_note(directory, content, title, subpath)
}

#[tauri::command]
pub(crate) async fn add_post<R: Runtime>(
  app: AppHandle<R>,
  content: String,
  title: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_post(content, title)
}

#[tauri::command]
pub(crate) async fn add_bookmark<R: Runtime>(
  app: AppHandle<R>,
  url: String,
  title: Option<String>,
  notes: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_bookmark(url, title, notes)
}

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

#[tauri::command]
pub(crate) async fn add_person<R: Runtime>(
  app: AppHandle<R>,
  display_name: String,
  handle: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_person(display_name, handle)
}

#[tauri::command]
pub(crate) async fn add_conversation<R: Runtime>(
  app: AppHandle<R>,
  conversation_id: String,
  title: Option<String>,
) -> Result<StreamEntryResult> {
  app.platform().add_conversation(conversation_id, title)
}

/// Subscribe to stream events from the frontend.
#[tauri::command]
pub(crate) async fn subscribe_stream_events<R: Runtime>(_app: AppHandle<R>) -> Result<String> {
  Ok("Subscribed to stream events".to_string())
}

// ============================================================================
// Preview Commands
// ============================================================================

#[tauri::command]
pub(crate) async fn url_preview_json<R: Runtime>(
  app: AppHandle<R>,
  url: String,
) -> Result<preview::PreviewType> {
  let app_data_dir = app.path().app_data_dir()?;

  let media_dir = app_data_dir.join("media");
  let thumb_dir = app_data_dir.join("thumbnails");

  std::fs::create_dir_all(&media_dir)?;
  std::fs::create_dir_all(&thumb_dir)?;

  Ok(preview::get_for_url(&media_dir, &thumb_dir, &url).await?)
}

#[tauri::command]
pub(crate) async fn html_preview_json(url: String) -> Result<preview::html::HtmlPreviewJSON> {
  Ok(preview::html::json(url).await?)
}

#[tauri::command]
pub(crate) async fn media_preview_json<R: Runtime>(
  app: AppHandle<R>,
  url: String,
) -> Result<preview::media::MediaPreviewJSON> {
  let app_data_dir = app.path().app_data_dir()?;

  let media_dir = app_data_dir.join("media");
  let thumb_dir = app_data_dir.join("thumbnails");

  std::fs::create_dir_all(&media_dir)?;
  std::fs::create_dir_all(&thumb_dir)?;

  Ok(preview::media::process_url(&media_dir, &thumb_dir, &url).await?)
}

// ============================================================================
// Media Processing Commands
// ============================================================================

#[tauri::command]
pub(crate) async fn convert_jpeg_to_webp<R: Runtime>(
  _app: AppHandle<R>,
  payload: ConvertJpegToWebpArgs,
) -> Result<Vec<u8>> {
  let parameters = CSParameters::new();
  let webp = convert_in_memory(payload.jpeg, &parameters, SupportedFileTypes::WebP)?;

  Ok(webp)
}

#[tauri::command]
pub(crate) async fn compress_webp_to_size<R: Runtime>(
  _app: AppHandle<R>,
  payload: CompressWebpToSizeArgs,
) -> Result<Vec<u8>> {
  let mut parameters = CSParameters::new();

  let compressed =
    compress_to_size_in_memory(payload.webp, &mut parameters, payload.max_size, true)?;

  Ok(compressed)
}

// ============================================================================
// Permission Commands
// ============================================================================

#[tauri::command]
pub(crate) async fn request_permissions<R: Runtime>(
  app: AppHandle<R>,
) -> Result<NotificationPermissionStatus> {
  app.platform().request_permissions()
}

// ============================================================================
// Device Pairing Commands - Delegated to Platform
// ============================================================================

#[tauri::command]
pub(crate) async fn generate_pairing_qr<R: Runtime>(
  app: AppHandle<R>,
  device_name: String,
) -> Result<PairingQrResponse> {
  app.platform().generate_pairing_qr(device_name)
}

#[tauri::command]
pub(crate) async fn parse_pairing_url<R: Runtime>(
  app: AppHandle<R>,
  url: String,
) -> Result<ScannedPairingData> {
  app.platform().parse_pairing_url(url)
}

#[tauri::command]
pub(crate) async fn confirm_pairing<R: Runtime>(
  app: AppHandle<R>,
  node_id_hex: String,
  alias: String,
) -> Result<PairedDeviceInfo> {
  app.platform().confirm_pairing(node_id_hex, alias)
}

#[tauri::command]
pub(crate) async fn list_paired_devices<R: Runtime>(
  app: AppHandle<R>,
) -> Result<Vec<PairedDeviceInfo>> {
  app.platform().list_paired_devices()
}

#[tauri::command]
pub(crate) async fn check_followers_and_pair<R: Runtime>(
  app: AppHandle<R>,
) -> Result<Vec<PairedDeviceInfo>> {
  app.platform().check_followers_and_pair()
}

#[tauri::command]
pub(crate) async fn unpair_device<R: Runtime>(
  app: AppHandle<R>,
  node_id_hex: String,
) -> Result<()> {
  app.platform().unpair_device(node_id_hex)
}
