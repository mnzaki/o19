/**
 * Post service
 * Domain service for managing posts
 */

import { PostAdaptor, type PostPort } from '../ports/post.port.js';
import type { Post, CreatePost, UpdatePost, PostFilters } from '../domain/entities/post.js';
import type { AccumulatingPost } from '../domain/values/content.js';
import { createEmptyAccumulation } from '../domain/values/content.js';

export { createEmptyAccumulation };

export class PostService extends PostAdaptor implements PostPort {
  constructor(private adaptor: PostPort) {
    super();
  }

  /** Commit an accumulation to a real post */
  async commitAccumulation(accumulation: AccumulatingPost): Promise<Post> {
    const post = await this.create({
      bits: accumulation.bits,
      links: [],
    });
    
    // TODO: Store draft links when link system is implemented
    return post;
  }

  create(data: CreatePost): Promise<Post> {
    return this.adaptor.create(data);
  }

  getById(id: number): Promise<Post | null> {
    return this.adaptor.getById(id);
  }

  update(id: number, data: UpdatePost): Promise<void> {
    return this.adaptor.update(id, data);
  }

  delete(id: number): Promise<void> {
    return this.adaptor.delete(id);
  }

  query(filters?: PostFilters): Promise<Post[]> {
    return this.adaptor.query(filters);
  }

  searchByKeyword(keyword: string): Promise<Post[]> {
    return this.adaptor.searchByKeyword(keyword);
  }

  count(): Promise<number> {
    return this.adaptor.count();
  }
}
