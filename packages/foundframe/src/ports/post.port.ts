/**
 * Post port - repository interface for Post entity
 */

import { BasePort, type BaseCrudPort } from './base.port.js';
import type { Post, CreatePost, UpdatePost, PostFilters } from '../domain/entities/post.js';

export interface PostPort extends BaseCrudPort<Post, CreatePost, UpdatePost> {
  /** Query with filters */
  query(filters?: PostFilters): Promise<Post[]>;
  
  /** Search by keyword in content */
  searchByKeyword(keyword: string): Promise<Post[]>;
  
  /** Get total count */
  count(): Promise<number>;
}

export abstract class PostAdaptor extends BasePort implements PostPort {
  create(_data: CreatePost): Promise<Post> {
    this.throwNotImplemented('PostAdaptor.create');
  }
  
  getById(_id: number): Promise<Post | null> {
    this.throwNotImplemented('PostAdaptor.getById');
  }
  
  update(_id: number, _data: UpdatePost): Promise<void> {
    this.throwNotImplemented('PostAdaptor.update');
  }
  
  delete(_id: number): Promise<void> {
    this.throwNotImplemented('PostAdaptor.delete');
  }
  
  query(_filters?: PostFilters): Promise<Post[]> {
    this.throwNotImplemented('PostAdaptor.query');
  }
  
  searchByKeyword(_keyword: string): Promise<Post[]> {
    this.throwNotImplemented('PostAdaptor.searchByKeyword');
  }
  
  count(): Promise<number> {
    this.throwNotImplemented('PostAdaptor.count');
  }
}
