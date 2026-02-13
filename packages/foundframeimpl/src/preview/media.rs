use serde::Serialize;
use std::path::{Path, PathBuf};
use image::{imageops::FilterType, GenericImageView};

use crate::error::{Error, Result};

// Constants for media handling
const MAX_REMOTE_MEDIA_SIZE_FOR_ANALYSIS: u64 = 10 * 1024 * 1024; // 10MB
const MAX_REMOTE_MEDIA_SIZE_FOR_SAVING: u64 = 50 * 1024 * 1024; // 50MB
const PARTIAL_DOWNLOAD_SIZE: usize = 64 * 1024; // 64KB
const THUMBNAIL_SIZE: u32 = 300; // 300px max dimension

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MediaPreviewJSON {
    pub url: String,
    pub media_type: String, // "image", "video", "audio", "unknown"
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration: Option<f64>, // in seconds
    pub file_size: Option<u64>,
    pub thumbnail_path: Option<String>, // path to cached thumbnail
    pub metadata: MediaMetadata,
}

#[derive(Serialize, Debug, Default)]
pub struct MediaMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub created_at: Option<String>, // ISO 8601
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// Process a media URL - takes paths instead of AppHandle for testability
pub async fn process_url(
    media_dir: &Path,
    thumb_dir: &Path,
    url: &str
) -> Result<MediaPreviewJSON> {
    println!("[MEDIA_PREVIEW] Processing: {}", url);

    // Check if it's a remote URL
    let is_remote = url.starts_with("http://") || url.starts_with("https://");

    let (file_path, file_size, is_temp) = if is_remote {
        println!("[MEDIA_PREVIEW] Remote media detected");
        handle_remote_media(media_dir, url).await?
    } else {
        println!("[MEDIA_PREVIEW] Local media detected");
        let path = std::path::PathBuf::from(url);
        let size = std::fs::metadata(&path)
            .map(|m| m.len())
            .ok();
        (path, size, false)
    };

    println!("[MEDIA_PREVIEW] File at: {:?}, size: {:?}", file_path, file_size);

    // Analyze media file
    let mut preview = analyze_media_file(&file_path, url).await?;
    preview.file_size = file_size;

    // Create thumbnail for images if we have the full file
    if preview.media_type == "image" && !is_temp {
        if let Ok(thumb_path) = create_thumbnail(thumb_dir, &file_path, url).await {
            preview.thumbnail_path = Some(thumb_path);
        }
    }

    // Clean up temp file if needed
    if is_temp && file_path.exists() {
        println!("[MEDIA_PREVIEW] Cleaning up temp file: {:?}", file_path);
        let _ = std::fs::remove_file(&file_path);
    }

    println!("[MEDIA_PREVIEW] Preview complete: {:?}", preview);
    Ok(preview)
}

async fn handle_remote_media(
    media_dir: &Path,
    url: &str
) -> Result<(PathBuf, Option<u64>, bool)> {
    // HEAD request to get size
    let client = reqwest::Client::new();
    let head_resp = client.head(url)
        .send()
        .await
        .map_err(|e| Error::Download(format!("HEAD request failed: {}", e)))?;

    let content_length = head_resp.headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok());

    println!("[MEDIA_PREVIEW] Content-Length: {:?}", content_length);

    // Determine download strategy
    let download_full = content_length.map_or(false, |size| {
        size <= MAX_REMOTE_MEDIA_SIZE_FOR_ANALYSIS
    });

    let should_save = content_length.map_or(false, |size| {
        size <= MAX_REMOTE_MEDIA_SIZE_FOR_SAVING
    });

    // Download file
    let temp_dir = std::env::temp_dir();
    let temp_filename = format!("deardiary_media_{}", uuid::Uuid::new_v4());
    let temp_path = temp_dir.join(&temp_filename);

    if download_full {
        println!("[MEDIA_PREVIEW] Downloading full file");
        let bytes = client.get(url)
            .send()
            .await
            .map_err(|e| Error::Download(format!("Download failed: {}", e)))?
            .bytes()
            .await
            .map_err(|e| Error::Download(format!("Read failed: {}", e)))?;

        std::fs::write(&temp_path, &bytes)
            .map_err(|e| Error::Download(format!("Write failed: {}", e)))?;

        let size = bytes.len() as u64;

        if should_save {
            // Move to permanent storage
            let perm_path = get_media_storage_path(media_dir, url)?;
            println!("[MEDIA_PREVIEW] Moving to permanent storage: {:?}", perm_path);
            if let Some(parent) = perm_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| Error::CreateDir(e.to_string()))?;
            }
            std::fs::copy(&temp_path, &perm_path)
                .map_err(|e| Error::Download(format!("Copy failed: {}", e)))?;

            // Clean up temp
            let _ = std::fs::remove_file(&temp_path);

            Ok((perm_path, Some(size), false))
        } else {
            Ok((temp_path, Some(size), true))
        }
    } else {
        // Partial download for analysis
        println!("[MEDIA_PREVIEW] Downloading partial ({} bytes)", PARTIAL_DOWNLOAD_SIZE);
        let partial = client.get(url)
            .header("Range", format!("bytes=0-{}", PARTIAL_DOWNLOAD_SIZE - 1))
            .send()
            .await
            .map_err(|e| Error::Download(format!("Partial download failed: {}", e)))?
            .bytes()
            .await
            .map_err(|e| Error::Download(format!("Read failed: {}", e)))?;

        std::fs::write(&temp_path, &partial)
            .map_err(|e| Error::Download(format!("Write failed: {}", e)))?;

        Ok((temp_path, content_length, true))
    }
}

