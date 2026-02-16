/**
 * Drizzle implementation of StreamPort
 */

import { eq, desc, asc, and, gte, lte, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { StreamAdaptor } from '@o19/foundframe/ports';
import type { StreamPort } from '@o19/foundframe/ports';
import type { StreamEntry, StreamFilters, StreamChunkType } from '@o19/foundframe/domain';
import { thestream, person, post, media, bookmark, conversation } from '../schema.js';
import type { ConversationRole } from '@o19/foundframe';

export class DrizzleStreamAdaptor extends StreamAdaptor implements StreamPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async addPerson(personId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.addChunk('person', personId, seenAt);
  }

  async addPost(postId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.addChunk('post', postId, seenAt);
  }

  async addMedia(mediaId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.addChunk('media', mediaId, seenAt);
  }

  async addBookmark(bookmarkId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.addChunk('bookmark', bookmarkId, seenAt);
  }

  async addConversation(conversationId: number, seenAt?: Date): Promise<StreamEntry> {
    return this.addChunk('conversation', conversationId, seenAt);
  }

  async addChunk(type: StreamChunkType, entityId: number, seenAt?: Date): Promise<StreamEntry> {
    const timestamp = seenAt ?? new Date();

    const baseData = {
      seenAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    let insertData;
    switch (type) {
      case 'person':
        insertData = {
          ...baseData,
          personId: entityId,
          postId: null,
          mediaId: null,
          bookmarkId: null,
          conversationId: null
        };
        break;
      case 'post':
        insertData = {
          ...baseData,
          personId: null,
          postId: entityId,
          mediaId: null,
          bookmarkId: null,
          conversationId: null
        };
        break;
      case 'media':
        insertData = {
          ...baseData,
          personId: null,
          postId: null,
          mediaId: entityId,
          bookmarkId: null,
          conversationId: null
        };
        break;
      case 'bookmark':
        insertData = {
          ...baseData,
          personId: null,
          postId: null,
          mediaId: null,
          bookmarkId: entityId,
          conversationId: null
        };
        break;
      case 'conversation':
        insertData = {
          ...baseData,
          personId: null,
          postId: null,
          mediaId: null,
          bookmarkId: null,
          conversationId: entityId
        };
        break;
    }

    const result = await this.db.insert(thestream).values(insertData).returning();

    const entry = await this.getById(result[0].id);
    if (!entry) {
      throw new Error('Failed to create stream entry');
    }
    return entry;
  }

  async getById(id: number): Promise<StreamEntry | null> {
    const result = await this.db.select().from(thestream).where(eq(thestream.id, id)).limit(1);
    if (result.length === 0) return null;
    return this.hydrateEntry(result[0]);
  }

  async query(filters?: StreamFilters): Promise<StreamEntry[]> {
    let query = this.db.select().from(thestream).$dynamic();

    const conditions = [];

    if (filters?.dateRange?.from) {
      conditions.push(gte(thestream.seenAt, filters.dateRange.from));
    }
    if (filters?.dateRange?.to) {
      conditions.push(lte(thestream.seenAt, filters.dateRange.to));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    let query2 =
      filters?.sortBy === 'oldest'
        ? query.orderBy(asc(thestream.seenAt))
        : query.orderBy(desc(thestream.seenAt));

    if (filters?.pagination?.limit) {
      query2 = query2.limit(filters.pagination.limit);
    }
    if (filters?.pagination?.offset) {
      query2 = query2.offset(filters.pagination.offset);
    }

    const results = await query2;

    const entries: StreamEntry[] = [];
    for (const row of results) {
      const entry = await this.hydrateEntry(row);
      if (entry) entries.push(entry);
    }

    if (filters?.chunkTypes && filters.chunkTypes.length > 0) {
      return entries.filter((e) => filters.chunkTypes!.includes(e.chunk.type));
    }

    return entries;
  }

  async reExperience(id: number, newSeenAt?: Date): Promise<StreamEntry> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Stream entry not found');
    return this.addChunk(existing.chunk.type, existing.chunk.id, newSeenAt);
  }

  async remove(id: number): Promise<void> {
    await this.db.delete(thestream).where(eq(thestream.id, id));
  }

  async count(filters?: Pick<StreamFilters, 'dateRange' | 'chunkTypes'>): Promise<number> {
    // TODO: implement count with filters
    const result = await this.db.select({ count: sql<number>`COUNT(*)` }).from(thestream);
    return result[0]?.count ?? 0;
  }

  private async hydrateEntry(row: typeof thestream.$inferSelect): Promise<StreamEntry | null> {
    let chunk: StreamEntry['chunk'] | null = null;

    if (row.personId) {
      const p = await this.db.select().from(person).where(eq(person.id, row.personId)).limit(1);
      if (p.length > 0) {
        chunk = {
          type: 'person',
          id: p[0].id,
          entity: {
            id: p[0].id,
            displayName: p[0].displayName,
            handle: p[0].handle ?? undefined,
            avatarMediaId: p[0].avatarMediaId ?? undefined,
            metadata: (p[0].metadata as Record<string, unknown>) ?? undefined,
            createdAt: p[0].createdAt,
            updatedAt: p[0].updatedAt ?? undefined
          }
        };
      }
    } else if (row.postId) {
      const p = await this.db.select().from(post).where(eq(post.id, row.postId)).limit(1);
      if (p.length > 0) {
        chunk = {
          type: 'post',
          id: p[0].id,
          entity: {
            id: p[0].id,
            bits: p[0].bits as any[],
            links: (p[0].links as any[]) ?? [],
            contentHash: p[0].contentHash ?? undefined,
            authorDid: p[0].authorDid ?? undefined,
            signature: p[0].signature ?? undefined,
            createdAt: p[0].createdAt,
            modifiedAt: p[0].updatedAt ?? undefined
          }
        };
      }
    } else if (row.mediaId) {
      const m = await this.db.select().from(media).where(eq(media.id, row.mediaId)).limit(1);
      if (m.length > 0) {
        chunk = {
          type: 'media',
          id: m[0].id,
          entity: {
            id: m[0].id,
            contentHash: m[0].contentHash ?? undefined,
            mimeType: m[0].mimeType,
            uri: m[0].uri,
            width: m[0].width ?? undefined,
            height: m[0].height ?? undefined,
            durationMs: m[0].durationMs ?? undefined,
            metadata: (m[0].metadata as Record<string, unknown>) ?? undefined,
            createdAt: m[0].createdAt
          }
        };
      }
    } else if (row.bookmarkId) {
      const b = await this.db
        .select()
        .from(bookmark)
        .where(eq(bookmark.id, row.bookmarkId))
        .limit(1);
      if (b.length > 0) {
        chunk = {
          type: 'bookmark',
          id: b[0].id,
          entity: {
            id: b[0].id,
            url: b[0].url,
            title: b[0].title ?? undefined,
            notes: b[0].notes ?? undefined,
            creationContext: b[0].creationContext as {
              browsingHistory: string[];
              referrer?: string;
              timestamp: number;
            },
            createdAt: b[0].createdAt
          }
        };
      }
    } else if (row.conversationId) {
      const c = await this.db
        .select()
        .from(conversation)
        .where(eq(conversation.id, row.conversationId))
        .limit(1);
      if (c.length > 0) {
        chunk = {
          type: 'conversation',
          id: c[0].id,
          entity: {
            id: c[0].id,
            title: c[0].title ?? undefined,
            content: c[0].content as unknown[],
            captureTime: c[0].captureTime,
            firstEntryTime: c[0].firstEntryTime ?? undefined,
            lastEntryTime: c[0].lastEntryTime ?? undefined,
            sourceUrl: c[0].sourceUrl ?? undefined,
            createdAt: c[0].createdAt,
            updatedAt: c[0].updatedAt ?? undefined
          }
        };
      }
    }

    if (!chunk) return null;

    return {
      id: row.id,
      seenAt: row.seenAt,
      chunk,
      createdAt: row.createdAt,
    };
  }
}
