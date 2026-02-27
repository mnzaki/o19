/**
 * Post service - Extension of generated service
 * Domain service for managing posts with accumulation logic
 *
 * This extends the generated PostService from spire/ to add:
 * - commitAccumulation(): Critical business logic for committing drafts
 * - Data object adapters for create/update (generated takes positional params)
 * - searchByKeyword(): Client-side search in bits content
 * - count(): Total post count
 */

import { PostService as GeneratedPostService } from '../../spire/src/services/index.js';
import type { PostPort } from '../../spire/src/ports/index.js';
import type { Post, CreatePost, UpdatePost } from '../domain/entities/post.js';
import type { AccumulatingPost } from '../domain/values/content.js';
import { createEmptyAccumulation } from '../domain/values/content.js';

export { createEmptyAccumulation };

export class PostService extends GeneratedPostService {
  constructor(adaptor: PostPort) {
    super(adaptor, adaptor);
  }

  /**
   * Commit an accumulation to a real post
   * CRITICAL: This is core business logic - must be preserved!
   */
  async commitAccumulation(accumulation: AccumulatingPost): Promise<Post> {
    const postId = await this.create({
      bits: accumulation.bits
    });

    const post = await this.getById(postId);

    // TODO: Store draft links when link system is implemented
    return post;
  }

  /**
   * Search posts by keyword (partial match in text bits)
   * Client-side search since generated filter doesn't support content search
   */
  async searchByKeyword(keyword: string): Promise<Post[]> {
    const all = await this.list({ limit: 1000, offset: 0 });
    const lowerKeyword = keyword.toLowerCase();
    return all.filter((post) =>
      post.bits.some(
        (bit) => bit.type === 'text' && bit.content?.toLowerCase().includes(lowerKeyword)
      )
    );
  }

  /**
   * Get total post count
   */
  async count(): Promise<number> {
    const all = await this.list({ limit: 10000, offset: 0 }); // LOLLLLLLLLL TODO FIXME
    return all.length;
  }

  /**
   * Legacy query method - delegates to generated list()
   * @deprecated Use list() with filter instead
   */
  async query(): Promise<Post[]> {
    return this.list({ limit: 100, offset: 0 });
  }
}
