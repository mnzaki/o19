use crate::sql_proxy;
use crate::{Error, O19Extension, Result, models::*};
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
  let db_path = app
    .path()
    .app_config_dir()
    .map(|p| p.join("deardiary.db"))?;

  // Execute SQL synchronously (sqlite crate is sync) then return result
  let result = std::thread::spawn(move || sql_proxy::execute_sql(&db_path, query))
    .join()
    .map_err(|e| Error::Other(format!("SQL execution panicked: {:?}", e)))?;

  Ok(result?)
}

#[tauri::command]
pub(crate) async fn url_preview_json<R: Runtime>(
  app: AppHandle<R>,
  url: String,
) -> Result<preview::PreviewType> {
  let app_data_dir = app.path().app_data_dir()?;

  let media_dir = app_data_dir.join("media");
  let thumb_dir = app_data_dir.join("thumbnails");

  // Ensure directories exist
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

  // Ensure directories exist
  std::fs::create_dir_all(&media_dir)?;
  std::fs::create_dir_all(&thumb_dir)?;

  Ok(preview::media::process_url(&media_dir, &thumb_dir, &url).await?)
}

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

#[tauri::command]
pub(crate) async fn request_permissions<R: Runtime>(
  app_handle: AppHandle<R>,
) -> Result<NotificationPermissionStatus> {
  app_handle.platform().request_permissions()
}
