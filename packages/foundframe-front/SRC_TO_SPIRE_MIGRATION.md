# Migration Plan: src/services/ → spire/

## Overview
Replace handwritten services with generated ones from `spire/`, keeping only method overrides that provide custom logic.

**NEW: Filtering System** - Loom now generates `list(limit, offset, filter)` with Filter interfaces, replacing the need for custom `query()` methods.

---

## Filter Types Comparison

| Entity | Handwritten (src) | Loom (generated) | Status |
|--------|-------------------|------------------|--------|
| Bookmark | `BookmarkFilters` | `BookmarkFilter` | ⚠️ Rename plural→singular |
| Post | `PostFilters` | `PostFilter` | ⚠️ Rename plural→singular |
| Media | ❌ None | `MediaFilter` | ✅ New |
| Person | ❌ None | `PersonFilter` | ✅ New |
| Conversation | ❌ None | ❌ None | N/A |

**Action:** Update handwritten entity files to use singular `Filter` naming to match loom.

---

## Service-by-Service Migration

### 1. BookmarkService

**Generated (spire):** `getById(id), getBookmark(uri), list(limit, offset, filter), create(url, title, notes), delete(id)`

| SRC Method | Generated Equivalent | Action | Notes |
|------------|---------------------|--------|-------|
| `create(data)` | `create(url, title, notes)` | 🔧 ADAPT | Destructure data object |
| `getById(id)` | `getById(id)` | ✅ SAME | Keep |
| `update(id, data)` | ❌ MISSING | ⚠️ ADD TO LOOM | Add `@loom.crud.update` |
| `delete(id)` | `delete(id)` | ✅ SAME | Keep |
| `getByUrl(url)` | `getBookmark(uri)` | 🔧 RENAME | URI vs URL naming |
| `searchByKeyword(keyword)` | Use `list(0, 100, {title: keyword})` | 🔧 OVERRIDE | Partial match on filter |
| `query(filters)` | `list(limit, offset, filter)` | 🗑️ DELETE | Use generated list() |

**Migration:**
```typescript
// src/services/bookmark.service.ts
import { 
  BookmarkService as GeneratedBookmarkService 
} from '../spire/src/services/bookmark.service.js';
import type { BookmarkPort } from '../spire/src/ports/bookmark.port.js';
import type { CreateBookmark, UpdateBookmark } from '../domain/entities/bookmark.js';

export class BookmarkService extends GeneratedBookmarkService {
  constructor(adaptor: BookmarkPort) {
    super(adaptor, adaptor);
  }

  // Adapter: Accept data object, destructure for generated method
  async create(data: CreateBookmark): Promise<Bookmark> {
    return super.create(data.url, data.title, data.notes);
  }

  // Override: Partial match search (filter does exact match)
  async searchByKeyword(keyword: string): Promise<Bookmark[]> {
    const all = await this.list(0, 1000); // Get all
    return all.filter(b => 
      b.title?.toLowerCase().includes(keyword.toLowerCase()) ||
      b.notes?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Alias: Old getByUrl → new getBookmark
  async getByUrl(url: string): Promise<Bookmark | null> {
    return this.readAdaptor.getBookmark(url);
  }
}
```

---

### 2. ConversationService

**Generated:** `getById, list, create, update, delete, addParticipant, removeParticipant, listParticipants, addConversationMedia, removeConversationMedia, listConversationMedia`

**Status:** ✅ COMPLETE - No filter system for conversations

| SRC Method | Generated Equivalent | Action |
|------------|---------------------|--------|
| `addParticipant(cId, pId, role)` | `addParticipant(cId, pId, role)` | ✅ SAME |
| `removeParticipant(cId, pId)` | `removeParticipant(cId, pId)` | ✅ SAME |
| `addMedia(cId, mId, context)` | `addConversationMedia(cId, mId, context)` | 🔧 RENAME |
| `removeMedia(cId, mId)` | `removeConversationMedia(cId, mId)` | 🔧 RENAME |

**Migration:** Just import and re-export, or simple extension for renames:
```typescript
export { ConversationService } from '../spire/src/services/conversation.service.js';
// OR create aliases if needed
```

---

### 3. MediaService

**Generated:** `getById, getMedia(hash), list(limit, offset, filter), createLink(...), createFile(...), delete`

| SRC Method | Generated Equivalent | Action | Notes |
|------------|---------------------|--------|-------|
| `create(data)` | `createLink(url, mimeType, title, dir)` OR `createFile(path, title)` | 🔧 ADAPT | Media has TWO create methods |
| `getById(id)` | `getById(id)` | ✅ SAME | Keep |
| `update(id, data)` | ❌ MISSING | ⚠️ ADD TO LOOM | Add `@loom.crud.update` |
| `delete(id)` | `delete(id)` | ✅ SAME | Keep |
| `findByContentHash(hash)` | `getMedia(hash)` | 🔧 RENAME | Use generated |

