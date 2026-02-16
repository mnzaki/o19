/**
 * Drizzle implementation of BookmarkPort
 */

import { eq, desc, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { BookmarkAdaptor } from '@o19/foundframe/ports';
import type { BookmarkPort } from '@o19/foundframe/ports';
import type {
  Bookmark,
  CreateBookmark,
  UpdateBookmark,
  BookmarkFilters
} from '@o19/foundframe/domain';
import { bookmark } from '../schema.js';

export class DrizzleBookmarkAdaptor extends BookmarkAdaptor implements BookmarkPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async create(data: CreateBookmark): Promise<Bookmark> {
    const result = await this.db
      .insert(bookmark)
      .values({
        url: data.url,
        title: data.title,
        notes: data.notes,
        creationContext: data.creationContext,
        createdAt: new Date()
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async getById(id: number): Promise<Bookmark | null> {
    const result = await this.db.select().from(bookmark).where(eq(bookmark.id, id)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async update(id: number, data: UpdateBookmark): Promise<void> {
    const updateData: Partial<typeof bookmark.$inferInsert> = {};

    if (data.url) updateData.url = data.url;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.creationContext) updateData.creationContext = data.creationContext;

    await this.db.update(bookmark).set(updateData).where(eq(bookmark.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(bookmark).where(eq(bookmark.id, id));
  }

  async getByUrl(url: string): Promise<Bookmark | null> {
    const result = await this.db.select().from(bookmark).where(eq(bookmark.url, url)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async searchByKeyword(keyword: string): Promise<Bookmark[]> {
    const lowerKeyword = `%${keyword.toLowerCase()}%`;
    const results = await this.db
      .select()
      .from(bookmark)
      .where(
        sql`LOWER(${bookmark.url}) LIKE ${lowerKeyword} OR
            LOWER(${bookmark.title}) LIKE ${lowerKeyword} OR
            LOWER(${bookmark.notes}) LIKE ${lowerKeyword}`
      );

    return results.map((r) => this.toDomain(r));
  }

  async query(filters?: BookmarkFilters): Promise<Bookmark[]> {
    let query = this.db.select().from(bookmark).orderBy(desc(bookmark.createdAt)).$dynamic();

    if (filters?.pagination?.limit) {
      query = query.limit(filters.pagination.limit);
    }
    if (filters?.pagination?.offset) {
      query = query.offset(filters.pagination.offset);
    }

    const results = await query;
    return results.map((r) => this.toDomain(r));
  }

  private toDomain(row: typeof bookmark.$inferSelect): Bookmark {
    return {
      id: row.id,
      url: row.url,
      title: row.title ?? undefined,
      notes: row.notes ?? undefined,
      creationContext: row.creationContext as {
        browsingHistory: string[];
        referrer?: string;
        timestamp: number;
      },
      createdAt: row.createdAt
    };
  }
}
