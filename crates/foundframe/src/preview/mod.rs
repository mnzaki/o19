pub mod media;
pub mod html;

use serde::Serialize;
use std::path::Path;

use crate::error::Result;

#[derive(Serialize, Debug)]
#[serde(tag = "type")]
#[serde(rename_all = "camelCase")]
pub enum PreviewType {
    Html(html::HtmlPreviewJSON),
    Media(media::MediaPreviewJSON),
    Unknown,
}

pub fn is_media_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.ends_with(".jpg") || lower.ends_with(".jpeg") ||
    lower.ends_with(".png") || lower.ends_with(".gif") ||
    lower.ends_with(".webp") || lower.ends_with(".mp4") ||
    lower.ends_with(".mov") || lower.ends_with(".webm") ||
    lower.ends_with(".mp3") || lower.ends_with(".m4a") ||
    lower.ends_with(".ogg") || lower.ends_with(".wav")
}

pub fn resolve_url(url: &str, base_url: &str) -> Option<String> {
    // If already absolute, use as-is
    if url.starts_with("http://") || url.starts_with("https://") {
        return Some(url.to_string());
    }

    // Skip data URLs
    if url.starts_with("data:") {
        return None;
    }

    // Parse base URL
    let base = reqwest::Url::parse(base_url).ok()?;

    // Join with base
    base.join(url).ok().map(|u| u.to_string())
}

pub async fn get_for_url(
    media_dir: &Path,
    thumb_dir: &Path,
    url: &str
) -> Result<PreviewType> {
    println!("[URL_PREVIEW] Processing URL: {}", url);

    // Determine URL type based on extension or content-type
    if is_media_url(url) {
        println!("[URL_PREVIEW] Detected as media URL");
        match media::process_url(media_dir, thumb_dir, url).await {
            Ok(preview) => Ok(PreviewType::Media(preview)),
            Err(e) => {
                println!("[URL_PREVIEW] Media preview failed: {}, falling back to HTML", e);
                // Fall back to HTML preview if media fails
                match html::json(url.to_string()).await {
                    Ok(preview) => Ok(PreviewType::Html(preview)),
                    Err(_) => Ok(PreviewType::Unknown),
                }
            }
        }
    } else {
        println!("[URL_PREVIEW] Detected as HTML URL");
        match html::json(url.to_string()).await {
            Ok(preview) => Ok(PreviewType::Html(preview)),
            Err(_) => Ok(PreviewType::Unknown),
        }
    }
}
