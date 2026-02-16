//! PKB URL parsing and generation.
//!
//! Format: `pkb://{emoji_identity}/{repo}/{path}?v={commit_hash}#{anchor}`

use std::fmt;
use crate::EmojiIdentity;

/// A parsed PKB URL.
#[derive(Debug, Clone, PartialEq)]
pub struct PkbUrl {
    /// The emoji-encoded identity (authority).
    pub identity: String,
    /// Repository name.
    pub repo: String,
    /// Path within the repository.
    pub path: String,
    /// Optional commit hash (version).
    pub version: Option<String>,
    /// Optional Xanadu-style anchor/fragment.
    pub anchor: Option<String>,
}

impl PkbUrl {
    /// Create a new PKB URL.
    pub fn new(
        identity: impl Into<String>,
        repo: impl Into<String>,
        path: impl Into<String>,
    ) -> Self {
        Self {
            identity: identity.into(),
            repo: repo.into(),
            path: path.into(),
            version: None,
            anchor: None,
        }
    }

    /// Set the version (commit hash).
    pub fn with_version(mut self, version: impl Into<String>) -> Self {
        self.version = Some(version.into());
        self
    }

    /// Set the anchor (Xanadu fragment).
    pub fn with_anchor(mut self, anchor: impl Into<String>) -> Self {
        self.anchor = Some(anchor.into());
        self
    }

    /// Parse a PKB URL string.
    pub fn parse(url: &str) -> Result<Self, PkbUrlError> {
        if !url.starts_with("pkb://") {
            return Err(PkbUrlError::InvalidScheme);
        }

        let rest = &url[6..]; // Skip "pkb://"
        
        // Split on # for anchor
        let (rest, anchor) = match rest.find('#') {
            Some(i) => (&rest[..i], Some(rest[i+1..].to_string())),
            None => (rest, None),
        };

        // Split on ? for query/version
        let (rest, version) = match rest.find('?') {
            Some(i) => {
                let query = &rest[i+1..];
                let v = query.strip_prefix("v=").map(|s| s.to_string());
                (&rest[..i], v)
            }
            None => (rest, None),
        };

        // Split path components
        let parts: Vec<&str> = rest.split('/').collect();
        if parts.len() < 3 {
            return Err(PkbUrlError::InvalidPath);
        }

        let identity = parts[0].to_string();
        let repo = parts[1].to_string();
        let path = parts[2..].join("/");

        Ok(Self {
            identity,
            repo,
            path,
            version,
            anchor,
        })
    }

    /// Build from an EmojiIdentity.
    pub fn from_identity(
        identity: &EmojiIdentity,
        repo: impl Into<String>,
        path: impl Into<String>,
    ) -> Self {
        Self::new(identity.string.clone(), repo, path)
    }
}

impl fmt::Display for PkbUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "pkb://{}/{}/{}", self.identity, self.repo, self.path)?;
        
        if let Some(v) = &self.version {
            write!(f, "?v={}", v)?;
        }
        
        if let Some(a) = &self.anchor {
            write!(f, "#{}", a)?;
        }
        
        Ok(())
    }
}

/// Errors that can occur when parsing PKB URLs.
#[derive(Debug, Clone, PartialEq)]
pub enum PkbUrlError {
    InvalidScheme,
    InvalidPath,
    InvalidIdentity,
}

impl fmt::Display for PkbUrlError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidScheme => write!(f, "URL must start with 'pkb://'"),
            Self::InvalidPath => write!(f, "Invalid path structure"),
            Self::InvalidIdentity => write!(f, "Invalid emoji identity"),
        }
    }
}

impl std::error::Error for PkbUrlError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_roundtrip() {
        let url = PkbUrl::new("🌲😀🍕", "notes", "diary/2024/My Day.js.md")
            .with_version("abc123")
            .with_anchor("char=10,250");

        let url_string = url.to_string();
        assert!(url_string.starts_with("pkb://"));
        assert!(url_string.contains("?v=abc123"));
        assert!(url_string.contains("#char=10,250"));

        let parsed = PkbUrl::parse(&url_string).unwrap();
        assert_eq!(parsed.identity, "🌲😀🍕");
        assert_eq!(parsed.repo, "notes");
        assert_eq!(parsed.path, "diary/2024/My Day.js.md");
        assert_eq!(parsed.version, Some("abc123".to_string()));
        assert_eq!(parsed.anchor, Some("char=10,250".to_string()));
    }

    #[test]
    fn test_parse_simple() {
        let url = PkbUrl::parse("pkb://🌲😀🍕/media/photos/Sunset.jpg").unwrap();
        assert_eq!(url.identity, "🌲😀🍕");
        assert_eq!(url.repo, "media");
        assert_eq!(url.path, "photos/Sunset.jpg");
        assert!(url.version.is_none());
        assert!(url.anchor.is_none());
    }

    #[test]
    fn test_invalid_scheme() {
        assert!(PkbUrl::parse("http://example.com").is_err());
    }
}
