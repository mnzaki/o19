/**
 * Drizzle implementation of MediaPort
 */

import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { MediaAdaptor } from '@o19/foundframe-front/ports';
import type { MediaPort } from '@o19/foundframe-front/ports';
import type { Media, CreateMedia, UpdateMedia } from '@o19/foundframe-front/domain';
import { media } from '../schema.js';

export class DrizzleMediaAdaptor extends MediaAdaptor implements MediaPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async create(data: CreateMedia): Promise<Media> {
    const result = await this.db
      .insert(media)
      .values({
        contentHash: data.contentHash,
        mimeType: data.mimeType,
        uri: data.uri,
        width: data.width,
        height: data.height,
        durationMs: data.durationMs,
        metadata: data.metadata,
        createdAt: new Date()
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async getById(id: number): Promise<Media | null> {
    const result = await this.db.select().from(media).where(eq(media.id, id)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async update(id: number, data: UpdateMedia): Promise<void> {
    const updateData: Partial<typeof media.$inferInsert> = {};

    if (data.mimeType) updateData.mimeType = data.mimeType;
    if (data.uri) updateData.uri = data.uri;
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.durationMs !== undefined) updateData.durationMs = data.durationMs;
    if (data.metadata) updateData.metadata = data.metadata;

    await this.db.update(media).set(updateData).where(eq(media.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(media).where(eq(media.id, id));
  }

  async findByContentHash(contentHash: string): Promise<Media | null> {
    const result = await this.db
      .select()
      .from(media)
      .where(eq(media.contentHash, contentHash))
      .limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  private toDomain(row: typeof media.$inferSelect): Media {
    return {
      id: row.id,
      contentHash: row.contentHash ?? undefined,
      mimeType: row.mimeType,
      uri: row.uri,
      width: row.width ?? undefined,
      height: row.height ?? undefined,
      durationMs: row.durationMs ?? undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row.createdAt
    };
  }
}
