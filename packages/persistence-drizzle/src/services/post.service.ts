/**
 * Post Service
 *
 * Business logic for posts using Drizzle ORM.
 */

import { eq, desc, asc, and, gte, lte, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { Post, AccumulatingPost } from '@repo/persistence';
import { commitAccumulation } from '@repo/persistence';
import type { IPostService, PostServiceFilters } from '@repo/persistence/services'
import { posts } from '../schema.js';

export class PostService implements IPostService {
  constructor(private db: BaseSQLiteDatabase<any, any>) {}

  async create(accumulation: AccumulatingPost): Promise<Post> {
    const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const post = commitAccumulation(accumulation, id);

    await this.db.insert(posts).values({
      id: post.id,
      bits: post.bits,
      links: post.links,
      createdAt: post.createdAt,
      modifiedAt: post.modifiedAt
    });

    return post;
  }

  async getById(id: string): Promise<Post | null> {
    const result = await this.db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return result.length > 0 ? this.toDomainPost(result[0]) : null;
  }

  async getAll(filters?: PostServiceFilters): Promise<Post[]> {
    let query = this.db.select().from(posts);

    const conditions = [];

    if (filters?.dateFrom) {
      conditions.push(gte(posts.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(posts.createdAt, filters.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by createdAt
    let query2 = filters?.sortBy === 'oldest'
      ? query.orderBy(asc(posts.createdAt))
      : query.orderBy(desc(posts.createdAt));

    // Apply limit and offset
    let query3;
    if (filters?.limit) {
      query3 = query2.limit(filters.limit);
    }
    if (filters?.offset) {
      query3 = (query3 || query2).offset(filters.offset);
    }

    const results = await (query3 || query2);
    return !results ? [] : results.map(r => this.toDomainPost(r));
  }

  async update(id: string, updates: Partial<Post>): Promise<void> {
    const updateData: Partial<typeof posts.$inferInsert> = {};

    if (updates.bits) {
      updateData.bits = updates.bits;
    }
    if (updates.links) {
      updateData.links = updates.links;
    }

    updateData.modifiedAt = new Date();

    await this.db.update(posts).set(updateData).where(eq(posts.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(posts).where(eq(posts.id, id));
  }

  async searchByKeyword(keyword: string): Promise<Post[]> {
    const all = await this.getAll();
    const lowerKeyword = keyword.toLowerCase();

    return all.filter(post =>
      post.bits.some((bit) => {
        if (bit.type === 'text') {
          return bit.content?.toLowerCase().includes(lowerKeyword);
        }
        if (bit.type === 'link') {
          return bit.url?.toLowerCase().includes(lowerKeyword) ||
                 bit.preview?.title?.toLowerCase().includes(lowerKeyword) ||
                 bit.preview?.description?.toLowerCase().includes(lowerKeyword);
        }
        return false;
      })
    );
  }

  async getByDateRange(from: Date, to: Date): Promise<Post[]> {
    return this.getAll({ dateFrom: from, dateTo: to });
  }

  async count(): Promise<number> {
    const result = await this.db.select({ count: sql<number>`COUNT(*)` }).from(posts);
    return result[0]?.count ?? 0;
  }

  private toDomainPost(row: typeof posts.$inferSelect): Post {
    return {
      id: row.id,
      bits: row.bits as Post['bits'],
      links: row.links as Post['links'],
      createdAt: row.createdAt,
      modifiedAt: row.modifiedAt ?? undefined
    };
  }
}
