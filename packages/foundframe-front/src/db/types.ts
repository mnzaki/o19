import type { ColumnType } from 'kysely';
export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Bookmark = {
  id: Generated<number>;
  url: string;
  title: string | null;
  notes: string | null;
  creation_context: string;
  created_at: Generated<number>;
};
export type Conversation = {
  id: Generated<number>;
  title: string | null;
  content: string;
  capture_time: Generated<number>;
  first_entry_time: number | null;
  last_entry_time: number | null;
  source_url: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
};
export type ConversationMedia = {
  conversation_id: number;
  media_id: number;
  context: string | null;
};
export type ConversationParticipant = {
  conversation_id: number;
  person_id: number;
  role: string | null;
};
export type InputDraft = {
  type: string;
  content: string;
  updated_at: Generated<number>;
};
export type Media = {
  id: Generated<number>;
  content_hash: string | null;
  mime_type: string;
  uri: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  metadata: string | null;
  created_at: Generated<number>;
};
export type MediaSource = {
  id: Generated<number>;
  url: string;
  adapter_type: string;
  cursor_state: string | null;
  capabilities: string;
  config: string | null;
  last_polled_at: number | null;
  last_error: string | null;
  is_active: Generated<number>;
  created_at: Generated<number>;
  updated_at: Generated<number>;
};
export type Person = {
  id: Generated<number>;
  display_name: string;
  handle: string | null;
  avatar_media_id: number | null;
  metadata: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
};
export type Post = {
  id: Generated<number>;
  bits: string;
  links: Generated<string>;
  content_hash: string | null;
  author_did: string | null;
  signature: string | null;
  created_at: Generated<number>;
  updated_at: Generated<number>;
};
export type SchemaMeta = {
  id: Generated<number>;
  version: number;
  updated_at: Generated<number>;
};
export type SessionState = {
  key: string;
  value: string;
  updated_at: Generated<number>;
};
export type SyncLog = {
  id: Generated<number>;
  directory: string;
  started_at: number;
  completed_at: number | null;
  entries_pulled: Generated<number>;
  entries_pushed: Generated<number>;
  error: string | null;
  created_at: Generated<number>;
};
export type TheStream = {
  id: Generated<number>;
  seen_at: number;
  person_id: number | null;
  post_id: number | null;
  media_id: number | null;
  bookmark_id: number | null;
  conversation_id: number | null;
  directory: string | null;
  kind: string | null;
  content_hash: string | null;
  created_at: Generated<number>;
};
export type View = {
  id: Generated<number>;
  view_index: number;
  label: string | null;
  badge: Generated<string>;
  filters: string;
  sort_by: Generated<string>;
  is_pinned: Generated<number>;
  is_thestream: Generated<number>;
  created_at: Generated<number>;
  updated_at: Generated<number>;
};
export type DB = {
  bookmark: Bookmark;
  conversation: Conversation;
  conversation_media: ConversationMedia;
  conversation_participant: ConversationParticipant;
  input_draft: InputDraft;
  media: Media;
  media_source: MediaSource;
  person: Person;
  post: Post;
  schema_meta: SchemaMeta;
  session_state: SessionState;
  sync_log: SyncLog;
  thestream: TheStream;
  view: View;
};
