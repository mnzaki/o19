//! Conversation operations for TheStream™
//!
//! Handles conversation ingestions into the Personal Knowledge Base.
//!
//! This module currently serves as a placeholder for future conversation-related
//! streaming operations. Conversations in foundframe represent multi-party
//! communication contexts that can enter TheStream™ as encounter events.

use crate::error::Result;
use crate::pkb::DirectoryId;
use crate::thestream::{StreamEntry, TheStream};

/// Conversation extension trait for TheStream
pub trait ConversationStream {
  /// Add a conversation reference to the stream.
  ///
  /// This records that a conversation was encountered at a specific time,
  /// creating a StreamEntry that references the conversation without
  /// duplicating its content.
  ///
  /// # Arguments
  /// * `conversation_id` - Identifier for the conversation
  /// * `title` - Optional title for display
  fn add_conversation(
    &self,
    conversation_id: impl Into<String>,
    title: Option<&str>,
  ) -> Result<StreamEntry>;
}

impl ConversationStream for TheStream {
  fn add_conversation(
    &self,
    conversation_id: impl Into<String>,
    title: Option<&str>,
  ) -> Result<StreamEntry> {
    let directory = DirectoryId::from("conversations");

    let data = serde_json::json!({
        "conversation_id": conversation_id.into(),
        "title": title,
        "encounter_type": "conversation_viewed",
    });

    let chunk = crate::pkb::StreamChunk::StructuredData {
      db_type: "Conversation".to_string(),
      data,
    };

    let filename = chunk.generate_filename(crate::pkb::now_timestamp(), title);
    let path = std::path::PathBuf::from(filename);

    self.add_chunk(directory, path, chunk)
  }
}

/// Conversation participant operations
///
/// Future extension: Managing participants within conversations
pub trait ConversationParticipants {
  /// Add a participant to a conversation
  fn add_participant(
    &self,
    conversation_id: &str,
    person_id: &str,
    role: Option<&str>,
  ) -> Result<()>;

  /// Remove a participant from a conversation
  fn remove_participant(&self, conversation_id: &str, person_id: &str) -> Result<()>;
}

/// Conversation media operations
///
/// Future extension: Media attachments to conversations
pub trait ConversationMedia {
  /// Add media reference to a conversation
  fn add_media(
    &self,
    conversation_id: &str,
    media_id: &str,
    context: Option<serde_json::Value>,
  ) -> Result<()>;

  /// Remove media reference from a conversation
  fn remove_media(&self, conversation_id: &str, media_id: &str) -> Result<()>;
}
