
#[derive(Debug, Clone)]
pub struct Bookmark {
    pub id: String,
    pub url: String,
    pub title: Option<String>,
    pub notes: Option<String>,
    pub creationContext: serde_json::Value,
    pub createdAt: String,
}

#[derive(Debug, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: Option<String>,
    pub content: serde_json::Value,
    pub captureTime: String,
    pub firstEntryTime: Option<String>,
    pub lastEntryTime: Option<String>,
    pub sourceUrl: Option<String>,
    pub createdAt: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct ConversationMedia {
    pub conversationId: String,
    pub mediaId: String,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct ConversationParticipant {
    pub conversationId: String,
    pub personId: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone)]
pub struct InputDraft {
    pub type: String,
    pub content: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct Media {
    pub id: String,
    pub contentHash: Option<String>,
    pub mimeType: String,
    pub uri: String,
    pub width: Option<String>,
    pub height: Option<String>,
    pub durationMs: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub createdAt: String,
}

#[derive(Debug, Clone)]
pub struct Person {
    pub id: String,
    pub displayName: String,
    pub handle: Option<String>,
    pub avatarMediaId: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub createdAt: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct Post {
    pub id: String,
    pub bits: serde_json::Value,
    pub links: serde_json::Value,
    pub contentHash: Option<String>,
    pub authorDid: Option<String>,
    pub signature: Option<String>,
    pub createdAt: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct SchemaMeta {
    pub id: String,
    pub version: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct SessionState {
    pub key: String,
    pub value: String,
    pub updatedAt: String,
}

#[derive(Debug, Clone)]
pub struct SyncLog {
    pub id: String,
    pub directory: String,
    pub startedAt: String,
    pub completedAt: Option<String>,
    pub entriesPulled: Option<String>,
    pub entriesPushed: Option<String>,
    pub error: Option<String>,
    pub createdAt: String,
}

#[derive(Debug, Clone)]
pub struct Thestream {
    pub id: String,
    pub seenAt: String,
    pub personId: Option<String>,
    pub postId: Option<String>,
    pub mediaId: Option<String>,
    pub bookmarkId: Option<String>,
    pub conversationId: Option<String>,
    pub directory: Option<String>,
    pub kind: Option<String>,
    pub contentHash: Option<String>,
    pub createdAt: String,
}

#[derive(Debug, Clone)]
pub struct View {
    pub id: String,
    pub viewIndex: String,
    pub label: Option<String>,
    pub badge: String,
    pub filters: serde_json::Value,
    pub sortBy: String,
    pub isPinned: bool,
    pub isThestream: bool,
    pub createdAt: String,
    pub updatedAt: String,
}

pub struct TableDef {
    pub name: &'static str,
    pub primary_key: Option<&'static str>,
    pub columns: &'static [ColumnDef],
}

pub struct ColumnDef {
    pub name: &'static str,
    pub rust_type: &'static str,
    pub nullable: bool,
}

pub const TABLES: &[TableDef] = &[
    TableDef { name: "bookmark", primary_key: None },
    TableDef { name: "conversation", primary_key: None },
    TableDef { name: "conversationMedia", primary_key: None },
    TableDef { name: "conversationParticipant", primary_key: None },
    TableDef { name: "inputDraft", primary_key: None },
    TableDef { name: "media", primary_key: None },
    TableDef { name: "person", primary_key: None },
    TableDef { name: "post", primary_key: None },
    TableDef { name: "schemaMeta", primary_key: None },
    TableDef { name: "sessionState", primary_key: None },
    TableDef { name: "syncLog", primary_key: None },
    TableDef { name: "thestream", primary_key: None },
    TableDef { name: "view", primary_key: None },
];
