/**
 * Drizzle implementation of PostPort
 */

import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { PostAdaptor } from '@o19/foundframe-front/ports';
import type { PostPort } from '@o19/foundframe-front/ports';
import type { Post, CreatePost, UpdatePost, PostFilters } from '@o19/foundframe-front/domain';
import { post } from '../schema.js';

export class DrizzlePostAdaptor extends PostAdaptor implements PostPort {
  constructor(private db: BaseSQLiteDatabase<any, any>) {
    super();
  }

  async create(data: CreatePost): Promise<Post> {
    const result = await this.db
      .insert(post)
      .values({
        bits: data.bits,
        links: data.links ?? [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return this.toDomain(result[0]);
  }

  async getById(id: number): Promise<Post | null> {
    const result = await this.db.select().from(post).where(eq(post.id, id)).limit(1);
    return result.length > 0 ? this.toDomain(result[0]) : null;
  }

  async update(id: number, data: UpdatePost): Promise<void> {
    const updateData: Partial<typeof post.$inferInsert> = {};

    if (data.bits) updateData.bits = data.bits;
    if (data.links) updateData.links = data.links;

    updateData.updatedAt = new Date();

    await this.db.update(post).set(updateData).where(eq(post.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(post).where(eq(post.id, id));
  }

  async query(filters?: PostFilters): Promise<Post[]> {
    let query = this.db.select().from(post).$dynamic();

    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(post.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(post.createdAt, filters.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Default sort by recent
    let query2 = query.orderBy(desc(post.createdAt));

    const results = await query2;
    return results.map((r) => this.toDomain(r));
  }

  async searchByKeyword(keyword: string): Promise<Post[]> {
    const all = await this.query();
    const lowerKeyword = keyword.toLowerCase();

    return all.filter((post) =>
      post.bits.some((bit: any) => {
        if (bit.type === 'text') {
          return bit.content?.toLowerCase().includes(lowerKeyword);
        }
        if (bit.type === 'link') {
          return (
            bit.url?.toLowerCase().includes(lowerKeyword) ||
            bit.preview?.title?.toLowerCase().includes(lowerKeyword) ||
            bit.preview?.description?.toLowerCase().includes(lowerKeyword)
          );
        }
        return false;
      })
    );
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`COUNT(*)` }).from(post);
    return result[0]?.count ?? 0;
  }

  private toDomain(row: typeof post.$inferSelect): Post {
    return {
      id: row.id,
      bits: row.bits as any[],
      links: (row.links as any[]) ?? [],
      contentHash: row.contentHash ?? undefined,
      authorDid: row.authorDid ?? undefined,
      signature: row.signature ?? undefined,
      createdAt: row.createdAt,
      modifiedAt: row.updatedAt ?? undefined
    };
  }
}