**Migration:**
```typescript
export class MediaService extends GeneratedMediaService {
  constructor(adaptor: MediaPort) {
    super(adaptor, adaptor);
  }

  // Adapter: Route to appropriate create method
  async create(data: CreateMedia): Promise<Media> {
    if (data.uri.startsWith('http')) {
      return this.createLink(data.uri, data.mimeType, data.title);
    } else {
      return this.createFile(data.uri, data.title);
    }
  }

  // Alias
  async findByContentHash(hash: string): Promise<Media | null> {
    return this.readAdaptor.getMedia(hash);
  }
}
```

---

### 4. PersonService

**Generated:** `getById, getPerson(handle), list(limit, offset, filter), create, update, delete`

| SRC Method | Generated Equivalent | Action | Notes |
|------------|---------------------|--------|-------|
| `create(data)` | `create(displayName, handle, metadata)` | 🔧 ADAPT | Destructure |
| `getById(id)` | `getById(id)` | ✅ SAME | Keep |
| `update(id, data)` | `update(id, displayName, handle, metadata)` | 🔧 ADAPT | Destructure |
| `delete(id)` | `delete(id)` | ✅ SAME | Keep |
| `search(query, limit)` | Use `list(limit, 0, {displayName: query})` | 🔧 OVERRIDE | Partial match |
| `getByDid(did)` | ❌ MISSING | 🔧 OVERRIDE | Filter manually |
| `getAll(limit)` | `list(limit)` | 🔧 ALIAS | Same thing |

**Migration:**
```typescript
export class PersonService extends GeneratedPersonService {
  constructor(adaptor: PersonPort) {
    super(adaptor, adaptor);
  }

  async create(data: CreatePerson): Promise<Person> {
    return super.create(data.displayName, data.handle, data.metadata);
  }

  async update(id: number, data: UpdatePerson): Promise<void> {
    return super.update(id, data.displayName, data.handle, data.metadata);
  }

  // Override: Partial match search
  async search(query: string, limit?: number): Promise<Person[]> {
    const all = await this.list(limit || 100, 0);
    return all.filter(p => 
      p.displayName.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Override: DID lookup (filter doesn't support this)
  async getByDid(did: string): Promise<Person | null> {
    const all = await this.list(1000, 0);
    return all.find(p => p.did === did) || null;
  }

  // Alias
  getAll(limit?: number) {
    return this.list(limit || 100, 0);
  }
}
```

---

### 5. PostService

**Generated:** `getById, list(limit, offset, filter), create(bits), update(id, bits), delete(id)`

| SRC Method | Generated Equivalent | Action | Notes |
|------------|---------------------|--------|-------|
| `commitAccumulation(accum)` | ❌ NONE | 🔧 OVERRIDE | Critical business logic |
| `create(data)` | `create(bits)` | 🔧 ADAPT | Destructure |
| `getById(id)` | `getById(id)` | ✅ SAME | Keep |
| `update(id, data)` | `update(id, bits)` | 🔧 ADAPT | Destructure |
| `delete(id)` | `delete(id)` | ✅ SAME | Keep |
| `query(filters)` | `list(limit, offset, filter)` | 🗑️ DELETE | Use list() |
| `searchByKeyword(keyword)` | ❌ NONE | 🔧 OVERRIDE | Search in bits |
| `count()` | ❌ NONE | 🔧 OVERRIDE | `list().length` |

**Migration:**
```typescript
export class PostService extends GeneratedPostService {
  constructor(adaptor: PostPort) {
    super(adaptor, adaptor);
  }

  // CRITICAL: Preserve business logic
  async commitAccumulation(accumulation: AccumulatingPost): Promise<Post> {
    const post = await this.create(accumulation.bits);
    // TODO: Handle draft links when implemented
    return post;
  }

  // Adapter
  async create(data: CreatePost): Promise<Post> {
    return super.create(data.bits);
  }

  async update(id: number, data: UpdatePost): Promise<void> {
    return super.update(id, data.bits);
  }

  // Override: Search in bits content
  async searchByKeyword(keyword: string): Promise<Post[]> {
    const all = await this.list(1000, 0);
    return all.filter(p => 
      p.bits.some(b => b.type === 'text' && b.content?.includes(keyword))
    );
  }

  async count(): Promise<number> {
    const all = await this.list(1000, 0);
    return all.length;
  }
}
```

---

### 6. TheStreamService

**Generated:** `list(limit, before), getById, delete, getEntriesByKind, search, addBookmark, addPost, addMedia, addPerson, addConversation`

