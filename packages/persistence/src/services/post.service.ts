/**
 * Post Service
 * 
 * Business logic for posts using raw SQL.
 */

import type { DatabaseAdapter } from '../adapter.js';
import type { Post, AccumulatingPost } from '../types/index.js';
import { commitAccumulation } from '../types/index.js';
import type { IPostService, PostServiceFilters } from './interfaces.js';

type PostRow = {
  id: string;
  bits: string | unknown[];
  links: string | unknown[];
  created_at: number;
  modified_at?: number;
};

export class PostService implements IPostService {
  constructor(private adapter: DatabaseAdapter) {}

  async create(accumulation: AccumulatingPost): Promise<Post> {
    const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const post = commitAccumulation(accumulation, id);

    await this.adapter.execute(
      `INSERT INTO posts (id, bits, links, created_at, modified_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        post.id,
        JSON.stringify(post.bits),
        JSON.stringify(post.links),
        post.createdAt.getTime(),
        post.modifiedAt?.getTime() ?? null
      ]
    );

    return post;
  }

  async getById(id: string): Promise<Post | null> {
    const results = await this.adapter.query<PostRow>(
      'SELECT * FROM posts WHERE id = ?',
      [id]
    );

    return results.length > 0 ? this.toDomainPost(results[0]) : null;
  }

  async getAll(filters?: PostServiceFilters): Promise<Post[]> {
    let sql = 'SELECT * FROM posts';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters?.dateFrom) {
      conditions.push('created_at >= ?');
      params.push(filters.dateFrom.getTime());
    }
    if (filters?.dateTo) {
      conditions.push('created_at <= ?');
      params.push(filters.dateTo.getTime());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += filters?.sortBy === 'oldest' 
      ? ' ORDER BY created_at ASC'
      : ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const results = await this.adapter.query<PostRow>(sql, params);
    return results.map(r => this.toDomainPost(r));
  }

  async update(id: string, updates: Partial<Post>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.bits) {
      sets.push('bits = ?');
      params.push(JSON.stringify(updates.bits));
    }
    if (updates.links) {
      sets.push('links = ?');
      params.push(JSON.stringify(updates.links));
    }

    sets.push('modified_at = ?');
    params.push(Date.now());
    params.push(id);

    await this.adapter.execute(
      `UPDATE posts SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  async delete(id: string): Promise<void> {
    await this.adapter.execute('DELETE FROM posts WHERE id = ?', [id]);
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
    const results = await this.adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM posts');
    return results[0]?.count ?? 0;
  }

  private toDomainPost(row: PostRow): Post {
    return {
      id: row.id,
      bits: typeof row.bits === 'string' ? JSON.parse(row.bits) : row.bits,
      links: typeof row.links === 'string' ? JSON.parse(row.links) : row.links,
      createdAt: new Date(row.created_at),
      modifiedAt: row.modified_at ? new Date(row.modified_at) : undefined
    };
  }
}
