//! Person operations for TheStream™
//!
//! Handles person/contact ingestions into the Personal Knowledge Base.

use crate::db::PersonFilter;
use crate::error::{Error, Result};
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Person extension trait for TheStream
pub trait PersonStream {
  /// Add a person to the PKB (convenience wrapper).
  fn add_person(
    &self,
    display_name: impl Into<String>,
    handle: Option<&str>,
  ) -> Result<StreamEntry>;

  /// List persons from the database with optional filtering.
  ///
  /// Requires database indexing to be enabled.
  async fn list_persons_filtered(
    &self,
    limit: Option<usize>,
    offset: Option<usize>,
    filter: PersonFilter,
  ) -> Result<Vec<crate::db::PersonData>>;
}

impl PersonStream for TheStream {
  fn add_person(
    &self,
    display_name: impl Into<String>,
    handle: Option<&str>,
  ) -> Result<StreamEntry> {
    let directory = DirectoryId::from("people");

    let data = serde_json::json!({
        "display_name": display_name.into(),
        "handle": handle,
        "metadata": {},
    });

    let data = crate::pkb::StructuredData::new("Person", data);

    let filename = data.generate_filename(crate::pkb::now_timestamp(), None);
    let path = std::path::PathBuf::from(filename);

    self.add_entry(directory, path, data)
  }

  async fn list_persons_filtered(
    &self,
    limit: Option<usize>,
    offset: Option<usize>,
    filter: PersonFilter,
  ) -> Result<Vec<crate::db::PersonData>> {
    let db = self.db.as_ref()
      .ok_or_else(|| Error::Other("Database not available".into()))?;
    
    db.list_persons(limit, offset, filter).await
      .map_err(|e| Error::Other(format!("Database error: {}", e)))
  }
}