| SRC Method | Generated Equivalent | Action | Notes |
|------------|---------------------|--------|-------|
| `addPerson(id, seenAt)` | `addPerson(id, seenAt)` | ✅ SAME | Date→number conversion |
| `addPost(id, seenAt)` | `addPost(id, seenAt)` | ✅ SAME | Date→number conversion |
| `addMedia(id, seenAt)` | `addMedia(id, seenAt)` | ✅ SAME | Date→number conversion |
| `addBookmark(id, seenAt)` | `addBookmark(id, seenAt)` | ✅ SAME | Date→number conversion |
| `addConversation(id, seenAt)` | `addConversation(id, seenAt)` | ✅ SAME | Date→number conversion |
| `addChunk(type, id, seenAt)` | Use typed addXxx methods | 🔧 OVERRIDE | Switch statement |
| `getById(id)` | `getById(id)` | ✅ SAME | Keep |
| `query(filters)` | `list(limit, before)` + filter | 🔧 OVERRIDE | Client-side filter |
| `reExperience(id, seenAt)` | ❌ NONE | 🔧 OVERRIDE | Custom business logic |
| `remove(id)` | `delete(id)` | 🔧 RENAME | Same thing |
| `count(filters)` | ❌ NONE | 🔧 OVERRIDE | Filter + count |

**Migration:**
```typescript
export class TheStreamService extends GeneratedTheStreamService {
  constructor(adaptor: TheStreamPort) {
    super(adaptor, adaptor);
  }

  // Generic add using typed methods
  async addChunk(
    type: StreamChunkType, 
    entityId: number, 
    seenAt?: Date
  ): Promise<TheStreamEntry> {
    const timestamp = seenAt?.getTime();
    switch (type) {
      case 'bookmark': return this.addBookmark(entityId, timestamp);
      case 'post': return this.addPost(entityId, timestamp);
      case 'media': return this.addMedia(entityId, timestamp);
      case 'person': return this.addPerson(entityId, timestamp);
      case 'conversation': return this.addConversation(entityId, timestamp);
    }
  }

  // Custom business logic
  async reExperience(id: number, newSeenAt?: Date): Promise<TheStreamEntry> {
    const entry = await this.getById(id);
    // Create new entry with updated seenAt
    return this.addChunk(entry.chunk.type, entry.chunk.id, newSeenAt);
  }

  // Alias
  async remove(id: number): Promise<void> {
    return this.delete(id);
  }

  // Client-side filtering
  async query(filters?: StreamFilters): Promise<TheStreamEntry[]> {
    const all = await this.list(filters?.limit, filters?.before);
    // Apply additional filters client-side
    return all.filter(e => {
      if (filters?.chunkTypes && !filters.chunkTypes.includes(e.chunk.type)) return false;
      return true;
    });
  }

  async count(filters?: Pick<StreamFilters, 'dateRange' | 'chunkTypes'>): Promise<number> {
    const filtered = await this.query(filters);
    return filtered.length;
  }
}
```

---

## Missing Services (No Generated Equivalent)

| Service | Status | Action |
|---------|--------|--------|
| `ViewService` | ❌ No ViewMgmt | Keep handwritten |
| `PreviewService` | ❌ No PreviewMgmt | Keep handwritten |
| `DeviceService` | ❌ No DeviceMgmt | Keep handwritten |

---

## Required Loom Updates

```typescript
// bookmark.ts - ADD:
@loom.crud.update
updateBookmark(id: number, title?: string, notes?: string): boolean {
  throw new Error('Imprint only');
}

// media.ts - ADD:
@loom.crud.update
updateMedia(id: number, title?: string): boolean {
  throw new Error('Imprint only');
}
```

---

## Domain Entity Updates

Rename Filter types to match loom (singular):

```typescript
// bookmark.ts
export interface BookmarkFilter {  // WAS: BookmarkFilters
  // ...
}

// post.ts
export interface PostFilter {  // WAS: PostFilters
  // ...
}
```

---

## New src/services/ Structure

```
src/services/
├── index.ts                    # Re-export from spire + extensions
├── bookmark.service.ts         # Extension with data adapters + search
├── conversation.service.ts     # Re-export or simple aliases
├── media.service.ts            # Extension with create routing
├── person.service.ts           # Extension with search/DID lookup
├── post.service.ts             # Extension (commitAccumulation!)
├── thestream.service.ts        # Extension (addChunk, reExperience)
├── view.service.ts             # Keep handwritten
├── preview.service.ts          # Keep handwritten
└── device.service.ts           # Keep handwritten
```

---

## Migration Priority

1. **P0 - Critical:** PostService (`commitAccumulation`)
2. **P1 - High:** TheStreamService (core functionality)
3. **P2 - Medium:** PersonService, MediaService, BookmarkService
4. **P3 - Low:** ConversationService (mostly same)
5. **P4 - Keep:** View, Preview, Device services
