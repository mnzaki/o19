pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("HTTP request failed: {0}")]
    Reqwest(#[from] reqwest::Error),
    
    #[error("SQL error: {0}")]
    Sql(#[from] sqlx::Error),
    
    #[error("Image processing error: {0}")]
    Image(String),
    
    #[error("Failed to fetch page: {0}")]
    Fetch(String),
    
    #[error("Failed to parse response: {0}")]
    Parse(String),
    
    #[error("Failed to download media: {0}")]
    Download(String),
    
    #[error("Failed to create directory: {0}")]
    CreateDir(String),
    
    #[error("Failed to process media: {0}")]
    MediaProcessing(String),
    
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    
    #[error("Database connection failed: {0}")]
    DatabaseConnection(String),
    
    #[error("Query failed: {0}")]
    QueryFailed(String),
    
    #[error("Path resolution failed: {0}")]
    PathResolution(String),
}

impl From<image::ImageError> for Error {
    fn from(e: image::ImageError) -> Self {
        Error::Image(e.to_string())
    }
}
