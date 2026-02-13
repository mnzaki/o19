use scraper::{Html, Selector};
use serde::Serialize;
use crate::preview::resolve_url;
use crate::error::{Error, Result};

// Maximum number of images to extract from the page
const MAX_IMAGES: usize = 10;

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HtmlPreviewJSON {
    pub title: Option<String>,
    pub description: Option<String>,
    /// The main/primary image URL
    pub image_url: Option<String>,
    /// All images found on the page (up to MAX_IMAGES)
    pub images: Vec<String>,
    pub site_name: Option<String>,
}

pub async fn json(url: String) -> Result<HtmlPreviewJSON> {
    // Fetch the webpage
    let response = reqwest::get(&url)
        .await
        .map_err(|e| Error::Fetch(e.to_string()))?;

    let html_text = response
        .text()
        .await
        .map_err(|e| Error::Parse(e.to_string()))?;

    // Parse HTML
    let document = Html::parse_document(&html_text);

    // Extract title
    let title = extract_title(&document);

    // Extract description
    let description = extract_description(&document);

    // Extract site name
    let site_name = extract_site_name(&document);

    // Extract images
    let images = extract_images(&document, &url);

    // The main image is the first one (if any)
    let image_url = images.first().cloned();

    Ok(HtmlPreviewJSON {
        title,
        description,
        image_url,
        images,
        site_name,
    })
}

fn extract_title(document: &Html) -> Option<String> {
    // Try Open Graph title first
    if let Some(title) = extract_meta_content(document, "og:title", "property") {
        return Some(title);
    }

    // Try Twitter title
    if let Some(title) = extract_meta_content(document, "twitter:title", "name") {
        return Some(title);
    }

    // Fall back to <title> tag
    let selector = Selector::parse("title").ok()?;
    document.select(&selector).next()?.text().next().map(|t| t.trim().to_string())
}

fn extract_description(document: &Html) -> Option<String> {
    // Try Open Graph description
    if let Some(desc) = extract_meta_content(document, "og:description", "property") {
        return Some(desc);
    }

    // Try Twitter description
    if let Some(desc) = extract_meta_content(document, "twitter:description", "name") {
        return Some(desc);
    }

    // Fall back to meta description
    extract_meta_content(document, "description", "name")
}

fn extract_site_name(document: &Html) -> Option<String> {
    extract_meta_content(document, "og:site_name", "property")
        .or_else(|| extract_meta_content(document, "application-name", "name"))
}

fn extract_meta_content(document: &Html, attr_value: &str, attr_name: &str) -> Option<String> {
    let selector = Selector::parse(&format!("meta[{}='{}']", attr_name, attr_value)).ok()?;
    document.select(&selector).next()
        .and_then(|el| el.value().attr("content"))
        .map(|s| s.trim().to_string())
}

fn extract_images(document: &Html, base_url: &str) -> Vec<String> {
    let mut images = Vec::new();

    // First try Open Graph images
    let og_selector = Selector::parse("meta[property='og:image']").unwrap();
    for element in document.select(&og_selector) {
        if let Some(url) = element.value().attr("content") {
            if let Some(absolute) = resolve_url(url, base_url) {
                images.push(absolute);
                if images.len() >= MAX_IMAGES {
                    return images;
                }
            }
        }
    }

    // Try Twitter images
    let twitter_selector = Selector::parse("meta[name='twitter:image']").unwrap();
    for element in document.select(&twitter_selector) {
        if let Some(url) = element.value().attr("content") {
            if let Some(absolute) = resolve_url(url, base_url) {
                if !images.contains(&absolute) {
                    images.push(absolute);
                    if images.len() >= MAX_IMAGES {
                        return images;
                    }
                }
            }
        }
    }

    // Fall back to <img> tags
    let img_selector = Selector::parse("img").unwrap();
    for element in document.select(&img_selector) {
        if let Some(src) = element.value().attr("src") {
            if let Some(absolute) = resolve_url(src, base_url) {
                if !images.contains(&absolute) {
                    images.push(absolute);
                    if images.len() >= MAX_IMAGES {
                        return images;
                    }
                }
            }
        }
    }

    images
}