fn get_media_storage_path(media_dir: &Path, url: &str) -> Result<PathBuf> {
    // Create a filename from URL hash
    let url_hash = blake3::hash(url.as_bytes()).to_hex().to_string();
    let extension = std::path::Path::new(url)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin");

    Ok(media_dir.join(format!("{}.{}", &url_hash[..16], extension)))
}

fn get_thumbnail_cache_path(thumb_dir: &Path, url: &str) -> Result<PathBuf> {
    std::fs::create_dir_all(thumb_dir)
        .map_err(|e| Error::CreateDir(format!("Create thumbnail dir failed: {}", e)))?;

    let url_hash = blake3::hash(url.as_bytes()).to_hex().to_string();
    Ok(thumb_dir.join(format!("{}_thumb.jpg", &url_hash[..16])))
}

async fn analyze_media_file(path: &Path, url: &str) -> Result<MediaPreviewJSON> {
    let media_type = detect_media_type(url);
    println!("[MEDIA_PREVIEW] Detected media type: {}", media_type);

    let mut preview = MediaPreviewJSON {
        url: url.to_string(),
        media_type: media_type.clone(),
        width: None,
        height: None,
        duration: None,
        file_size: None,
        thumbnail_path: None,
        metadata: MediaMetadata::default(),
    };

    // Try to get image dimensions for images
    if media_type == "image" {
        if let Ok(img) = image::open(path) {
            let (w, h) = img.dimensions();
            preview.width = Some(w);
            preview.height = Some(h);
            println!("[MEDIA_PREVIEW] Image dimensions: {}x{}", w, h);
        }

        // TODO: Add EXIF parsing with correct nom-exif API
    }

    Ok(preview)
}

fn detect_media_type(url: &str) -> String {
    let lower = url.to_lowercase();
    if lower.ends_with(".jpg") || lower.ends_with(".jpeg") ||
       lower.ends_with(".png") || lower.ends_with(".gif") ||
       lower.ends_with(".webp") || lower.ends_with(".bmp") {
        "image".to_string()
    } else if lower.ends_with(".mp4") || lower.ends_with(".mov") ||
              lower.ends_with(".webm") || lower.ends_with(".avi") ||
              lower.ends_with(".mkv") {
        "video".to_string()
    } else if lower.ends_with(".mp3") || lower.ends_with(".m4a") ||
              lower.ends_with(".ogg") || lower.ends_with(".wav") ||
              lower.ends_with(".flac") {
        "audio".to_string()
    } else {
        "unknown".to_string()
    }
}

async fn create_thumbnail(
    thumb_dir: &Path,
    source_path: &Path,
    url: &str
) -> Result<String> {
    let thumb_path = get_thumbnail_cache_path(thumb_dir, url)?;

    // Check if thumbnail already exists
    if thumb_path.exists() {
        println!("[MEDIA_PREVIEW] Thumbnail already exists: {:?}", thumb_path);
        return Ok(thumb_path.to_string_lossy().to_string());
    }

    println!("[MEDIA_PREVIEW] Creating thumbnail: {:?}", thumb_path);

    let img = image::open(source_path)
        .map_err(|e| Error::Image(format!("Failed to open image: {}", e)))?;

    let thumbnail = img.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, FilterType::Lanczos3);

    thumbnail.save(&thumb_path)
        .map_err(|e| Error::Image(format!("Failed to save thumbnail: {}", e)))?;

    Ok(thumb_path.to_string_lossy().to_string())
}
